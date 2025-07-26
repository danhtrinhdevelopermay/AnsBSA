import { useState, useEffect } from "react";
import { MarkdownRenderer } from "./markdown-renderer";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  isNewMessage?: boolean;
}

export function TypewriterText({ 
  text, 
  speed = 30, 
  onComplete, 
  isNewMessage = false 
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(isNewMessage);

  useEffect(() => {
    // If it's not a new message, show full text immediately
    if (!isNewMessage) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // Reset for new messages only if text is not empty
    if (text) {
      setDisplayedText("");
      setCurrentIndex(0);
      setIsTyping(true);
    }
  }, [text, isNewMessage]);

  useEffect(() => {
    if (!isTyping || currentIndex >= text.length) {
      if (currentIndex >= text.length && isTyping) {
        setIsTyping(false);
        onComplete?.();
        
        // Check for auto-redirect to Web Builder
        if (text.includes('AUTO_REDIRECT:WEB_BUILDER')) {
          setTimeout(() => {
            console.log('🚀 Auto-redirecting to Web Builder...');
            window.location.href = '/web-builder';
          }, 2000);
        }
      }
      return;
    }

    const timer = setTimeout(() => {
      // Find the next safe position to cut the text
      // This ensures we don't cut in the middle of markdown syntax
      let nextIndex = currentIndex + 1;
      
      // Skip ahead if we're in the middle of a markdown link or image
      if (text[currentIndex] === '[' || text[currentIndex] === '!' && text[currentIndex + 1] === '[') {
        const closingBracket = text.indexOf(']', currentIndex);
        const openingParen = text.indexOf('(', closingBracket);
        const closingParen = text.indexOf(')', openingParen);
        
        if (closingBracket !== -1 && openingParen !== -1 && closingParen !== -1) {
          nextIndex = closingParen + 1;
        }
      }
      
      // Skip ahead if we're in the middle of a code block
      if (text.substring(currentIndex, currentIndex + 3) === '```') {
        const nextCodeBlock = text.indexOf('```', currentIndex + 3);
        if (nextCodeBlock !== -1) {
          nextIndex = nextCodeBlock + 3;
        }
      }

      // For normal characters, proceed one by one
      if (nextIndex === currentIndex + 1) {
        // Faster typing for whitespace and punctuation
        if (text[currentIndex] === ' ' || 
            text[currentIndex] === '\n' || 
            text[currentIndex] === ',' || 
            text[currentIndex] === '.') {
          // Use faster speed for these characters
        }
      }

      setDisplayedText(text.substring(0, nextIndex));
      setCurrentIndex(nextIndex);
    }, text[currentIndex] === ' ' || text[currentIndex] === '\n' || text[currentIndex] === ',' || text[currentIndex] === '.' ? speed * 0.1 : speed);

    return () => clearTimeout(timer);
  }, [currentIndex, text, speed, isTyping]);

  return (
    <div className="relative">
      {text === "" && isNewMessage ? (
        <div className="flex items-center">
          <span className="text-text-secondary">AI đang suy nghĩ</span>
          <span className="animate-pulse inline-block w-2 h-4 bg-primary ml-2 rounded-sm" />
        </div>
      ) : (
        <>
          <MarkdownRenderer content={displayedText} />
          {isTyping && (
            <span className="animate-pulse inline-block w-2 h-4 bg-primary ml-1 rounded-sm opacity-75" />
          )}
        </>
      )}
    </div>
  );
}