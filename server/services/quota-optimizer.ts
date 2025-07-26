/**
 * Quota Optimization Service
 * Helps reduce API quota consumption through intelligent caching and optimization
 */

interface CachedResponse {
  content: string;
  timestamp: Date;
  expiryTime: Date;
  queryHash: string;
}

// Simple in-memory cache for responses
const responseCache = new Map<string, CachedResponse>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 phút

/**
 * Generate hash cho query để làm cache key
 */
function generateQueryHash(query: string): string {
  // Normalize query để tăng cache hit rate
  const normalized = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Kiểm tra có câu trả lời cached không
 */
export function getCachedResponse(query: string, type: 'chat' | 'learning' | 'webScraper' | 'deepSearch'): string | null {
  const queryHash = generateQueryHash(query);
  const cacheKey = `${type}_${queryHash}`;
  const cached = responseCache.get(cacheKey);
  
  if (cached && cached.expiryTime > new Date()) {
    console.log(`💾 Using cached response for ${type}: ${query.substring(0, 50)}...`);
    return cached.content;
  }
  
  // Xóa cache hết hạn
  if (cached) {
    responseCache.delete(cacheKey);
  }
  
  return null;
}

/**
 * Lưu response vào cache
 */
export function setCachedResponse(query: string, response: string, type: 'chat' | 'learning' | 'webScraper' | 'deepSearch'): void {
  const queryHash = generateQueryHash(query);
  const cacheKey = `${type}_${queryHash}`;
  const now = new Date();
  
  responseCache.set(cacheKey, {
    content: response,
    timestamp: now,
    expiryTime: new Date(now.getTime() + CACHE_DURATION),
    queryHash
  });
  
  // Cleanup old cache entries (keep max 100 entries)
  if (responseCache.size > 100) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) {
      responseCache.delete(oldestKey);
    }
  }
}

/**
 * Kiểm tra xem có nên skip tạo ảnh/video không
 */
export function shouldSkipExpensiveOperation(type: 'image' | 'video', dailyUsage: { images: number; videos: number }): { skip: boolean; reason?: string } {
  const limits = {
    image: 15, // Giới hạn 15 ảnh/ngày
    video: 5   // Giới hạn 5 video/ngày
  };
  
  if (type === 'image' && dailyUsage.images >= limits.image) {
    return {
      skip: true,
      reason: `⚠️ Đã đạt giới hạn ${limits.image} ảnh/ngày. Để tiết kiệm quota, hãy thử mô tả bằng văn bản.`
    };
  }
  
  if (type === 'video' && dailyUsage.videos >= limits.video) {
    return {
      skip: true,
      reason: `⚠️ Đã đạt giới hạn ${limits.video} video/ngày. Để tiết kiệm quota, hãy thử mô tả bằng văn bản hoặc tạo ảnh thay thế.`
    };
  }
  
  return { skip: false };
}

/**
 * Tối ưu hóa prompt để giảm token usage
 */
export function optimizePrompt(prompt: string): string {
  // Loại bỏ từ thừa và tối ưu hóa
  return prompt
    .replace(/\s+/g, ' ') // Nhiều space thành 1
    .replace(/\n+/g, '\n') // Nhiều newline thành 1
    .trim()
    .substring(0, 8000); // Giới hạn độ dài prompt
}

/**
 * Đề xuất alternatives để tiết kiệm quota
 */
export function suggestQuotaSavingAlternatives(query: string): string[] {
  const suggestions: string[] = [];
  
  const lowerQuery = query.toLowerCase();
  
  // Nếu hỏi về thông tin thời sự
  if (lowerQuery.includes('tin tức') || lowerQuery.includes('hôm nay') || lowerQuery.includes('mới nhất')) {
    suggestions.push('💡 Sử dụng DeepSearch thay vì hỏi AI để tiết kiệm quota cho thông tin thời sự');
  }
  
  // Nếu hỏi về tạo ảnh
  if (lowerQuery.includes('tạo ảnh') || lowerQuery.includes('vẽ') || lowerQuery.includes('hình ảnh')) {
    suggestions.push('💡 Thử mô tả chi tiết bằng văn bản trước khi tạo ảnh để tiết kiệm quota');
  }
  
  // Nếu hỏi về video
  if (lowerQuery.includes('video') || lowerQuery.includes('phim')) {
    suggestions.push('💡 Cân nhắc tạo ảnh tĩnh thay vì video để tiết kiệm quota đáng kể');
  }
  
  // Nếu hỏi câu hỏi dài
  if (query.length > 500) {
    suggestions.push('💡 Chia thành câu hỏi ngắn hơn để tối ưu hóa việc sử dụng API');
  }
  
  return suggestions;
}

/**
 * Lấy thống kê cache
 */
export function getCacheStats() {
  const now = new Date();
  const validEntries = Array.from(responseCache.values()).filter(entry => entry.expiryTime > now);
  
  return {
    totalEntries: responseCache.size,
    validEntries: validEntries.length,
    expiredEntries: responseCache.size - validEntries.length,
    cacheHitPotential: validEntries.length > 0 ? '✅ Có thể tiết kiệm quota từ cache' : '⚠️ Cache trống'
  };
}

/**
 * Dọn dẹp cache hết hạn
 */
export function cleanupExpiredCache(): number {
  const now = new Date();
  let removedCount = 0;
  
  for (const [key, entry] of Array.from(responseCache.entries())) {
    if (entry.expiryTime <= now) {
      responseCache.delete(key);
      removedCount++;
    }
  }
  
  return removedCount;
}