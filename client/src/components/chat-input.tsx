import { useState, useRef, useEffect } from "react";
import { Plus, Mic, Send, Settings, Image, Paperclip, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload, type FileAttachment } from "./file-upload";

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: FileAttachment[]) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showTools, setShowTools] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || selectedFiles.length > 0) && !isLoading) {
      onSendMessage(message.trim() || "Phân tích file này", selectedFiles.length > 0 ? selectedFiles : undefined);
      setMessage("");
      setSelectedFiles([]);
      setShowTools(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [message]);

  const handleFilesSelected = (files: FileAttachment[]) => {
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const tools = [
    { icon: Image, label: "Hình ảnh", action: () => console.log("Image upload") },
    { icon: Paperclip, label: "Tệp tin", action: () => console.log("File upload") },
    { icon: FileText, label: "Mẫu có sẵn", action: () => console.log("Templates") },
    { icon: BarChart3, label: "Phân tích", action: () => console.log("Analysis") },
  ];

  return (
    <footer className="border-t border-border-light bg-white px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTools(!showTools)}
              className="flex-shrink-0 p-3 text-text-secondary hover:text-text-primary hover:bg-bg-light rounded-xl transition-colors"
            >
              <Plus className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi bất kỳ điều gì"
                className="w-full px-4 py-3 pr-16 bg-bg-light border border-border-light rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-text-secondary text-text-primary min-h-[52px] max-h-[120px]"
                disabled={isLoading}
              />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-shrink-0 p-3 text-text-secondary hover:text-text-primary hover:bg-bg-light rounded-xl transition-colors"
            >
              <Mic className="h-5 w-5" />
            </Button>
            
            <Button
              type="submit"
              disabled={(!message.trim() && selectedFiles.length === 0) || isLoading}
              className="flex-shrink-0 p-3 bg-primary text-white hover:bg-primary-light rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
        
        {showTools && (
          <div className="mt-3 p-4 bg-bg-light rounded-xl">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {tools.map((tool, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  onClick={tool.action}
                  className="flex items-center space-x-2 p-3 hover:bg-white rounded-lg transition-colors h-auto"
                >
                  <tool.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm text-text-primary">{tool.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-2 text-center">
          <p className="text-xs text-text-secondary">
            Nhấn Enter để gửi, Shift+Enter để xuống dòng
          </p>
        </div>
      </div>
    </footer>
  );
}
