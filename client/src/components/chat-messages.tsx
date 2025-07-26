import { useEffect, useRef } from "react";
import { Bot, Check, CheckCheck, Copy, ThumbsUp, Image, FileText, Video, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "./markdown-renderer";
import { TypewriterText } from "./typewriter-text";
import { DeepSearchIndicator } from "./deep-search-indicator";
import type { Message } from "@shared/schema";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  typingMessageId?: string | null;
  isDeepSearching?: boolean;
  deepSearchQuery?: string;
}

export function ChatMessages({ messages, isLoading, typingMessageId, isDeepSearching, deepSearchQuery }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Đã sao chép",
        description: "Tin nhắn đã được sao chép vào clipboard",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể sao chép tin nhắn",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: Date | null) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return Image;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      default:
        return FileText;
    }
  };

  const renderAttachments = (attachments: any[] | null) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment, index) => {
          const FileIcon = getFileIcon(attachment.type);
          
          if (attachment.type === 'image') {
            return (
              <div key={index} className="relative">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-w-full w-auto h-auto rounded-lg border border-border-light"
                />
                <div className="mt-1 text-xs text-text-secondary">
                  {attachment.name}
                </div>
              </div>
            );
          }
          
          if (attachment.type === 'video') {
            return (
              <div key={index} className="relative">
                <video
                  src={attachment.url}
                  controls
                  className="max-w-full w-auto h-auto rounded-lg border border-border-light"
                >
                  Your browser does not support the video tag.
                </video>
                <div className="mt-1 text-xs text-text-secondary">
                  {attachment.name}
                </div>
              </div>
            );
          }
          
          return (
            <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-border-light max-w-full">
              <FileIcon className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm text-text-primary truncate min-w-0">{attachment.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 scrollbar-thin">
      <DeepSearchIndicator 
        isSearching={isDeepSearching || false} 
        searchQuery={deepSearchQuery} 
      />
      
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%]">
            {message.role === "user" ? (
              <>
                <div className="bg-primary text-white px-4 py-3 rounded-2xl rounded-br-md break-words overflow-hidden">
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {renderAttachments(message.attachments)}
                </div>
                <div className="flex items-center justify-end mt-1 space-x-2">
                  <span className="text-xs text-text-secondary">
                    {formatTime(message.timestamp)}
                  </span>
                  <CheckCheck className="w-3 h-3 text-primary" />
                </div>
              </>
            ) : (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-bg-light px-4 py-3 rounded-2xl rounded-bl-md overflow-hidden">
                    <TypewriterText 
                      text={message.content}
                      isNewMessage={typingMessageId === message.id}
                      speed={15}
                      onComplete={() => {
                        if (typingMessageId === message.id) {
                          // Typing completed for this message
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center mt-2 space-x-3">
                    <span className="text-xs text-text-secondary">
                      {formatTime(message.timestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyMessage(message.content)}
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors h-auto p-1"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Sao chép
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors h-auto p-1"
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Thích
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}



      <div ref={messagesEndRef} />
    </div>
  );
}
