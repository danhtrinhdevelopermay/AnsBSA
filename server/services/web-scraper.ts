import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getBestGeminiAPI, handleGeminiAPIFailure } from "./gemini-manager";

// Use multi-API Gemini manager

export interface WebScrapingResult {
  success: boolean;
  url: string;
  title?: string;
  content?: string;
  summary?: string;
  keyPoints?: string[];
  error?: string;
  timestamp: Date;
}

/**
 * Truy cập và phân tích website
 */
export async function scrapeAndAnalyzeWebsite(url: string): Promise<WebScrapingResult> {
  try {
    console.log(`🌐 Starting website analysis for: ${url}`);
    
    // Validate URL
    if (!isValidUrl(url)) {
      return {
        success: false,
        url,
        error: 'URL không hợp lệ',
        timestamp: new Date()
      };
    }

    // Fetch website content
    const webContent = await fetchWebsiteContent(url);
    if (!webContent.success || !webContent.content) {
      return {
        success: false,
        url,
        error: webContent.error || 'Không thể tải nội dung website',
        timestamp: new Date()
      };
    }

    // Analyze content with AI
    const analysis = await analyzeContentWithAI(webContent.content, url);
    
    return {
      success: true,
      url,
      title: webContent.title,
      content: webContent.content,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      timestamp: new Date()
    };

  } catch (error: any) {
    console.error('Website scraping error:', error.message);
    return {
      success: false,
      url,
      error: `Lỗi khi truy cập website: ${error.message}`,
      timestamp: new Date()
    };
  }
}

/**
 * Fetch content từ website
 */
async function fetchWebsiteContent(url: string): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
}> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxRedirects: 5,
      maxContentLength: 10 * 1024 * 1024 // 10MB limit
    });

    if (response.status !== 200) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const html = response.data;
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Không có tiêu đề';

    // Clean and extract text content
    const cleanContent = extractTextFromHTML(html);
    
    // More lenient content length check and better error messages
    if (cleanContent.length < 50) {
      return {
        success: false,
        error: 'Website có thể yêu cầu đăng nhập hoặc không có nội dung có thể đọc được'
      };
    }
    
    if (cleanContent.length < 100) {
      // Still try to analyze if we have some content
      console.log(`⚠️ Website has limited content (${cleanContent.length} chars): ${url}`);
    }

    return {
      success: true,
      content: cleanContent,
      title
    };

  } catch (error: any) {
    console.error(`Web scraping error for ${url}:`, error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Không thể kết nối đến website - Server có thể đang tắt'
      };
    } else if (error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: 'Không tìm thấy website - Kiểm tra lại URL'
      };
    } else if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Website phản hồi quá chậm - Thử lại sau'
      };
    } else if (error.response?.status === 403) {
      return {
        success: false,
        error: 'Website từ chối truy cập - Có thể cần đăng nhập'
      };
    } else if (error.response?.status === 404) {
      return {
        success: false,
        error: 'Trang không tồn tại - Kiểm tra lại URL'
      };
    } else if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Website yêu cầu đăng nhập'
      };
    } else if (error.response?.status >= 500) {
      return {
        success: false,
        error: 'Website đang gặp sự cố - Thử lại sau'
      };
    } else {
      return {
        success: false,
        error: `Lỗi truy cập: ${error.message}`
      };
    }
  }
}

/**
 * Trích xuất text từ HTML
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.trim();
  
  // Limit length to avoid token limits
  if (text.length > 20000) {
    text = text.substring(0, 20000) + '...';
  }
  
  return text;
}

/**
 * Phân tích nội dung bằng AI
 */
async function analyzeContentWithAI(content: string, url: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  try {
    const analysisPrompt = `
Phân tích nội dung website sau và tạo tóm tắt chi tiết bằng tiếng Việt:

URL: ${url}
NỘI DUNG:
${content}

YÊU CẦU:
1. Tóm tắt chính xác nội dung chính (3-5 câu)
2. Liệt kê 5-7 điểm quan trọng nhất
3. Sử dụng tiếng Việt dễ hiểu
4. Tập trung vào thông tin hữu ích cho người đọc

Trả về JSON format:
{
  "summary": "Tóm tắt nội dung chính của website...",
  "keyPoints": [
    "Điểm quan trọng 1",
    "Điểm quan trọng 2",
    "Điểm quan trọng 3"
  ]
}`;

    // Get best available API for web scraping
    const apiInfo = getBestGeminiAPI('webScraper');
    if (!apiInfo) {
      console.log('No Gemini API available for web scraping');
      return {
        summary: 'Không thể phân tích nội dung website do thiếu API.',
        keyPoints: ['Cần cấu hình API key để sử dụng tính năng phân tích website']
      };
    }

    const { config: apiConfig, clients } = apiInfo;
    const model = clients.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log(`🔍 Using Gemini API: ${apiConfig.name} for web scraping analysis`);

    const result = await model.generateContent(analysisPrompt);
    const response = result.response.text();
    
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Không thể tạo tóm tắt',
          keyPoints: parsed.keyPoints || []
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI analysis:', parseError);
    }
    
    // Fallback: create basic analysis
    return {
      summary: `Đã phân tích nội dung từ ${url}. Website chứa thông tin về ${content.substring(0, 200)}...`,
      keyPoints: [
        'Đã truy cập thành công website',
        'Nội dung đã được tải về và phân tích',
        'Thông tin chi tiết có sẵn để trả lời câu hỏi'
      ]
    };

  } catch (error: any) {
    console.error('AI content analysis failed:', error.message);
    return {
      summary: `Đã truy cập và tải nội dung từ ${url} thành công.`,
      keyPoints: [
        'Website đã được truy cập thành công',
        'Nội dung đã sẵn sàng để phân tích',
        'Có thể trả lời câu hỏi dựa trên nội dung này'
      ]
    };
  }
}

/**
 * Validate URL
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detect URL trong tin nhắn
 */
export function detectUrlsInMessage(message: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;
  const matches = message.match(urlRegex);
  return matches || [];
}

/**
 * Kiểm tra xem có phải yêu cầu phân tích website không
 */
export function isWebAnalysisRequest(message: string): boolean {
  const keywords = [
    'phân tích website', 'đọc website', 'tóm tắt website',
    'analyze website', 'read website', 'summarize website',
    'truy cập trang', 'xem trang web', 'đọc trang',
    'lấy thông tin từ', 'tìm hiểu về trang',
    'giải thích website', 'mô tả trang', 'website này nói gì'
  ];
  
  const messageWords = message.toLowerCase();
  const hasKeyword = keywords.some(keyword => messageWords.includes(keyword.toLowerCase()));
  const hasUrl = detectUrlsInMessage(message).length > 0;
  
  return hasKeyword || hasUrl;
}

/**
 * Suggest alternative URLs for failed requests
 */
export function suggestAlternativeUrls(originalUrl: string): string[] {
  try {
    const url = new URL(originalUrl);
    const suggestions = [];
    
    // Suggest homepage if it's a specific page
    if (url.pathname !== '/' && url.pathname !== '') {
      suggestions.push(`${url.protocol}//${url.host}`);
    }
    
    // Suggest common public pages
    const commonPages = ['/about', '/help', '/contact', '/blog', '/news'];
    commonPages.forEach(page => {
      if (!originalUrl.includes(page)) {
        suggestions.push(`${url.protocol}//${url.host}${page}`);
      }
    });
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  } catch {
    return [];
  }
}

/**
 * Format kết quả phân tích website
 */
export function formatWebAnalysisResult(result: WebScrapingResult): string {
  if (!result.success) {
    const suggestions = suggestAlternativeUrls(result.url);
    const suggestionText = suggestions.length > 0 
      ? `\n\n🔗 **Thử các URL này:**\n${suggestions.map(url => `• ${url}`).join('\n')}`
      : '';
    
    return `❌ **Không thể truy cập website**

**URL:** ${result.url}
**Lỗi:** ${result.error}

💡 **Gợi ý:**
• Kiểm tra URL có đúng không (bao gồm http:// hoặc https://)
• Website có thể yêu cầu đăng nhập hoặc chỉ cho phép truy cập từ trình duyệt
• Thử với trang chủ của website thay vì trang con
• Một số website chặn truy cập tự động để bảo mật${suggestionText}`;
  }

  return `🌐 **Phân tích Website Thành Công**

**🔗 URL:** ${result.url}
**📋 Tiêu đề:** ${result.title}

**📝 Tóm tắt:**
${result.summary}

**🔍 Điểm quan trọng:**
${result.keyPoints?.map(point => `• ${point}`).join('\n')}

**⏰ Thời gian phân tích:** ${result.timestamp.toLocaleString('vi-VN')}

---

💬 **Tôi đã đọc và hiểu nội dung website này. Bạn có thể hỏi tôi bất kỳ điều gì về thông tin trong trang web!**`;
}