import { GoogleGenerativeAI } from "@google/generative-ai";
import { getBestGeminiAPI, handleGeminiAPIFailure } from "./gemini-manager";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

interface DeepSearchResponse {
  results: SearchResult[];
  summary: string;
  sources: string[];
}

// Initialize Gemini AI
// Use multi-API Gemini manager - imports added below

/**
 * Detect if a query needs real-time search
 */
export function needsDeepSearch(query: string): boolean {
  const searchKeywords = [
    // Time-sensitive keywords
    'hôm nay', 'hiện tại', 'mới nhất', 'gần đây', 'vừa xảy ra', 'tin tức',
    'today', 'current', 'latest', 'recent', 'news', 'now', 'updates',
    
    // Information keywords
    'giá', 'thời tiết', 'tỷ giá', 'chứng khoán', 'thể thao', 'kết quả',
    'price', 'weather', 'stock', 'sports', 'results', 'score',
    
    // Research keywords
    'nghiên cứu mới', 'khám phá', 'phát minh', 'công nghệ mới',
    'research', 'discovery', 'invention', 'new technology', 'breakthrough',
    
    // Event keywords
    'sự kiện', 'hội nghị', 'lễ hội', 'triển lãm', 'cuộc thi',
    'event', 'conference', 'festival', 'exhibition', 'competition',
    
    // Company/brand specific
    'công ty', 'doanh nghiệp', 'sản phẩm mới', 'ra mắt',
    'company', 'business', 'new product', 'launch', 'release'
  ];

  const lowerQuery = query.toLowerCase();
  return searchKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Search the web using Perplexity API with fallback to Google Custom Search
 */
async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    // Try Perplexity API first
    if (process.env.PERPLEXITY_API_KEY) {
      return await searchWithPerplexity(query);
    }
    
    // Fallback to Google Custom Search
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      return await searchWithGoogle(query);
    }
    
    // Fallback to DuckDuckGo API
    return await searchWithDuckDuckGo(query);
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

/**
 * Search using Perplexity API
 */
async function searchWithPerplexity(query: string): Promise<SearchResult[]> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful search assistant. Provide accurate, up-to-date information with sources.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 1000,
      temperature: 0.2,
      top_p: 0.9,
      return_citations: true,
      search_recency_filter: 'month',
      stream: false
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';
  const citations = data.citations || [];

  return citations.map((url: string, index: number) => ({
    title: `Search Result ${index + 1}`,
    url,
    snippet: content.substring(index * 100, (index + 1) * 100) + '...',
    content: content
  }));
}

/**
 * Search using Google Custom Search API
 */
async function searchWithGoogle(query: string): Promise<SearchResult[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Search API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items?.map((item: any) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet
  })) || [];
}

/**
 * Search using DuckDuckGo API (fallback)
 */
async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const results = data.RelatedTopics || [];
    
    return results.slice(0, 5).map((item: any) => ({
      title: item.Text?.split(' - ')[0] || 'Search Result',
      url: item.FirstURL || '#',
      snippet: item.Text || 'No description available'
    }));
  } catch (error) {
    console.error('DuckDuckGo search failed:', error);
    return [];
  }
}

/**
 * Extract content from web pages
 */
async function extractContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DeepSearch/1.0)'
      }
    });
    
    if (!response.ok) {
      return '';
    }

    const html = await response.text();
    
    // Simple content extraction (remove HTML tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Return first 2000 characters
    return textContent.substring(0, 2000);
  } catch (error) {
    console.error(`Failed to extract content from ${url}:`, error);
    return '';
  }
}

/**
 * Generate AI summary from search results
 */
async function generateSummary(query: string, results: SearchResult[]): Promise<string> {
  try {
    // Get best available API for deep search
    const apiInfo = getBestGeminiAPI('deepSearch');
    if (!apiInfo) {
      throw new Error('No Gemini API available for deep search');
    }

    const { config: apiConfig, clients } = apiInfo;
    const model = clients.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log(`🔍 Using Gemini API: ${apiConfig.name} for deep search summary`);
    
    const searchContext = results.map(result => 
      `**${result.title}**\nURL: ${result.url}\nContent: ${result.snippet || result.content}`
    ).join('\n\n');

    const prompt = `
Based on the following search results, provide a comprehensive and accurate answer to the user's question: "${query}"

Search Results:
${searchContext}

Instructions:
- Provide a clear, informative answer in Vietnamese
- Use specific information from the search results
- Include relevant details and context
- Cite sources when mentioning specific facts
- If information is conflicting, mention multiple perspectives
- Keep the response well-structured and easy to read

Answer:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Failed to generate AI summary:', error);
    
    // Handle API failure and try backup
    const apiInfo = getBestGeminiAPI('deepSearch');
    if (apiInfo) {
      handleGeminiAPIFailure(apiInfo.config.id, error);
      
      // Try backup API
      const backupApiInfo = getBestGeminiAPI('deepSearch');
      if (backupApiInfo && backupApiInfo.config.id !== apiInfo.config.id) {
        try {
          const backupModel = backupApiInfo.clients.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const fallbackPrompt = `Please provide a comprehensive answer in Vietnamese for the query: "${query}"`;
          const result = await backupModel.generateContent(fallbackPrompt);
          const response = await result.response;
          return response.text();
        } catch (backupError) {
          console.error('Backup API also failed for deep search:', backupError);
          handleGeminiAPIFailure(backupApiInfo.config.id, backupError);
        }
      }
    }
    
    return 'Không thể tạo tóm tắt từ kết quả tìm kiếm.';
  }
}

/**
 * Main DeepSearch function
 */
export async function performDeepSearch(query: string): Promise<DeepSearchResponse> {
  try {
    console.log(`🔍 Performing deep search for: ${query}`);
    
    // Search the web
    const searchResults = await searchWeb(query);
    
    if (searchResults.length === 0) {
      return {
        results: [],
        summary: 'Không tìm thấy thông tin liên quan. Vui lòng thử với từ khóa khác.',
        sources: []
      };
    }

    // Extract content from top results
    const enhancedResults = await Promise.all(
      searchResults.slice(0, 3).map(async (result) => {
        if (!result.content) {
          result.content = await extractContent(result.url);
        }
        return result;
      })
    );

    // Generate AI summary
    const summary = await generateSummary(query, enhancedResults);
    
    const sources = enhancedResults.map(result => result.url).filter(url => url !== '#');

    console.log(`✅ Deep search completed. Found ${enhancedResults.length} results`);

    return {
      results: enhancedResults,
      summary,
      sources
    };
  } catch (error) {
    console.error('DeepSearch error:', error);
    return {
      results: [],
      summary: 'Đã xảy ra lỗi khi tìm kiếm thông tin. Vui lòng thử lại sau.',
      sources: []
    };
  }
}

/**
 * Format DeepSearch response for display
 */
export function formatDeepSearchResponse(searchResponse: DeepSearchResponse, originalQuery: string): string {
  if (searchResponse.results.length === 0) {
    return searchResponse.summary;
  }

  const sourcesText = searchResponse.sources.length > 0 
    ? `\n\n**Nguồn tham khảo:**\n${searchResponse.sources.map((source, index) => `${index + 1}. ${source}`).join('\n')}`
    : '';

  return `${searchResponse.summary}${sourcesText}`;
}