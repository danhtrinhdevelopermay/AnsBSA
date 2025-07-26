import { Mail, Lightbulb, Calendar, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onSendSuggestion: (message: string) => void;
}

export function WelcomeScreen({ onSendSuggestion }: WelcomeScreenProps) {
  const suggestions = [
    {
      icon: Mail,
      text: "Viết một email chuyên nghiệp",
      message: "Viết một email chuyên nghiệp"
    },
    {
      icon: Lightbulb,
      text: "Giải thích khái niệm phức tạp",
      message: "Giải thích khái niệm phức tạp"
    },
    {
      icon: Calendar,
      text: "Tạo kế hoạch học tập",
      message: "Tạo kế hoạch học tập"
    },
    {
      icon: FileText,
      text: "Phân tích và tóm tắt văn bản",
      message: "Phân tích và tóm tắt văn bản"
    },
    {
      icon: Calendar,
      text: "Xây dựng trang web đơn giản",
      message: "Xây dựng trang web đơn giản"
    },
    {
      icon: Globe,
      text: "Phân tích website này: https://vnexpress.net",
      message: "Phân tích website này: https://vnexpress.net"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-4 leading-tight">
          Tôi có thể giúp gì cho bạn?
        </h1>
        <p className="text-text-secondary text-lg">
          Hãy bắt đầu cuộc trò chuyện bằng cách đặt câu hỏi hoặc gửi URL website để phân tích.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="ghost"
            onClick={() => onSendSuggestion(suggestion.message)}
            className="p-4 bg-bg-light hover:bg-gray-100 rounded-xl text-left transition-colors group h-auto"
          >
            <div className="flex items-start space-x-3">
              <suggestion.icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <span className="text-sm text-text-primary group-hover:text-text-primary text-left">
                {suggestion.text}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
