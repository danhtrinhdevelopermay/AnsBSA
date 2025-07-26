import { Search, Globe, Clock } from "lucide-react";

interface DeepSearchIndicatorProps {
  isSearching: boolean;
  searchQuery?: string;
}

export function DeepSearchIndicator({ isSearching, searchQuery }: DeepSearchIndicatorProps) {
  if (!isSearching) return null;

  return (
    <div className="flex items-center space-x-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-ping" />
        </div>
        <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">
          DeepSearch đang hoạt động
        </span>
      </div>
      
      <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-xs">
        <Globe className="w-3 h-3" />
        <span>Tìm kiếm thông tin real-time</span>
      </div>
      
      {searchQuery && (
        <div className="flex items-center space-x-1 text-blue-500 dark:text-blue-400 text-xs">
          <Clock className="w-3 h-3" />
          <span className="truncate max-w-32">"{searchQuery}"</span>
        </div>
      )}
    </div>
  );
}