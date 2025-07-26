import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";

// Interface for API key configuration
export interface GeminiAPIConfig {
  id: string;
  key: string;
  priority: number;
  name: string;
  status: 'active' | 'failed' | 'quota_exceeded' | 'disabled';
  lastUsed: Date | null;
  requestCount: number;
  failureCount: number;
  lastError: string | null;
  maxRequestsPerMinute?: number;
  quotaUsage: {
    requests: number;
    tokens: number;
    images: number;
    videos: number;
    resetTime: Date;
  };
}

// Quota consumption rates for different features
export const QUOTA_RATES = {
  chat: { requests: 1, tokens: 100, priority: 'medium' as const },
  imageGeneration: { requests: 1, tokens: 200, images: 1, priority: 'high' as const },
  videoAnalysis: { requests: 1, tokens: 300, videos: 1, priority: 'high' as const },
  webScraping: { requests: 1, tokens: 150, priority: 'medium' as const },
  deepSearch: { requests: 1, tokens: 200, priority: 'medium' as const },
  learning: { requests: 1, tokens: 100, priority: 'low' as const }
} as const;

export type FeatureType = keyof typeof QUOTA_RATES;

class GeminiAPIManager {
  private apis: Map<string, GeminiAPIConfig> = new Map();
  private clients: Map<string, { genAI: GoogleGenerativeAI; genAI2: GoogleGenAI }> = new Map();
  private rateLimitTracker: Map<string, { requests: number; resetTime: Date }> = new Map();

  constructor() {
    this.loadAPIConfigurations();
    this.setupRateLimitTracking();
    this.setupDynamicAPIDiscovery();
  }

  /**
   * Load API configurations from environment variables
   */
  private loadAPIConfigurations() {
    // Load primary API
    if (process.env.GEMINI_API_KEY) {
      this.addAPI({
        id: 'primary',
        key: process.env.GEMINI_API_KEY,
        priority: 1,
        name: 'Gemini Primary API',
        status: 'active',
        lastUsed: null,
        requestCount: 0,
        failureCount: 0,
        lastError: null,
        maxRequestsPerMinute: 60,
        quotaUsage: {
          requests: 0,
          tokens: 0,
          images: 0,
          videos: 0,
          resetTime: new Date()
        }
      });
    }

    // Load additional APIs from numbered environment variables (unlimited)
    let i = 2;
    while (true) {
      const apiKey = process.env[`GEMINI_API_KEY_${i}`];
      if (!apiKey) {
        // Check for gaps in numbering up to 50 to handle non-sequential keys
        if (i <= 50) {
          i++;
          continue;
        }
        break;
      }
      
      this.addAPI({
        id: `api_${i}`,
        key: apiKey,
        priority: i,
        name: `Gemini API ${i}`,
        status: 'active',
        lastUsed: null,
        requestCount: 0,
        failureCount: 0,
        lastError: null,
        maxRequestsPerMinute: 60,
        quotaUsage: {
          requests: 0,
          tokens: 0,
          images: 0,
          videos: 0,
          resetTime: new Date()
        }
      });
      i++;
    }

    // Also scan for custom named keys following GEMINI_API_KEY_* pattern
    Object.keys(process.env).forEach(envKey => {
      if (envKey.startsWith('GEMINI_API_KEY_') && envKey !== 'GEMINI_API_KEY' && !envKey.match(/^GEMINI_API_KEY_\d+$/)) {
        const customId = envKey.replace('GEMINI_API_KEY_', '').toLowerCase();
        const apiKey = process.env[envKey];
        if (apiKey && !this.apis.has(`custom_${customId}`)) {
          this.addAPI({
            id: `custom_${customId}`,
            key: apiKey,
            priority: 100 + this.apis.size, // Lower priority for custom named keys
            name: `Gemini API (${customId})`,
            status: 'active',
            lastUsed: null,
            requestCount: 0,
            failureCount: 0,
            lastError: null,
            maxRequestsPerMinute: 60,
            quotaUsage: {
              requests: 0,
              tokens: 0,
              images: 0,
              videos: 0,
              resetTime: new Date()
            }
          });
        }
      }
    });

    console.log(`🔧 Loaded ${this.apis.size} Gemini API configurations`);
    
    if (this.apis.size > 1) {
      const totalQuota = this.apis.size * 50; // Assuming 50 requests per day per API
      console.log(`📊 Total daily quota capacity: ~${totalQuota} requests/day`);
    }
  }

  /**
   * Add new API configuration
   */
  addAPI(config: GeminiAPIConfig) {
    // Check for duplicate keys to avoid adding the same API twice
    const existingKey = Array.from(this.apis.values()).find(api => api.key === config.key);
    if (existingKey) {
      console.log(`⚠️ Skipping duplicate API key for ${config.name}`);
      return;
    }
    this.apis.set(config.id, config);
    
    // Initialize clients
    try {
      const genAI = new GoogleGenerativeAI(config.key);
      const genAI2 = new GoogleGenAI({ apiKey: config.key });
      this.clients.set(config.id, { genAI, genAI2 });
      
      console.log(`✅ Added Gemini API: ${config.name} (Priority: ${config.priority})`);
    } catch (error) {
      console.error(`❌ Failed to initialize API ${config.name}:`, error);
      config.status = 'failed';
      config.lastError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Get best available API based on priority and status
   */
  getBestAPI(feature: FeatureType = 'chat'): { config: GeminiAPIConfig; clients: { genAI: GoogleGenerativeAI; genAI2: GoogleGenAI } } | null {
    const sortedAPIs = Array.from(this.apis.values())
      .filter(api => api.status === 'active' && !this.isRateLimited(api.id))
      .sort((a, b) => a.priority - b.priority);

    for (const api of sortedAPIs) {
      const clients = this.clients.get(api.id);
      if (clients) {
        // Track usage for quota warning
        this.trackUsage(api.id, feature);
        return { config: api, clients };
      }
    }

    return null;
  }

  /**
   * Handle API failure and mark as failed
   */
  handleAPIFailure(apiId: string, error: any) {
    const api = this.apis.get(apiId);
    if (!api) return;

    api.failureCount++;
    api.lastError = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a quota/rate limit error
    const errorMessage = error?.message || '';
    if (errorMessage.includes('quota') || errorMessage.includes('overloaded') || 
        errorMessage.includes('rate limit') || errorMessage.includes('503')) {
      api.status = 'quota_exceeded';
      console.warn(`⚠️ API ${api.name} quota exceeded. Switching to backup.`);
      
      // Reset status after 1 hour for quota exceeded
      setTimeout(() => {
        if (api.status === 'quota_exceeded') {
          api.status = 'active';
          api.failureCount = 0;
          console.log(`🔄 Reset API ${api.name} status to active`);
        }
      }, 60 * 60 * 1000);
    } else {
      // Temporary failure, try again after shorter period
      api.status = 'failed';
      console.warn(`❌ API ${api.name} failed: ${api.lastError}`);
      
      setTimeout(() => {
        if (api.status === 'failed') {
          api.status = 'active';
          console.log(`🔄 Reset API ${api.name} status to active`);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  /**
   * Track rate limits
   */
  private isRateLimited(apiId: string): boolean {
    const tracker = this.rateLimitTracker.get(apiId);
    if (!tracker) return false;

    const now = new Date();
    if (now > tracker.resetTime) {
      // Reset counter
      this.rateLimitTracker.set(apiId, {
        requests: 0,
        resetTime: new Date(now.getTime() + 60 * 1000) // 1 minute
      });
      return false;
    }

    const api = this.apis.get(apiId);
    return tracker.requests >= (api?.maxRequestsPerMinute || 60);
  }

  /**
   * Track usage for quota monitoring
   */
  private trackUsage(apiId: string, feature: FeatureType) {
    const api = this.apis.get(apiId);
    if (!api) return;

    const rate = QUOTA_RATES[feature];
    api.requestCount++;
    api.lastUsed = new Date();
    
    // Update quota usage
    api.quotaUsage.requests += rate.requests;
    api.quotaUsage.tokens += rate.tokens;
    if ('images' in rate) api.quotaUsage.images += rate.images;
    if ('videos' in rate) api.quotaUsage.videos += rate.videos;

    // Update rate limit tracker
    let tracker = this.rateLimitTracker.get(apiId);
    if (!tracker || new Date() > tracker.resetTime) {
      tracker = {
        requests: 0,
        resetTime: new Date(Date.now() + 60 * 1000)
      };
    }
    tracker.requests++;
    this.rateLimitTracker.set(apiId, tracker);
  }

  /**
   * Setup rate limit tracking
   */
  private setupRateLimitTracking() {
    // Reset quota usage daily
    setInterval(() => {
      for (const [_, api] of Array.from(this.apis.entries())) {
        api.quotaUsage = {
          requests: 0,
          tokens: 0,
          images: 0,
          videos: 0,
          resetTime: new Date()
        };
      }
      console.log('🔄 Reset daily quota usage for all APIs');
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Setup dynamic API discovery - checks for new environment variables periodically
   */
  private setupDynamicAPIDiscovery() {
    // Check for new API keys every 5 minutes
    setInterval(() => {
      const oldSize = this.apis.size;
      this.loadAPIConfigurations();
      
      if (this.apis.size > oldSize) {
        const newAPIs = this.apis.size - oldSize;
        console.log(`🆕 Discovered ${newAPIs} new API keys! Total: ${this.apis.size}`);
        
        const totalQuota = this.apis.size * 50;
        console.log(`📊 Updated daily quota capacity: ~${totalQuota} requests/day`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Add API key at runtime
   */
  addAPIAtRuntime(keyName: string, apiKey: string, customName?: string): boolean {
    try {
      // Validate the key format
      if (!apiKey.startsWith('AIza')) {
        console.log(`❌ Invalid API key format for ${keyName}`);
        return false;
      }

      const priority = this.apis.size + 1;
      const config: GeminiAPIConfig = {
        id: `runtime_${keyName}`,
        key: apiKey,
        priority: priority,
        name: customName || `Gemini API (${keyName})`,
        status: 'active',
        lastUsed: null,
        requestCount: 0,
        failureCount: 0,
        lastError: null,
        maxRequestsPerMinute: 60,
        quotaUsage: {
          requests: 0,
          tokens: 0,
          images: 0,
          videos: 0,
          resetTime: new Date()
        }
      };

      this.addAPI(config);
      
      const totalQuota = this.apis.size * 50;
      console.log(`✅ Added runtime API: ${config.name}`);
      console.log(`📊 New total quota capacity: ~${totalQuota} requests/day`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to add runtime API ${keyName}:`, error);
      return false;
    }
  }

  /**
   * Get API status summary
   */
  getStatusSummary(): {
    totalAPIs: number;
    activeAPIs: number;
    failedAPIs: number;
    quotaExceededAPIs: number;
    quotaWarnings: Array<{ api: string; feature: string; usage: number }>;
  } {
    const apis = Array.from(this.apis.values());
    const quotaWarnings: Array<{ api: string; feature: string; usage: number }> = [];

    // Check for high quota usage
    for (const api of Array.from(this.apis.values())) {
      const totalRequests = api.quotaUsage.requests;
      if (totalRequests > 1000) { // Warning threshold
        const heaviestFeature = this.getHeaviestFeature(api);
        quotaWarnings.push({
          api: api.name,
          feature: heaviestFeature,
          usage: totalRequests
        });
      }
    }

    return {
      totalAPIs: apis.length,
      activeAPIs: apis.filter(api => api.status === 'active').length,
      failedAPIs: apis.filter(api => api.status === 'failed').length,
      quotaExceededAPIs: apis.filter(api => api.status === 'quota_exceeded').length,
      quotaWarnings
    };
  }

  /**
   * Get heaviest quota consuming feature
   */
  private getHeaviestFeature(api: GeminiAPIConfig): string {
    const features = Object.entries(QUOTA_RATES);
    let heaviest = 'chat';
    let maxCost = 0;

    for (const [feature, rate] of features) {
      const cost = (rate.requests * api.quotaUsage.requests) + 
                   (rate.tokens * api.quotaUsage.tokens) +
                   (('images' in rate ? rate.images : 0) * api.quotaUsage.images) +
                   (('videos' in rate ? rate.videos : 0) * api.quotaUsage.videos);
      
      if (cost > maxCost) {
        maxCost = cost;
        heaviest = feature;
      }
    }

    return heaviest;
  }

  /**
   * Get quota warning message for users
   */
  getQuotaWarningMessage(): string | null {
    const status = this.getStatusSummary();
    
    if (status.quotaExceededAPIs > 0 || status.quotaWarnings.length > 0) {
      let message = "⚠️ **Cảnh báo Quota API**\n\n";
      
      if (status.quotaExceededAPIs > 0) {
        message += `🔴 **${status.quotaExceededAPIs}/${status.totalAPIs} API đã hết quota** - Hệ thống đang sử dụng API dự phòng\n\n`;
      }
      
      if (status.quotaWarnings.length > 0) {
        message += "📊 **Tính năng tiêu thụ quota nhiều nhất:**\n";
        status.quotaWarnings.forEach(warning => {
          const featureNames: Record<string, string> = {
            chat: 'Chat thường',
            imageGeneration: 'Tạo hình ảnh',
            videoAnalysis: 'Phân tích video',
            webScraping: 'Phân tích website',
            deepSearch: 'Tìm kiếm thông tin',
            learning: 'Tự học AI'
          };
          message += `• **${featureNames[warning.feature] || warning.feature}**: ${warning.usage} requests (${warning.api})\n`;
        });
        
        message += "\n💡 **Khuyến nghị**: Sử dụng ít tính năng tạo ảnh/video để tiết kiệm quota";
      }
      
      return message;
    }
    
    return null;
  }

  /**
   * Get all API configurations (for admin)
   */
  getAllAPIs(): GeminiAPIConfig[] {
    return Array.from(this.apis.values());
  }

  /**
   * Update API status manually
   */
  updateAPIStatus(apiId: string, status: GeminiAPIConfig['status']) {
    const api = this.apis.get(apiId);
    if (api) {
      api.status = status;
      if (status === 'active') {
        api.failureCount = 0;
        api.lastError = null;
      }
    }
  }
}

// Global instance
export const geminiManager = new GeminiAPIManager();

// Export functions for backward compatibility
export function getBestGeminiAPI(feature: FeatureType = 'chat') {
  return geminiManager.getBestAPI(feature);
}

export function handleGeminiAPIFailure(apiId: string, error: any) {
  geminiManager.handleAPIFailure(apiId, error);
}

export function getGeminiStatusSummary() {
  return geminiManager.getStatusSummary();
}

export function getQuotaWarning() {
  return geminiManager.getQuotaWarningMessage();
}