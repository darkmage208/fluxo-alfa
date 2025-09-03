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
          distinct: ['thread'],
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
      const source = await prisma.source.create({
        data: {
          title: data.title,
          rawText: data.rawText,
          tags: data.tags,
          isActive: true,
        },
      });

      // Process the source for RAG in the background
      setImmediate(async () => {
        try {
          await this.ragService.processSource(source.id);
          logger.info(`Source processed for RAG: ${source.id}`);
        } catch (error) {
          logger.error(`Failed to process source ${source.id} for RAG:`, error);
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
}