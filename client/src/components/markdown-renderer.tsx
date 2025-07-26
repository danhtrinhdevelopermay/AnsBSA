import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Đã sao chép",
        description: "Code đã được sao chép vào clipboard",
      });
    } catch (err) {
      toast({
        title: "Lỗi",
        description: "Không thể sao chép code",
        variant: "destructive",
      });
    }
  };

  const runCode = (code: string, language: string) => {
    // Placeholder for code execution - could integrate with a code runner service
    toast({
      title: "Chạy code",
      description: `Tính năng chạy ${language} sẽ được triển khai sau`,
    });
  };

  // Clean up content to remove extra backticks and fix formatting
  const cleanContent = content
    .replace(/```(\w+)?\n`+([^`]*)`+\n```/g, (match, lang, code) => {
      return `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``;
    })
    .replace(/```(\w+)?\n`([^`]*)```/g, (match, lang, code) => {
      return `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``;
    });

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert overflow-hidden break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            let code = String(children).replace(/\n$/, '');
            // Remove surrounding backticks if present
            code = code.replace(/^`+/, '').replace(/`+$/, '').trim();

            // Handle inline code
            if (inline) {
              return (
                <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400" {...props}>
                  {children}
                </code>
              );
            }

            if (!inline && match) {
              return (
                <div className="relative group">
                  <div className="flex items-center justify-between bg-gray-800 text-gray-200 px-4 py-2 text-sm rounded-t-lg">
                    <span className="font-medium">{language}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-gray-300 hover:text-white hover:bg-gray-700"
                        onClick={() => copyToClipboard(code)}
                      >
                        {copiedCode === code ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      {(language === 'javascript' || language === 'python' || language === 'js' || language === 'py') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-gray-300 hover:text-white hover:bg-gray-700"
                          onClick={() => runCode(code, language)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <SyntaxHighlighter
                    style={oneDark}
                    language={language}
                    PreTag="div"
                    className="!mt-0 !rounded-t-none overflow-x-auto"
                    wrapLines={true}
                    wrapLongLines={true}
                    {...props}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // Fallback for code without language
            return (
              <div className="relative group">
                <div className="flex items-center justify-between bg-gray-800 text-gray-200 px-4 py-2 text-sm rounded-t-lg">
                  <span className="font-medium">code</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-gray-300 hover:text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(code)}
                    >
                      {copiedCode === code ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language="text"
                  PreTag="div"
                  className="!mt-0 !rounded-t-none overflow-x-auto"
                  wrapLines={true}
                  wrapLongLines={true}
                  {...props}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          },
          pre({ children }: any) {
            return <>{children}</>;
          },
          h1: ({ children }: any) => (
            <h1 className="text-xl font-bold mt-6 mb-4">{children}</h1>
          ),
          h2: ({ children }: any) => (
            <h2 className="text-lg font-semibold mt-5 mb-3">{children}</h2>
          ),
          h3: ({ children }: any) => (
            <h3 className="text-md font-medium mt-4 mb-2">{children}</h3>
          ),
          ul: ({ children }: any) => (
            <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }: any) => (
            <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>
          ),
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-300 dark:border-gray-600">
                {children}
              </table>
            </div>
          ),
          th: ({ children }: any) => (
            <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }: any) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
              {children}
            </td>
          ),
          a: ({ href, children }: any) => {
            // Handle internal navigation links
            if (href?.startsWith('/web-builder')) {
              return (
                <a
                  href={href}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = href;
                  }}
                >
                  {children}
                </a>
              );
            }
            
            return (
              <a
                href={href}
                className="text-blue-600 dark:text-blue-400 hover:underline"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}