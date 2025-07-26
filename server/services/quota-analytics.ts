/**
 * Quota Analytics Service
 * Theo dõi và phân tích việc sử dụng quota để tối ưu hóa
 */

import { QUOTA_RATES, FeatureType } from './gemini-manager.js';

interface QuotaUsageStats {
  feature: FeatureType;
  totalRequests: number;
  totalTokens: number;
  totalImages: number;
  totalVideos: number;
  lastUsed: Date;
  averageTokensPerRequest: number;
  quotaPercentage: number;
}

class QuotaAnalytics {
  private usageStats: Map<FeatureType, QuotaUsageStats> = new Map();
  private dailyQuotaLimit = 50; // Free tier limit per API

  constructor() {
    this.initializeStats();
  }

  private initializeStats() {
    Object.keys(QUOTA_RATES).forEach(feature => {
      this.usageStats.set(feature as FeatureType, {
        feature: feature as FeatureType,
        totalRequests: 0,
        totalTokens: 0,
        totalImages: 0,
        totalVideos: 0,
        lastUsed: new Date(),
        averageTokensPerRequest: 0,
        quotaPercentage: 0
      });
    });
  }

  /**
   * Ghi nhận sử dụng quota cho một feature
   */
  recordUsage(feature: FeatureType, customTokens?: number) {
    const stats = this.usageStats.get(feature);
    if (!stats) return;

    const rate = QUOTA_RATES[feature];
    stats.totalRequests++;
    stats.totalTokens += customTokens || rate.tokens;
    stats.lastUsed = new Date();
    
    if ('images' in rate) stats.totalImages += rate.images;
    if ('videos' in rate) stats.totalVideos += rate.videos;
    
    stats.averageTokensPerRequest = stats.totalTokens / stats.totalRequests;
    stats.quotaPercentage = (stats.totalRequests / this.dailyQuotaLimit) * 100;
    
    this.usageStats.set(feature, stats);
  }

  /**
   * Lấy thống kê sử dụng quota
   */
  getQuotaReport(): {
    totalRequests: number;
    totalTokens: number;
    quotaPercentage: number;
    topConsumers: QuotaUsageStats[];
    recommendations: string[];
  } {
    const allStats = Array.from(this.usageStats.values());
    const totalRequests = allStats.reduce((sum, stat) => sum + stat.totalRequests, 0);
    const totalTokens = allStats.reduce((sum, stat) => sum + stat.totalTokens, 0);
    const quotaPercentage = (totalRequests / this.dailyQuotaLimit) * 100;

    // Sắp xếp theo mức tiêu thụ
    const topConsumers = allStats
      .filter(stat => stat.totalRequests > 0)
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 5);

    const recommendations = this.generateRecommendations(allStats, quotaPercentage);

    return {
      totalRequests,
      totalTokens,
      quotaPercentage,
      topConsumers,
      recommendations
    };
  }

  /**
   * Tạo khuyến nghị tiết kiệm quota
   */
  private generateRecommendations(stats: QuotaUsageStats[], quotaPercentage: number): string[] {
    const recommendations: string[] = [];

    // Kiểm tra quota usage
    if (quotaPercentage > 80) {
      recommendations.push("⚠️ Đã sử dụng hơn 80% quota - cần thêm API keys");
    }

    // Phân tích từng feature
    const videoStats = stats.find(s => s.feature === 'videoAnalysis');
    if (videoStats && videoStats.totalRequests > 5) {
      recommendations.push("🎥 Video analysis tiêu tốn nhiều quota - hạn chế nếu không cần thiết");
    }

    const imageStats = stats.find(s => s.feature === 'imageGeneration');
    if (imageStats && imageStats.totalRequests > 10) {
      recommendations.push("🖼️ Image generation tốn quota cao - xem xét cache kết quả");
    }

    const searchStats = stats.find(s => s.feature === 'deepSearch');
    if (searchStats && searchStats.totalRequests > 15) {
      recommendations.push("🔍 Deep search sử dụng nhiều - cache kết quả tìm kiếm");
    }

    // Khuyến nghị tổng quát
    if (quotaPercentage > 50) {
      recommendations.push("💡 Sử dụng cache để giảm API calls lặp lại");
      recommendations.push("🔄 Thêm API keys để tăng quota limit");
    }

    return recommendations;
  }

  /**
   * Reset stats hàng ngày
   */
  resetDailyStats() {
    this.initializeStats();
    console.log('📊 Daily quota stats reset');
  }
}

export const quotaAnalytics = new QuotaAnalytics();

// Reset stats mỗi ngày lúc 00:00
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);

const timeUntilMidnight = tomorrow.getTime() - now.getTime();

setTimeout(() => {
  quotaAnalytics.resetDailyStats();
  
  // Sau đó reset mỗi 24 giờ
  setInterval(() => {
    quotaAnalytics.resetDailyStats();
  }, 24 * 60 * 60 * 1000);
}, timeUntilMidnight);