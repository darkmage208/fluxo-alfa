import { prisma } from '../config/database';
import { RAGService } from './ragService';
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

  constructor() {
    this.ragService = new RAGService();
  }

  async getOverviewMetrics(): Promise<AdminMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        activeUsers,
        totalSubscriptions,
        activeSubscriptions,
        totalChats,
        totalTokensResult,
        totalCostResult,
        dailyActiveUsersResult,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.subscription.count(),
        prisma.subscription.count({ where: { status: 'active' } }),
        prisma.chatMessage.count(),
        prisma.chatMessage.aggregate({
          _sum: { tokensInput: true, tokensOutput: true },
        }),
        prisma.chatMessage.aggregate({
          _sum: { costUsd: true },
        }),
        prisma.chatMessage.findMany({
          where: {
            createdAt: { gte: today },
          },
          distinct: ['threadId'],
          include: { thread: { select: { userId: true } } },
        }),
      ]);

      const totalTokens = (totalTokensResult._sum.tokensInput || 0) + (totalTokensResult._sum.tokensOutput || 0);
      const totalCost = Number(totalCostResult._sum.costUsd) || 0;
      const dailyActiveUsers = new Set(dailyActiveUsersResult.map(msg => msg.thread.userId)).size;

      return {
        totalUsers,
        activeUsers,
        totalSubscriptions,
        activeSubscriptions,
        totalChats,
        totalTokens,
        totalCost,
        dailyActiveUsers,
      };
    } catch (error) {
      logger.error('Get overview metrics error:', error);
      throw error;
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

        return {
          userId: user.user_id,
          email: user.email,
          role: user.role,
          inputTokens,
          outputTokens,
          embeddingTokens,
          totalTokens,
          totalCost: Number(user.total_cost),
          embeddingCost: Number(user.embedding_cost),
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
}