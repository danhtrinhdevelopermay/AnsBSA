import { Menu, Plus, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  role: string;
}

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  user?: User | null;
}

export function ChatHeader({ onToggleSidebar, onNewChat, user }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-white">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onToggleSidebar}
        className="p-2 hover:bg-bg-light rounded-lg transition-colors"
      >
        <Menu className="h-5 w-5 text-text-secondary" />
      </Button>
      
      <div className="flex items-center space-x-4">
        {user && (
          <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-full border border-blue-200">
            <Coins className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              {user.credits.toLocaleString()} credits
            </span>
          </div>
        )}
        
        <div className="flex items-center space-x-2 bg-bg-light px-4 py-2 rounded-full">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <span className="text-sm font-medium text-text-primary">Vietnamese AI Chat</span>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onNewChat}
        className="p-2 hover:bg-bg-light rounded-lg transition-colors"
      >
        <Plus className="h-5 w-5 text-text-secondary" />
      </Button>
    </header>
  );
}
