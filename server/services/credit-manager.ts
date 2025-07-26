/**
 * Credit Management Service
 * Handles user credits, transactions, and quota enforcement
 */

import { db } from '../db.js';
import { users, creditTransactions, CREDIT_COSTS, type CreditType } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export class CreditManager {
  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: string): Promise<number> {
    try {
      const [user] = await db.select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, userId));
      
      return user?.credits || 0;
    } catch (error) {
      console.error('❌ Failed to get user credits:', error);
      return 0;
    }
  }

  /**
   * Check if user has enough credits for an operation
   */
  async canAfford(userId: string, creditType: CreditType): Promise<{ canAfford: boolean; currentCredits: number; required: number }> {
    const currentCredits = await this.getUserCredits(userId);
    const required = CREDIT_COSTS[creditType];
    
    return {
      canAfford: currentCredits >= required,
      currentCredits,
      required
    };
  }

  /**
   * Deduct credits for an operation
   */
  async deductCredits(
    userId: string, 
    creditType: CreditType, 
    messageId?: string,
    customAmount?: number,
    description?: string
  ): Promise<{ success: boolean; newBalance: number; message?: string }> {
    try {
      const amount = customAmount || CREDIT_COSTS[creditType];
      const currentCredits = await this.getUserCredits(userId);
      
      if (currentCredits < amount) {
        return {
          success: false,
          newBalance: currentCredits,
          message: `Không đủ credit. Cần ${amount} credits, bạn chỉ có ${currentCredits} credits.`
        };
      }

      const newBalance = currentCredits - amount;

      // Update user credits
      await db.update(users)
        .set({ 
          credits: newBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Record transaction
      await db.insert(creditTransactions).values({
        userId,
        messageId,
        type: creditType,
        amount: -amount,
        balanceAfter: newBalance,
        description: description || `Used ${amount} credits for ${creditType}`
      });

      console.log(`💳 User ${userId} used ${amount} credits for ${creditType}. New balance: ${newBalance}`);

      return {
        success: true,
        newBalance,
        message: `Đã sử dụng ${amount} credits. Số dư hiện tại: ${newBalance} credits.`
      };
    } catch (error) {
      console.error('❌ Failed to deduct credits:', error);
      return {
        success: false,
        newBalance: 0,
        message: 'Lỗi khi trừ credits'
      };
    }
  }

  /**
   * Add credits to user (admin function)
   */
  async addCredits(
    userId: string, 
    amount: number, 
    description: string = 'Admin credit adjustment'
  ): Promise<{ success: boolean; newBalance: number; message?: string }> {
    try {
      const currentCredits = await this.getUserCredits(userId);
      const newBalance = currentCredits + amount;

      // Update user credits
      await db.update(users)
        .set({ 
          credits: newBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Record transaction
      await db.insert(creditTransactions).values({
        userId,
        type: 'admin_adjustment',
        amount,
        balanceAfter: newBalance,
        description
      });

      console.log(`💰 Admin added ${amount} credits to user ${userId}. New balance: ${newBalance}`);

      return {
        success: true,
        newBalance,
        message: `Đã thêm ${amount} credits. Số dư mới: ${newBalance} credits.`
      };
    } catch (error) {
      console.error('❌ Failed to add credits:', error);
      return {
        success: false,
        newBalance: 0,
        message: 'Lỗi khi thêm credits'
      };
    }
  }

  /**
   * Set user credits to specific amount (admin function)
   */
  async setCredits(
    userId: string, 
    newAmount: number, 
    description: string = 'Admin credit reset'
  ): Promise<{ success: boolean; newBalance: number; message?: string }> {
    try {
      const currentCredits = await this.getUserCredits(userId);
      const difference = newAmount - currentCredits;

      // Update user credits
      await db.update(users)
        .set({ 
          credits: newAmount,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Record transaction
      await db.insert(creditTransactions).values({
        userId,
        type: 'admin_adjustment',
        amount: difference,
        balanceAfter: newAmount,
        description
      });

      console.log(`🔧 Admin set user ${userId} credits to ${newAmount}. Previous: ${currentCredits}`);

      return {
        success: true,
        newBalance: newAmount,
        message: `Đã cập nhật credits thành ${newAmount}. Thay đổi: ${difference > 0 ? '+' : ''}${difference} credits.`
      };
    } catch (error) {
      console.error('❌ Failed to set credits:', error);
      return {
        success: false,
        newBalance: 0,
        message: 'Lỗi khi cập nhật credits'
      };
    }
  }

  /**
   * Get user's credit transaction history
   */
  async getCreditHistory(userId: string, limit: number = 20) {
    try {
      const transactions = await db.select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit);

      return transactions;
    } catch (error) {
      console.error('❌ Failed to get credit history:', error);
      return [];
    }
  }

  /**
   * Get credit usage analytics
   */
  async getCreditAnalytics(userId: string) {
    try {
      const history = await this.getCreditHistory(userId, 100);
      const currentCredits = await this.getUserCredits(userId);
      
      const analytics = {
        currentCredits,
        totalSpent: history
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalEarned: history
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0),
        transactionCount: history.length,
        mostUsedFeature: this.getMostUsedFeature(history),
        recentTransactions: history.slice(0, 5)
      };

      return analytics;
    } catch (error) {
      console.error('❌ Failed to get credit analytics:', error);
      return null;
    }
  }

  private getMostUsedFeature(transactions: any[]): string {
    const featureCount: Record<string, number> = {};
    
    transactions
      .filter(t => t.amount < 0)
      .forEach(t => {
        featureCount[t.type] = (featureCount[t.type] || 0) + 1;
      });

    const entries = Object.entries(featureCount);
    if (entries.length === 0) return 'Chưa có hoạt động';
    
    const sorted = entries.sort(([,a], [,b]) => b - a);
    return sorted.length > 0 ? sorted[0][0] : 'Không xác định';
  }
}

export const creditManager = new CreditManager();