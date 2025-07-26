import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Chat, Message } from "@shared/schema";
import type { FileAttachment } from "./file-upload";

import { ChatHeader } from "./chat-header";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { WelcomeScreen } from "./welcome-screen";

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  role: string;
}

interface ChatInterfaceProps {
  user?: User | null;
}

export function ChatInterface({ user }: ChatInterfaceProps = {}) {
  // Use a query to get fresh user data including credits
  const { data: refreshedUser } = useQuery({
    queryKey: ["/api/auth/user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/auth/user?userId=${user.id}`);
      if (!response.ok) return user;
      const result = await response.json();
      return result.user;
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // Refresh every 15 seconds
    initialData: user,
  });

  // Use refreshed user data if available, otherwise fallback to initial user
  const currentUser = refreshedUser || user;
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [deepSearchQuery, setDeepSearchQuery] = useState<string>("");
  const { toast } = useToast();

  const { data: serverMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", currentChatId, "messages"],
    enabled: !!currentChatId,
  });

  // Combine server messages with optimistic messages and sort by timestamp
  const messages = [...serverMessages, ...optimisticMessages].sort((a, b) => 
    new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );

  // Debug logging
  console.log('Server messages:', serverMessages.length);
  console.log('Optimistic messages:', optimisticMessages.length);
  console.log('Total messages:', messages.length);

  const createChatMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/chats", { 
        title,
        userId: currentUser?.id 
      });
      return response.json();
    },
    onSuccess: (chat: Chat) => {
      setCurrentChatId(chat.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể tạo cuộc trò chuyện mới",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content, attachments }: { chatId: string; content: string; attachments?: FileAttachment[] }) => {
      const response = await apiRequest("POST", `/api/chats/${chatId}/messages`, {
        role: "user",
        content,
        attachments: attachments || null,
        userId: currentUser?.id,
        creditsUsed: 0,
      });
      return response.json();
    },
    onMutate: ({ content }: { chatId: string; content: string; attachments?: any[] }) => {
      // Check if this might trigger DeepSearch
      const needsSearch = /hôm nay|hiện tại|mới nhất|gần đây|tin tức|today|current|latest|recent|news|giá|thời tiết|tỷ giá/.test(content.toLowerCase());
      
      if (needsSearch) {
        setIsDeepSearching(true);
        setDeepSearchQuery(content);
      }
      
      // Add loading state immediately when starting to send
      const typingMessage: Message = {
        id: `typing-${Date.now()}`,
        role: "assistant",
        content: "",
        attachments: null,
        timestamp: new Date(),
        chatId: currentChatId!,
      };
      setOptimisticMessages(prev => [...prev, typingMessage]);
      setTypingMessageId(typingMessage.id);
    },
    onSuccess: (response) => {
      // Clear optimistic messages and refresh from server
      setOptimisticMessages([]);
      setIsDeepSearching(false);
      setDeepSearchQuery("");
      
      // Set the new AI message as typing immediately
      if (response.assistantMessage) {
        setTypingMessageId(response.assistantMessage.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/chats", currentChatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      
      // Refresh user credits after AI operation
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user", currentUser.id] });
      }
    },
    onError: (error: Error) => {
      // Remove the failed optimistic message
      setOptimisticMessages([]);
      setIsDeepSearching(false);
      setDeepSearchQuery("");
      toast({
        title: "Lỗi",
        description: error.message || "Không thể gửi tin nhắn",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (content: string, attachments?: FileAttachment[]) => {
    // Reset typing state when sending new message
    setTypingMessageId(null);
    setIsDeepSearching(false);
    setDeepSearchQuery("");
    
    if (!currentChatId) {
      // Store message and attachments, then create new chat first
      sessionStorage.setItem('pendingMessage', content);
      if (attachments) {
        sessionStorage.setItem('pendingAttachments', JSON.stringify(attachments));
      }
      await createChatMutation.mutateAsync("Cuộc trò chuyện mới");
      return;
    }

    // Add user message immediately to optimistic UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      userId: currentUser?.id || '',
      role: "user",
      content,
      chatId: currentChatId,
      attachments: attachments || null,
      creditsUsed: 0,
      timestamp: new Date(),
    };

    console.log('Adding optimistic message:', optimisticMessage);
    setOptimisticMessages([optimisticMessage]);
    sendMessageMutation.mutate({ chatId: currentChatId, content, attachments });
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setOptimisticMessages([]);
    setTypingMessageId(null);
    setIsDeepSearching(false);
    setDeepSearchQuery("");
    setSidebarOpen(false);
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setOptimisticMessages([]);
    setTypingMessageId(null);
    setIsDeepSearching(false);
    setDeepSearchQuery("");
  };

  // Auto-send message after chat creation
  useEffect(() => {
    if (currentChatId && createChatMutation.data?.id === currentChatId) {
      const pendingMessage = sessionStorage.getItem('pendingMessage');
      const pendingAttachmentsStr = sessionStorage.getItem('pendingAttachments');
      
      if (pendingMessage) {
        sessionStorage.removeItem('pendingMessage');
        sessionStorage.removeItem('pendingAttachments');
        
        const pendingAttachments = pendingAttachmentsStr ? JSON.parse(pendingAttachmentsStr) : undefined;
        
        sendMessageMutation.mutate({ 
          chatId: currentChatId, 
          content: pendingMessage,
          attachments: pendingAttachments
        });
      }
    }
  }, [currentChatId]);

  const handleSendSuggestion = async (message: string) => {
    if (!currentChatId) {
      sessionStorage.setItem('pendingMessage', message);
      await createChatMutation.mutateAsync("Cuộc trò chuyện mới");
    } else {
      // Add user message immediately to optimistic UI
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        userId: user?.id || '',
        role: "user",
        content: message,
        chatId: currentChatId,
        attachments: null,
        creditsUsed: 0,
        timestamp: new Date(),
      };

      setOptimisticMessages([optimisticMessage]);
      sendMessageMutation.mutate({ chatId: currentChatId, content: message });
    }
  };

  const isLoading = sendMessageMutation.isPending || createChatMutation.isPending;

  return (
    <div className="flex flex-col h-screen bg-white">
      <ChatHeader 
        onToggleSidebar={() => setSidebarOpen(true)}
        onNewChat={handleNewChat}
        user={currentUser}
      />
      
      <main className="flex-1 overflow-y-auto">
        {!currentChatId ? (
          <WelcomeScreen onSendSuggestion={handleSendSuggestion} />
        ) : (
          <ChatMessages 
            messages={messages} 
            isLoading={isLoading}
            typingMessageId={typingMessageId}
            isDeepSearching={isDeepSearching}
            deepSearchQuery={deepSearchQuery}
          />
        )}
      </main>
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
      
      <ChatSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectChat={handleSelectChat}
        currentChatId={currentChatId || undefined}
        user={user}
      />
    </div>
  );
}
