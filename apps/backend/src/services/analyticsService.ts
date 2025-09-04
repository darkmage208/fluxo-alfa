import { prisma } from '../config/database';
import logger from '../config/logger';

export class AnalyticsService {
  /**
   * Update user-specific usage aggregations when a chat message is created
   */
  async updateUserUsageAggregations(userId: string, messageData: {
    tokensInput: number;
    tokensOutput: number;
    tokensEmbedding: number;
    costUsd: number;
    embeddingCostUsd: number;
    createdAt: Date;
    isNewThread: boolean;
  }) {
    try {
      const { tokensInput, tokensOutput, tokensEmbedding, costUsd, embeddingCostUsd, createdAt, isNewThread } = messageData;
      const date = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      const year = createdAt.getFullYear();
      const month = createdAt.getMonth() + 1; // JavaScript months are 0-based

      // Update daily usage
      await prisma.dailyUsage.upsert({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        update: {
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: tokensInput },
          tokensOutput: { increment: tokensOutput },
          tokensEmbedding: { increment: tokensEmbedding },
          costUsd: { increment: costUsd },
          embeddingCostUsd: { increment: embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          userId,
          date,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput,
          tokensOutput,
          tokensEmbedding,
          costUsd,
          embeddingCostUsd,
        },
      });

      // Update monthly usage
      await prisma.monthlyUsage.upsert({
        where: {
          userId_year_month: {
            userId,
            year,
            month,
          },
        },
        update: {
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: tokensInput },
          tokensOutput: { increment: tokensOutput },
          tokensEmbedding: { increment: tokensEmbedding },
          costUsd: { increment: costUsd },
          embeddingCostUsd: { increment: embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          userId,
          year,
          month,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput,
          tokensOutput,
          tokensEmbedding,
          costUsd,
          embeddingCostUsd,
        },
      });

      // Update yearly usage
      await prisma.yearlyUsage.upsert({
        where: {
          userId_year: {
            userId,
            year,
          },
        },
        update: {
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: tokensInput },
          tokensOutput: { increment: tokensOutput },
          tokensEmbedding: { increment: tokensEmbedding },
          costUsd: { increment: costUsd },
          embeddingCostUsd: { increment: embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          userId,
          year,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput,
          tokensOutput,
          tokensEmbedding,
          costUsd,
          embeddingCostUsd,
        },
      });

      logger.info(`Updated user usage aggregations for user ${userId}`, {
        date: date.toISOString().split('T')[0],
        year,
        month,
        isNewThread,
      });
    } catch (error) {
      logger.error('Error updating user usage aggregations:', error);
      throw error;
    }
  }

  /**
   * Update system-wide usage aggregations
   */
  async updateSystemUsageAggregations(messageData: {
    tokensInput: number;
    tokensOutput: number;
    tokensEmbedding: number;
    costUsd: number;
    embeddingCostUsd: number;
    createdAt: Date;
    isNewThread: boolean;
    isNewUser?: boolean;
  }) {
    try {
      const { tokensInput, tokensOutput, tokensEmbedding, costUsd, embeddingCostUsd, createdAt, isNewThread, isNewUser } = messageData;
      const date = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      const year = createdAt.getFullYear();
      const month = createdAt.getMonth() + 1;

      // Get current user counts for system stats
      const [totalUsers, activeUsers, freeUsers, proUsers] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({
          where: {
            subscription: {
              planId: 'free'
            }
          }
        }),
        prisma.user.count({
          where: {
            subscription: {
              planId: 'pro'
            }
          }
        }),
      ]);

      // Update daily system stats
      await prisma.systemDailyStats.upsert({
        where: { date },
        update: {
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          newUsers: isNewUser ? { increment: 1 } : undefined,
          tokensInput: { increment: tokensInput },
          tokensOutput: { increment: tokensOutput },
          tokensEmbedding: { increment: tokensEmbedding },
          costUsd: { increment: costUsd },
          embeddingCostUsd: { increment: embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          date,
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          newUsers: isNewUser ? 1 : 0,
          tokensInput,
          tokensOutput,
          tokensEmbedding,
          costUsd,
          embeddingCostUsd,
        },
      });

      // Update monthly system stats
      await prisma.systemMonthlyStats.upsert({
        where: {
          year_month: { year, month }
        },
        update: {
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          newUsers: isNewUser ? { increment: 1 } : undefined,
          tokensInput: { increment: tokensInput },
          tokensOutput: { increment: tokensOutput },
          tokensEmbedding: { increment: tokensEmbedding },
          costUsd: { increment: costUsd },
          embeddingCostUsd: { increment: embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          year,
          month,
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          newUsers: isNewUser ? 1 : 0,
          tokensInput,
          tokensOutput,
          tokensEmbedding,
          costUsd,
          embeddingCostUsd,
        },
      });

      // Update yearly system stats
      await prisma.systemYearlyStats.upsert({
        where: { year },
        update: {
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          newUsers: isNewUser ? { increment: 1 } : undefined,
          tokensInput: { increment: tokensInput },
          tokensOutput: { increment: tokensOutput },
          tokensEmbedding: { increment: tokensEmbedding },
          costUsd: { increment: costUsd },
          embeddingCostUsd: { increment: embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          year,
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          newUsers: isNewUser ? 1 : 0,
          tokensInput,
          tokensOutput,
          tokensEmbedding,
          costUsd,
          embeddingCostUsd,
        },
      });

      logger.info(`Updated system usage aggregations`, {
        date: date.toISOString().split('T')[0],
        year,
        month,
        isNewThread,
        isNewUser,
      });
    } catch (error) {
      logger.error('Error updating system usage aggregations:', error);
      throw error;
    }
  }

  /**
   * Update payment-related aggregations
   */
  async updatePaymentAggregations(paymentData: {
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  }) {
    try {
      const { amount, currency, status, createdAt } = paymentData;
      
      if (status !== 'succeeded') {
        return; // Only aggregate successful payments
      }

      // Convert to USD if needed (simplified - in real app, use proper currency conversion)
      const amountUsd = currency.toLowerCase() === 'usd' ? amount : amount * 0.85; // Simplified conversion

      const date = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      const year = createdAt.getFullYear();
      const month = createdAt.getMonth() + 1;

      // Update daily stats
      await prisma.systemDailyStats.upsert({
        where: { date },
        update: {
          revenueUsd: { increment: amountUsd },
          updatedAt: new Date(),
        },
        create: {
          date,
          revenueUsd: amountUsd,
          totalUsers: 0,
          activeUsers: 0,
          freeUsers: 0,
          proUsers: 0,
          messagesCount: 0,
          chatsCount: 0,
          newUsers: 0,
          tokensInput: 0,
          tokensOutput: 0,
          tokensEmbedding: 0,
          costUsd: 0,
          embeddingCostUsd: 0,
        },
      });

      // Update monthly stats
      await prisma.systemMonthlyStats.upsert({
        where: {
          year_month: { year, month }
        },
        update: {
          revenueUsd: { increment: amountUsd },
          updatedAt: new Date(),
        },
        create: {
          year,
          month,
          revenueUsd: amountUsd,
          totalUsers: 0,
          activeUsers: 0,
          freeUsers: 0,
          proUsers: 0,
          messagesCount: 0,
          chatsCount: 0,
          newUsers: 0,
          tokensInput: 0,
          tokensOutput: 0,
          tokensEmbedding: 0,
          costUsd: 0,
          embeddingCostUsd: 0,
        },
      });

      // Update yearly stats
      await prisma.systemYearlyStats.upsert({
        where: { year },
        update: {
          revenueUsd: { increment: amountUsd },
          updatedAt: new Date(),
        },
        create: {
          year,
          revenueUsd: amountUsd,
          totalUsers: 0,
          activeUsers: 0,
          freeUsers: 0,
          proUsers: 0,
          messagesCount: 0,
          chatsCount: 0,
          newUsers: 0,
          tokensInput: 0,
          tokensOutput: 0,
          tokensEmbedding: 0,
          costUsd: 0,
          embeddingCostUsd: 0,
        },
      });

      logger.info(`Updated payment aggregations`, {
        amount: amountUsd,
        currency,
        date: date.toISOString().split('T')[0],
      });
    } catch (error) {
      logger.error('Error updating payment aggregations:', error);
      throw error;
    }
  }

  /**
   * Get optimized analytics data from pre-aggregated tables
   */
  async getOptimizedOverviewMetrics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    freeUsers: number;
    proUsers: number;
    totalChats: number;
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    dailyActiveUsers: number;
    monthlyRevenue: number;
    totalRevenue: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      // Get today's stats
      const todayStats = await prisma.systemDailyStats.findUnique({
        where: { date: today },
      });

      // Get this month's stats
      const monthlyStats = await prisma.systemMonthlyStats.findUnique({
        where: {
          year_month: { year: currentYear, month: currentMonth }
        },
      });

      // Get total stats from yearly aggregation
      const yearlyStats = await prisma.systemYearlyStats.findMany();
      
      const totalStats = yearlyStats.reduce((acc, year) => ({
        chats: acc.chats + year.chatsCount,
        messages: acc.messages + year.messagesCount,
        tokens: acc.tokens + year.tokensInput + year.tokensOutput,
        cost: acc.cost + Number(year.costUsd) + Number(year.embeddingCostUsd),
        revenue: acc.revenue + Number(year.revenueUsd),
      }), { chats: 0, messages: 0, tokens: 0, cost: 0, revenue: 0 });

      return {
        totalUsers: todayStats?.totalUsers || 0,
        activeUsers: todayStats?.activeUsers || 0,
        freeUsers: todayStats?.freeUsers || 0,
        proUsers: todayStats?.proUsers || 0,
        totalChats: totalStats.chats,
        totalMessages: totalStats.messages,
        totalTokens: totalStats.tokens,
        totalCost: totalStats.cost,
        dailyActiveUsers: todayStats?.activeUsers || 0,
        monthlyRevenue: Number(monthlyStats?.revenueUsd || 0),
        totalRevenue: totalStats.revenue,
      };
    } catch (error) {
      logger.error('Error getting optimized overview metrics:', error);
      throw error;
    }
  }

  /**
   * Get user analytics from pre-aggregated data
   */
  async getUserAnalytics(userId: string, timeframe: 'daily' | 'monthly' | 'yearly' = 'monthly', limit = 12) {
    try {
      switch (timeframe) {
        case 'daily':
          const dailyData = await prisma.dailyUsage.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: limit,
          });
          return dailyData;

        case 'monthly':
          const monthlyData = await prisma.monthlyUsage.findMany({
            where: { userId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: limit,
          });
          return monthlyData;

        case 'yearly':
          const yearlyData = await prisma.yearlyUsage.findMany({
            where: { userId },
            orderBy: { year: 'desc' },
            take: limit,
          });
          return yearlyData;

        default:
          throw new Error('Invalid timeframe');
      }
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Get system analytics from pre-aggregated data
   */
  async getSystemAnalytics(timeframe: 'daily' | 'monthly' | 'yearly' = 'monthly', limit = 12) {
    try {
      switch (timeframe) {
        case 'daily':
          const dailyData = await prisma.systemDailyStats.findMany({
            orderBy: { date: 'desc' },
            take: limit,
          });
          return dailyData;

        case 'monthly':
          const monthlyData = await prisma.systemMonthlyStats.findMany({
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: limit,
          });
          return monthlyData;

        case 'yearly':
          const yearlyData = await prisma.systemYearlyStats.findMany({
            orderBy: { year: 'desc' },
            take: limit,
          });
          return yearlyData;

        default:
          throw new Error('Invalid timeframe');
      }
    } catch (error) {
      logger.error('Error getting system analytics:', error);
      throw error;
    }
  }
}