import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getBestGeminiAPI, handleGeminiAPIFailure } from "./gemini-manager";

// Use multi-API Gemini manager

export interface KnowledgeSource {
  id: string;
  url: string;
  type: 'news' | 'tech' | 'science' | 'general';
  lastUpdated: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface LearnedKnowledge {
  id: string;
  topic: string;
  content: string;
  sources: string[];
  confidence: number;
  timestamp: Date;
  category: string;
}

// Danh sách nguồn tin cậy để AI tự học
const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: 'vnexpress-tech',
    url: 'https://vnexpress.net/so-hoa.rss',
    type: 'tech',
    lastUpdated: new Date(),
    priority: 'high'
  },
  {
    id: 'techcrunch',
    url: 'https://techcrunch.com/feed/',
    type: 'tech', 
    lastUpdated: new Date(),
    priority: 'high'
  },
  {
    id: 'arxiv-cs',
    url: 'http://export.arxiv.org/rss/cs',
    type: 'science',
    lastUpdated: new Date(),
    priority: 'medium'
  },
  {
    id: 'github-trending',
    url: 'https://github.com/trending',
    type: 'tech',
    lastUpdated: new Date(),
    priority: 'high'
  }
];

// In-memory knowledge storage (có thể thay bằng database)
let knowledgeBase: LearnedKnowledge[] = [];

/**
 * Cập nhật kiến thức từ các nguồn internet
 */
export async function updateKnowledgeFromSources(): Promise<void> {
  console.log('🧠 Starting knowledge update from internet sources...');
  
  for (const source of KNOWLEDGE_SOURCES) {
    try {
      console.log(`📡 Fetching data from: ${source.id}`);
      
      // Fetch content từ nguồn
      const content = await fetchContentFromSource(source);
      
      if (content) {
        // Xử lý và trích xuất kiến thức
        const extractedKnowledge = await extractKnowledgeFromContent(content, source);
        
        // Lưu vào knowledge base
        if (extractedKnowledge.length > 0) {
          knowledgeBase.push(...extractedKnowledge);
          console.log(`✅ Added ${extractedKnowledge.length} new knowledge items from ${source.id}`);
        }
      }
      
      // Cập nhật thời gian
      source.lastUpdated = new Date();
      
    } catch (error: any) {
      console.error(`❌ Failed to update from ${source.id}:`, error.message);
    }
  }
  
  // Cleanup old knowledge (giữ lại 1000 items mới nhất)
  if (knowledgeBase.length > 1000) {
    knowledgeBase = knowledgeBase
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 1000);
  }
  
  console.log(`🧠 Knowledge base updated. Total items: ${knowledgeBase.length}`);
}

/**
 * Fetch content từ một nguồn cụ thể
 */
async function fetchContentFromSource(source: KnowledgeSource): Promise<string | null> {
  try {
    const response = await axios.get(source.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Learning-Bot/1.0)'
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch from ${source.url}:`, error.message);
    return null;
  }
}

/**
 * Trích xuất kiến thức từ content bằng AI
 */
async function extractKnowledgeFromContent(
  content: string, 
  source: KnowledgeSource
): Promise<LearnedKnowledge[]> {
  try {
    const extractionPrompt = `
Phân tích nội dung sau và trích xuất những thông tin quan trọng, mới mẻ hoặc hữu ích:

NỘI DUNG:
${content.substring(0, 8000)} // Giới hạn để tránh token limit

YÊU CẦU:
1. Trích xuất 3-5 điểm kiến thức quan trọng nhất
2. Mỗi điểm phải có topic và content rõ ràng  
3. Ưu tiên thông tin về: công nghệ, AI, lập trình, khoa học
4. Trả về JSON format như sau:

{
  "knowledge": [
    {
      "topic": "Tên chủ đề ngắn gọn",
      "content": "Mô tả chi tiết kiến thức", 
      "category": "tech/science/general",
      "confidence": 0.8
    }
  ]
}`;

    // Get best available API for learning
    const apiInfo = getBestGeminiAPI('learning');
    if (!apiInfo) {
      console.log('No Gemini API available for learning');
      return [];
    }

    const { config: apiConfig, clients } = apiInfo;
    const model = clients.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log(`🧠 Using Gemini API: ${apiConfig.name} for knowledge extraction`);

    const result = await model.generateContent(extractionPrompt);
    const response = result.response.text();
    
    try {
      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return parsed.knowledge.map((item: any) => ({
        id: `${source.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        topic: item.topic,
        content: item.content,
        sources: [source.url],
        confidence: item.confidence || 0.7,
        timestamp: new Date(),
        category: item.category || source.type
      }));
      
    } catch (parseError) {
      console.error('Failed to parse knowledge extraction:', parseError);
      return [];
    }
    
  } catch (error: any) {
    console.error('Knowledge extraction failed:', error.message);
    
    // Handle API failure for learning service
    const apiInfo = getBestGeminiAPI('learning');
    if (apiInfo) {
      handleGeminiAPIFailure(apiInfo.config.id, error);
    }
    
    return [];
  }
}

/**
 * Tìm kiếm kiến thức liên quan đến query
 */
export function searchKnowledge(query: string): LearnedKnowledge[] {
  const queryLower = query.toLowerCase();
  
  return knowledgeBase
    .filter(knowledge => 
      knowledge.topic.toLowerCase().includes(queryLower) ||
      knowledge.content.toLowerCase().includes(queryLower) ||
      knowledge.category.toLowerCase().includes(queryLower)
    )
    .sort((a, b) => {
      // Sắp xếp theo confidence và thời gian
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    })
    .slice(0, 5); // Lấy top 5 kết quả
}

/**
 * Lấy thống kê knowledge base
 */
export function getKnowledgeStats() {
  const categories = knowledgeBase.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const avgConfidence = knowledgeBase.length > 0 
    ? knowledgeBase.reduce((sum, item) => sum + item.confidence, 0) / knowledgeBase.length
    : 0;
    
  return {
    totalItems: knowledgeBase.length,
    categories,
    averageConfidence: avgConfidence,
    lastUpdate: knowledgeBase.length > 0 
      ? Math.max(...knowledgeBase.map(item => item.timestamp.getTime()))
      : null
  };
}

/**
 * Khởi động tự động cập nhật kiến thức
 */
export function startAutoLearning() {
  console.log('🧠 Starting auto-learning system...');
  
  // Cập nhật ngay lập tức
  updateKnowledgeFromSources();
  
  // Cập nhật mỗi 2 giờ
  setInterval(() => {
    updateKnowledgeFromSources();
  }, 2 * 60 * 60 * 1000);
  
  console.log('✅ Auto-learning system started. Updates every 2 hours.');
}

/**
 * Tích hợp kiến thức vào phản hồi AI
 */
export function enhanceResponseWithKnowledge(userQuery: string, baseResponse: string): string {
  const relevantKnowledge = searchKnowledge(userQuery);
  
  if (relevantKnowledge.length === 0) {
    return baseResponse;
  }
  
  const knowledgeSection = relevantKnowledge
    .map(item => `📚 **${item.topic}**: ${item.content}`)
    .join('\n\n');
    
  return `${baseResponse}

---

### 🧠 Kiến thức cập nhật từ internet:

${knowledgeSection}

*📡 Thông tin được cập nhật tự động từ các nguồn tin cậy*`;
}