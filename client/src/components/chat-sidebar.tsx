import { useEffect } from "react";
import { X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Chat } from "@shared/schema";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  currentChatId?: string;
  user?: { id: string; email: string; credits: number; role: string } | null;
}

export function ChatSidebar({ isOpen, onClose, onSelectChat, currentChatId, user }: ChatSidebarProps) {
  const { data: chats = [], isLoading } = useQuery<Chat[]>({
    queryKey: ["/api/chats", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/chats?userId=${user?.id}`);
      return response.json();
    },
    enabled: isOpen && !!user?.id,
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const formatTime = (timestamp: Date | null) => {
    if (!timestamp) return "";
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Vừa xong";
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return time.toLocaleDateString("vi-VN");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-80 bg-white border-r border-border-light z-50 transform transition-transform">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Lịch sử trò chuyện</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-bg-light rounded-lg"
            >
              <X className="h-5 w-5 text-text-secondary" />
            </Button>
          </div>
          
          <div className="space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 bg-bg-light rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary">Chưa có cuộc trò chuyện nào</p>
              </div>
            ) : (
              chats.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  onClick={() => {
                    onSelectChat(chat.id);
                    onClose();
                  }}
                  className={`w-full text-left p-3 hover:bg-bg-light rounded-lg transition-colors h-auto ${
                    currentChatId === chat.id ? 'bg-bg-light' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="h-4 w-4 text-text-secondary mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {chat.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {formatTime(chat.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
