import { prisma } from '../config/database';
import { RAGService } from './ragService';
import { AnalyticsService } from './analyticsService';
import logger from '../config/logger';
import { 
  NotFoundError, 
  ValidationError,
  createPaginatedResponse,
  sanitizeUser 
} from '@fluxo/shared';
import type { 
  AdminMetrics, 
  UserUsageStats, 
  Source, 
  CreateSourceRequest, 
  UpdateSourceRequest,
  User,
  Subscription 
} from '@fluxo/shared';

export class AdminService {
  private ragService: RAGService;
  private analyticsService: AnalyticsService;

  constructor() {
    this.ragService = new RAGService();
    this.analyticsService = new AnalyticsService();
  }

  async getOverviewMetrics(): Promise<AdminMetrics> {
    try {
      // Use optimized analytics service for fast pre-aggregated data
      const optimizedMetrics = await this.analyticsService.getOptimizedOverviewMetrics();
      
      // Get today's data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [totalSubscriptions, activeSubscriptions, todayStats, todayRevenue, todayCosts] = await Promise.all([
        prisma.subscription.count(),
        prisma.subscription.count({ where: { status: 'active' } }),
        // Get today's user activity from daily stats
        prisma.systemDailyStats.findUnique({
          where: { date: today }
        }),
        // Get today's revenue from payments
        prisma.payment.aggregate({
          where: {
            status: 'succeeded',
            createdAt: { gte: today }
          },
          _sum: { amount: true }
        }),
        // Get today's costs from daily stats
        prisma.systemDailyStats.findUnique({
          where: { date: today },
          select: {
            costUsd: true,
            embeddingCostUsd: true
          }
        })
      ]);

      const todayActiveUsers = todayStats?.activeUsers || 0;
      const todayRevenueAmount = Number(todayRevenue._sum.amount) || 0;
      const todayTotalCosts = todayCosts ? (Number(todayCosts.costUsd) + Number(todayCosts.embeddingCostUsd)) : 0;

      return {
        totalUsers: optimizedMetrics.totalUsers,
        activeUsers: optimizedMetrics.activeUsers,
        totalSubscriptions,
        activeSubscriptions,
        freeUsers: optimizedMetrics.freeUsers,
        proUsers: optimizedMetrics.proUsers,
        totalChats: optimizedMetrics.totalChats,
        totalTokens: optimizedMetrics.totalTokens,
        totalCost: optimizedMetrics.totalCost,
        dailyActiveUsers: todayActiveUsers,
        totalRevenue: optimizedMetrics.totalRevenue,
        todayRevenue: todayRevenueAmount,
        todayTotalCosts: todayTotalCosts,
      };
    } catch (error) {
      logger.error('Get overview metrics error:', error);
      // Fallback to current user counts if analytics service fails
      try {
        const [totalUsers, activeUsers, freeUsers, proUsers, totalSubscriptions, activeSubscriptions] = await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { isActive: true } }),
          prisma.user.count({ where: { subscription: { planId: 'free' } } }),
          prisma.user.count({ where: { subscription: { planId: 'pro' } } }),
          prisma.subscription.count(),
          prisma.subscription.count({ where: { status: 'active' } }),
        ]);

        return {
          totalUsers,
          activeUsers,
          totalSubscriptions,
          activeSubscriptions,
          freeUsers,
          proUsers,
          totalChats: 0,
          totalTokens: 0,
          totalCost: 0,
          dailyActiveUsers: activeUsers,
          totalRevenue: 0,
          todayRevenue: 0,
          todayTotalCosts: 0,
        };
      } catch (fallbackError) {
        logger.error('Fallback metrics error:', fallbackError);
        throw error;
      }
    }
  }

  async getUsers(page = 1, limit = 50, search?: string): Promise<{
    users: Array<User & { subscription?: Subscription }>;
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const where = search 
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { id: { contains: search } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: { subscription: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      const sanitizedUsers = users.map(user => sanitizeUser(user));

      return { users: sanitizedUsers, total };
    } catch (error) {
      logger.error('Get users error:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: { 
    isActive?: boolean; 
    role?: string; 
  }): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updates,
      });

      logger.info(`User updated: ${userId}`, updates);
      return sanitizeUser(user);
    } catch (error) {
      logger.error('Update user error:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info(`User deleted: ${userId}`);
    } catch (error) {
      logger.error('Delete user error:', error);
      throw error;
    }
  }

  async requestUserPasswordReset(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate reset token
      const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      logger.info(`Password reset requested for user: ${userId} by admin`);
    } catch (error) {
      logger.error('Request user password reset error:', error);
      throw error;
    }
  }

  async getUserUsageStats(userId: string): Promise<UserUsageStats> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalChats, totalTokensResult, totalCostResult, last30DaysChats, todayChats] = await Promise.all([
        prisma.chatMessage.count({
          where: { thread: { userId } },
        }),
        prisma.chatMessage.aggregate({
          where: { thread: { userId } },
          _sum: { tokensInput: true, tokensOutput: true },
        }),
        prisma.chatMessage.aggregate({
          where: { thread: { userId } },
          _sum: { costUsd: true },
        }),
        prisma.chatMessage.count({
          where: {
            thread: { userId },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.chatMessage.count({
          where: {
            thread: { userId },
            createdAt: { gte: today },
          },
        }),
      ]);

      const totalTokens = (totalTokensResult._sum.tokensInput || 0) + (totalTokensResult._sum.tokensOutput || 0);
      const totalCost = Number(totalCostResult._sum.costUsd) || 0;

      return {
        userId,
        totalChats,
        totalTokens,
        totalCost,
        last30DaysChats,
        todayChats,
      };
    } catch (error) {
      logger.error('Get user usage stats error:', error);
      throw error;
    }
  }

  async getSubscriptions(page = 1, limit = 50): Promise<{
    subscriptions: Array<Subscription & { user: User }>;
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          include: { 
            user: true,
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.subscription.count(),
      ]);

      const sanitizedSubscriptions = subscriptions.map(sub => ({
        ...sub,
        user: sanitizeUser(sub.user),
      }));

      return { subscriptions: sanitizedSubscriptions, total };
    } catch (error) {
      logger.error('Get subscriptions error:', error);
      throw error;
    }
  }

  // Payment History Management
  async getPayments(page = 1, limit = 50, userId?: string): Promise<{
    payments: any[];
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const where = userId ? { userId } : {};

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              }
            },
            subscription: {
              include: {
                plan: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payment.count({ where }),
      ]);

      return { payments, total };
    } catch (error) {
      logger.error('Get payments error:', error);
      throw error;
    }
  }

  async getPaymentStats(): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    successfulPayments: number;
    failedPayments: number;
  }> {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalRevenueResult,
        monthlyRevenueResult,
        successfulPayments,
        failedPayments,
      ] = await Promise.all([
        prisma.payment.aggregate({
          where: { status: 'succeeded' },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'succeeded',
            createdAt: { gte: firstDayOfMonth },
          },
          _sum: { amount: true },
        }),
        prisma.payment.count({
          where: { status: 'succeeded' },
        }),
        prisma.payment.count({
          where: { status: 'failed' },
        }),
      ]);

      return {
        totalRevenue: Number(totalRevenueResult._sum.amount) || 0,
        monthlyRevenue: Number(monthlyRevenueResult._sum.amount) || 0,
        successfulPayments,
        failedPayments,
      };
    } catch (error) {
      logger.error('Get payment stats error:', error);
      throw error;
    }
  }

  // RAG Sources Management
  async getSources(page = 1, limit = 20, search?: string): Promise<{
    sources: Source[];
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const where = search 
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { rawText: { contains: search, mode: 'insensitive' as const } },
              { tags: { has: search } },
            ],
          }
        : {};

      const [sources, total] = await Promise.all([
        prisma.source.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.source.count({ where }),
      ]);

      return { sources, total };
    } catch (error) {
      logger.error('Get sources error:', error);
      throw error;
    }
  }

  async createSource(data: CreateSourceRequest): Promise<Source> {
    try {
      logger.info("------------------1---------------")
      const source = await prisma.source.create({
        data: {
          title: data.title,
          rawText: data.rawText,
          tags: data.tags,
          isActive: true,
        },
      });
      logger.info("------------------2---------------")

      // Process the source for RAG in the background with better error handling
      setImmediate(async () => {
        try {
          logger.info(`Starting RAG processing for source: ${source.id}`);
          await this.ragService.processSource(source.id);
          logger.info(`Source processed for RAG: ${source.id}`);
        } catch (error) {
          logger.error(`Failed to process source ${source.id} for RAG:`, error);
          // Don't let RAG processing errors crash the entire application
          // Log the error and continue
          if (error instanceof Error) {
            logger.error(`RAG Error details: ${error.message}`);
            logger.error(`RAG Error stack: ${error.stack}`);
          }
        }
      });
      
      logger.info(`Source created: ${source.id}`);
      return source;
    } catch (error) {
      logger.error('Create source error:', error);
      throw error;
    }
  }

  async updateSource(sourceId: string, data: UpdateSourceRequest): Promise<Source> {
    try {
      const source = await prisma.source.update({
        where: { id: sourceId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Reprocess if content changed
      if (data.rawText) {
        setImmediate(async () => {
          try {
            await this.ragService.processSource(source.id);
            logger.info(`Source reprocessed for RAG: ${source.id}`);
          } catch (error) {
            logger.error(`Failed to reprocess source ${source.id} for RAG:`, error);
          }
        });
      }

      logger.info(`Source updated: ${sourceId}`);
      return source;
    } catch (error) {
      logger.error('Update source error:', error);
      throw error;
    }
  }

  async deleteSource(sourceId: string): Promise<void> {
    try {
      await prisma.source.delete({
        where: { id: sourceId },
      });

      logger.info(`Source deleted: ${sourceId}`);
    } catch (error) {
      logger.error('Delete source error:', error);
      throw error;
    }
  }

  async reprocessAllSources(): Promise<void> {
    try {
      await this.ragService.reprocessAllSources();
      logger.info('All sources reprocessed for RAG');
    } catch (error) {
      logger.error('Reprocess all sources error:', error);
      throw error;
    }
  }

  async getSourceStats(): Promise<{
    totalSources: number;
    activeSources: number;
    totalChunks: number;
  }> {
    try {
      const [totalSources, activeSources, totalChunks] = await Promise.all([
        prisma.source.count(),
        prisma.source.count({ where: { isActive: true } }),
        prisma.sourceChunk.count(),
      ]);

      return { totalSources, activeSources, totalChunks };
    } catch (error) {
      logger.error('Get source stats error:', error);
      throw error;
    }
  }

  // Token Usage Management
  async getTokenUsageStats(): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalEmbeddingTokens: number;
    totalTokens: number;
    totalCost: number;
    totalEmbeddingCost: number;
    totalSourceEmbeddings: number;
    totalChatEmbeddings: number;
  }> {
    try {
      const [tokenResults, costResult, embeddingResults, sourceEmbeddingCount] = await Promise.all([
        prisma.chatMessage.aggregate({
          _sum: { tokensInput: true, tokensOutput: true, tokensEmbedding: true },
        }),
        prisma.chatMessage.aggregate({
          _sum: { costUsd: true, embeddingCostUsd: true },
        }),
        prisma.chatMessage.aggregate({
          _count: { tokensEmbedding: true },
          where: { tokensEmbedding: { gt: 0 } },
        }),
        prisma.sourceChunk.count(),
      ]);

      const totalInputTokens = tokenResults._sum.tokensInput || 0;
      const totalOutputTokens = tokenResults._sum.tokensOutput || 0;
      const totalEmbeddingTokens = tokenResults._sum.tokensEmbedding || 0;
      const totalTokens = totalInputTokens + totalOutputTokens + totalEmbeddingTokens;
      const totalCost = Number(costResult._sum.costUsd) || 0;
      const totalEmbeddingCost = Number(costResult._sum.embeddingCostUsd) || 0;
      const totalChatEmbeddings = embeddingResults._count.tokensEmbedding || 0;

      return {
        totalInputTokens,
        totalOutputTokens,
        totalEmbeddingTokens,
        totalTokens,
        totalCost,
        totalEmbeddingCost,
        totalSourceEmbeddings: sourceEmbeddingCount,
        totalChatEmbeddings,
      };
    } catch (error) {
      logger.error('Get token usage stats error:', error);
      throw error;
    }
  }

  async getUserTokenUsage(page = 1, limit = 50): Promise<{
    users: Array<{
      userId: string;
      email: string;
      role: string;
      inputTokens: number;
      outputTokens: number;
      embeddingTokens: number;
      totalTokens: number;
      totalCost: number;
      embeddingCost: number;
      totalConsumptionCost: number;
      messageCount: number;
      avgTokensPerMessage: number;
    }>;
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // Get users with their token usage including embeddings
      const usersWithUsage = await prisma.$queryRaw<Array<{
        user_id: string;
        email: string;
        role: string;
        input_tokens: bigint;
        output_tokens: bigint;
        embedding_tokens: bigint;
        total_cost: number;
        embedding_cost: number;
        message_count: bigint;
      }>>`
        SELECT 
          u.id as user_id,
          u.email,
          u.role,
          COALESCE(SUM(cm.tokens_input), 0) as input_tokens,
          COALESCE(SUM(cm.tokens_output), 0) as output_tokens,
          COALESCE(SUM(cm.tokens_embedding), 0) as embedding_tokens,
          COALESCE(SUM(cm.cost_usd), 0) as total_cost,
          COALESCE(SUM(cm.embedding_cost_usd), 0) as embedding_cost,
          COUNT(cm.id) as message_count
        FROM users u
        LEFT JOIN chat_threads ct ON ct.user_id = u.id
        LEFT JOIN chat_messages cm ON cm.thread_id = ct.id
        GROUP BY u.id, u.email, u.role
        ORDER BY (COALESCE(SUM(cm.cost_usd), 0) + COALESCE(SUM(cm.embedding_cost_usd), 0)) DESC
        LIMIT ${limit} OFFSET ${skip}
      `;

      const totalUsersCount = await prisma.user.count();

      const users = usersWithUsage.map(user => {
        const inputTokens = Number(user.input_tokens);
        const outputTokens = Number(user.output_tokens);
        const embeddingTokens = Number(user.embedding_tokens);
        const totalTokens = inputTokens + outputTokens + embeddingTokens;
        const messageCount = Number(user.message_count);
        const aiCost = Number(user.total_cost);
        const embeddingCost = Number(user.embedding_cost);
        const totalConsumptionCost = aiCost + embeddingCost;

        return {
          userId: user.user_id,
          email: user.email,
          role: user.role,
          inputTokens,
          outputTokens,
          embeddingTokens,
          totalTokens,
          totalCost: aiCost,
          embeddingCost,
          totalConsumptionCost,
          messageCount,
          avgTokensPerMessage: messageCount > 0 ? Math.round(totalTokens / messageCount) : 0,
        };
      });

      return { users, total: totalUsersCount };
    } catch (error) {
      logger.error('Get user token usage error:', error);
      throw error;
    }
  }

  // Time-based analytics
  async getTokenUsageByTimeframe(
    timeframe: 'total' | 'month' | 'day' = 'total',
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalEmbeddingTokens: number;
    totalTokens: number;
    totalCost: number;
    totalEmbeddingCost: number;
    totalConsumptionCost: number;
    messageCount: number;
    period: string;
  }> {
    try {
      let whereClause = {};
      let periodLabel = 'All Time';

      if (timeframe === 'day' && startDate) {
        const selectedDate = new Date(startDate);
        const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const endOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
        whereClause = { createdAt: { gte: startOfDay, lt: endOfDay } };
        periodLabel = startOfDay.toLocaleDateString();
      } else if (timeframe === 'month' && startDate) {
        const selectedDate = new Date(startDate);
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
        whereClause = { createdAt: { gte: startOfMonth, lt: endOfMonth } };
        periodLabel = startOfMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      } else if (startDate && endDate) {
        // Custom date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end day
        whereClause = { createdAt: { gte: start, lte: end } };
        periodLabel = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      } else if (timeframe === 'day') {
        // Default to today if no date specified
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        whereClause = { createdAt: { gte: startOfDay, lt: endOfDay } };
        periodLabel = startOfDay.toLocaleDateString();
      } else if (timeframe === 'month') {
        // Default to current month if no date specified
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        whereClause = { createdAt: { gte: startOfMonth, lt: endOfMonth } };
        periodLabel = startOfMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      }

      const [tokenResults, costResult, embeddingResults] = await Promise.all([
        prisma.chatMessage.aggregate({
          where: whereClause,
          _sum: { tokensInput: true, tokensOutput: true, tokensEmbedding: true },
          _count: { id: true }
        }),
        prisma.chatMessage.aggregate({
          where: whereClause,
          _sum: { costUsd: true, embeddingCostUsd: true },
        }),
        prisma.chatMessage.count({ where: whereClause }),
      ]);

      const totalInputTokens = tokenResults._sum.tokensInput || 0;
      const totalOutputTokens = tokenResults._sum.tokensOutput || 0;
      const totalEmbeddingTokens = tokenResults._sum.tokensEmbedding || 0;
      const totalTokens = totalInputTokens + totalOutputTokens + totalEmbeddingTokens;
      const totalCost = Number(costResult._sum.costUsd) || 0;
      const totalEmbeddingCost = Number(costResult._sum.embeddingCostUsd) || 0;
      const totalConsumptionCost = totalCost + totalEmbeddingCost;
      const messageCount = tokenResults._count.id || 0;

      return {
        totalInputTokens,
        totalOutputTokens,
        totalEmbeddingTokens,
        totalTokens,
        totalCost,
        totalEmbeddingCost,
        totalConsumptionCost,
        messageCount,
        period: periodLabel,
      };
    } catch (error) {
      logger.error('Get token usage by timeframe error:', error);
      throw error;
    }
  }

  async getUserTokenUsageByTimeframe(
    timeframe: 'total' | 'month' | 'day' = 'total',
    page = 1, 
    limit = 50,
    startDate?: string,
    endDate?: string
  ): Promise<{
    users: Array<{
      userId: string;
      email: string;
      role: string;
      inputTokens: number;
      outputTokens: number;
      embeddingTokens: number;
      totalTokens: number;
      totalCost: number;
      embeddingCost: number;
      totalConsumptionCost: number;
      messageCount: number;
      avgTokensPerMessage: number;
    }>;
    total: number;
    period: string;
  }> {
    try {
      const skip = (page - 1) * limit;
      
      let startFilter: Date | null = null;
      let endFilter: Date | null = null;
      let periodLabel = 'All Time';

      if (timeframe === 'day' && startDate) {
        const selectedDate = new Date(startDate);
        startFilter = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        endFilter = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
        periodLabel = startFilter.toLocaleDateString();
      } else if (timeframe === 'month' && startDate) {
        const selectedDate = new Date(startDate);
        startFilter = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endFilter = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
        periodLabel = startFilter.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      } else if (startDate && endDate) {
        // Custom date range
        startFilter = new Date(startDate);
        endFilter = new Date(endDate);
        endFilter.setHours(23, 59, 59, 999);
        periodLabel = `${startFilter.toLocaleDateString()} - ${endFilter.toLocaleDateString()}`;
      } else if (timeframe === 'day') {
        // Default to today
        const now = new Date();
        startFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        periodLabel = startFilter.toLocaleDateString();
      } else if (timeframe === 'month') {
        // Default to current month
        const now = new Date();
        startFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        endFilter = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        periodLabel = startFilter.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      }

      // Build the queries based on whether we have date filters
      let usersWithUsage: Array<{
        user_id: string;
        email: string;
        role: string;
        input_tokens: bigint;
        output_tokens: bigint;
        embedding_tokens: bigint;
        total_cost: number;
        embedding_cost: number;
        message_count: bigint;
      }>;

      let totalUsersCountResult: Array<{ count: bigint }>;

      if (startFilter && endFilter) {
        // With date filters
        usersWithUsage = await prisma.$queryRaw`
          SELECT 
            u.id as user_id,
            u.email,
            u.role,
            COALESCE(SUM(cm.tokens_input), 0) as input_tokens,
            COALESCE(SUM(cm.tokens_output), 0) as output_tokens,
            COALESCE(SUM(cm.tokens_embedding), 0) as embedding_tokens,
            COALESCE(SUM(cm.cost_usd), 0) as total_cost,
            COALESCE(SUM(cm.embedding_cost_usd), 0) as embedding_cost,
            COUNT(cm.id) as message_count
          FROM users u
          LEFT JOIN chat_threads ct ON ct.user_id = u.id
          LEFT JOIN chat_messages cm ON cm.thread_id = ct.id 
            AND cm.created_at >= ${startFilter}
            AND cm.created_at < ${endFilter}
          GROUP BY u.id, u.email, u.role
          HAVING COUNT(cm.id) > 0
          ORDER BY (COALESCE(SUM(cm.cost_usd), 0) + COALESCE(SUM(cm.embedding_cost_usd), 0)) DESC
          LIMIT ${limit} OFFSET ${skip}
        `;

        totalUsersCountResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT u.id) as count
          FROM users u
          LEFT JOIN chat_threads ct ON ct.user_id = u.id
          LEFT JOIN chat_messages cm ON cm.thread_id = ct.id 
            AND cm.created_at >= ${startFilter}
            AND cm.created_at < ${endFilter}
          WHERE cm.id IS NOT NULL
        `;
      } else {
        // Without date filters (total)
        usersWithUsage = await prisma.$queryRaw`
          SELECT 
            u.id as user_id,
            u.email,
            u.role,
            COALESCE(SUM(cm.tokens_input), 0) as input_tokens,
            COALESCE(SUM(cm.tokens_output), 0) as output_tokens,
            COALESCE(SUM(cm.tokens_embedding), 0) as embedding_tokens,
            COALESCE(SUM(cm.cost_usd), 0) as total_cost,
            COALESCE(SUM(cm.embedding_cost_usd), 0) as embedding_cost,
            COUNT(cm.id) as message_count
          FROM users u
          LEFT JOIN chat_threads ct ON ct.user_id = u.id
          LEFT JOIN chat_messages cm ON cm.thread_id = ct.id
          GROUP BY u.id, u.email, u.role
          HAVING COUNT(cm.id) > 0
          ORDER BY (COALESCE(SUM(cm.cost_usd), 0) + COALESCE(SUM(cm.embedding_cost_usd), 0)) DESC
          LIMIT ${limit} OFFSET ${skip}
        `;

        totalUsersCountResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT u.id) as count
          FROM users u
          LEFT JOIN chat_threads ct ON ct.user_id = u.id
          LEFT JOIN chat_messages cm ON cm.thread_id = ct.id
          WHERE cm.id IS NOT NULL
        `;
      }

      const totalUsersCount = Number(totalUsersCountResult[0]?.count || 0);

      const users = usersWithUsage.map(user => {
        const inputTokens = Number(user.input_tokens);
        const outputTokens = Number(user.output_tokens);
        const embeddingTokens = Number(user.embedding_tokens);
        const totalTokens = inputTokens + outputTokens + embeddingTokens;
        const messageCount = Number(user.message_count);
        const aiCost = Number(user.total_cost);
        const embeddingCost = Number(user.embedding_cost);
        const totalConsumptionCost = aiCost + embeddingCost;

        return {
          userId: user.user_id,
          email: user.email,
          role: user.role,
          inputTokens,
          outputTokens,
          embeddingTokens,
          totalTokens,
          totalCost: aiCost,
          embeddingCost,
          totalConsumptionCost,
          messageCount,
          avgTokensPerMessage: messageCount > 0 ? Math.round(totalTokens / messageCount) : 0,
        };
      });

      return { users, total: totalUsersCount, period: periodLabel };
    } catch (error) {
      logger.error('Get user token usage by timeframe error:', error);
      throw error;
    }
  }

  // System Settings Management
  async getSystemSettings(): Promise<Array<{
    id: string;
    key: string;
    value: string;
    type: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    try {
      const settings = await prisma.systemSettings.findMany({
        where: { isActive: true },
        orderBy: { key: 'asc' },
      });

      return settings;
    } catch (error) {
      logger.error('Get system settings error:', error);
      throw error;
    }
  }

  async getSystemSetting(key: string): Promise<{
    id: string;
    key: string;
    value: string;
    type: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key },
      });

      return setting;
    } catch (error) {
      logger.error('Get system setting error:', error);
      throw error;
    }
  }

  async updateSystemSetting(
    key: string,
    value: string,
    type?: string,
    description?: string
  ): Promise<{
    id: string;
    key: string;
    value: string;
    type: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      const updateData: any = { value };
      if (type) updateData.type = type;
      if (description !== undefined) updateData.description = description;

      const setting = await prisma.systemSettings.upsert({
        where: { key },
        update: updateData,
        create: {
          key,
          value,
          type: type || 'text',
          description,
          isActive: true,
        },
      });

      logger.info(`System setting updated: ${key} = ${value}`);
      return setting;
    } catch (error) {
      logger.error('Update system setting error:', error);
      throw error;
    }
  }

  async createSystemSetting(
    key: string,
    value: string,
    type: string = 'text',
    description?: string
  ): Promise<{
    id: string;
    key: string;
    value: string;
    type: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      // Check if setting already exists
      const existingSetting = await prisma.systemSettings.findUnique({
        where: { key },
      });

      if (existingSetting) {
        throw new ValidationError(`System setting with key '${key}' already exists`);
      }

      const setting = await prisma.systemSettings.create({
        data: {
          key,
          value,
          type,
          description,
          isActive: true,
        },
      });

      logger.info(`System setting created: ${key} = ${value}`);
      return setting;
    } catch (error) {
      logger.error('Create system setting error:', error);
      throw error;
    }
  }

  async deleteSystemSetting(key: string): Promise<void> {
    try {
      await prisma.systemSettings.delete({
        where: { key },
      });

      logger.info(`System setting deleted: ${key}`);
    } catch (error) {
      logger.error('Delete system setting error:', error);
      throw error;
    }
  }

  async toggleSystemSetting(key: string, isActive: boolean): Promise<{
    id: string;
    key: string;
    value: string;
    type: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      const setting = await prisma.systemSettings.update({
        where: { key },
        data: { isActive },
      });

      logger.info(`System setting ${isActive ? 'activated' : 'deactivated'}: ${key}`);
      return setting;
    } catch (error) {
      logger.error('Toggle system setting error:', error);
      throw error;
    }
  }
}