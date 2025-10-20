import { prisma } from '../config/database';
import { OpenAIService } from './openaiService';
import { RAGService } from './ragService';
import { AnalyticsService } from './analyticsService';
import { TaskQueueService } from './taskQueueService';
import { SettingsService } from './settingsService';
import logger from '../config/logger';
import bcrypt from 'bcryptjs';
import { 
  NotFoundError, 
  ValidationError, 
  SubscriptionError,
  createSuccessResponse,
  slugify,
  DEFAULT_LIMITS 
} from '@fluxo/shared';
import type { ChatThread, ChatMessage, CreateMessageRequest } from '@fluxo/shared';

export class ChatService {
  private openaiService: OpenAIService;
  private ragService: RAGService;
  private taskQueue: TaskQueueService;
  private settingsService: SettingsService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.ragService = new RAGService();
    this.taskQueue = new TaskQueueService();
    this.settingsService = new SettingsService();
  }

  async createThread(userId: string, title?: string): Promise<ChatThread> {
    try {
      const thread = await prisma.chatThread.create({
        data: {
          userId,
          title: title || 'New Chat',
        },
      });

      logger.info(`Chat thread created: ${thread.id} for user: ${userId}`);
      return thread;
    } catch (error) {
      logger.error('Create thread error:', error);
      throw error;
    }
  }

  async getUserThreads(userId: string, page = 1, limit = 20): Promise<{
    threads: ChatThread[];
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [threads, total] = await Promise.all([
        prisma.chatThread.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            userId: true,
            title: true,
            summary: true,
            passwordHash: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.chatThread.count({
          where: { userId },
        }),
      ]);

      // Transform threads to include hasPassword field and exclude passwordHash
      const transformedThreads = threads.map(thread => ({
        id: thread.id,
        userId: thread.userId,
        title: thread.title,
        summary: thread.summary,
        hasPassword: !!thread.passwordHash,
        createdAt: thread.createdAt,
      }));

      return { threads: transformedThreads, total };
    } catch (error) {
      logger.error('Get user threads error:', error);
      throw error;
    }
  }

  async getThreadMessages(
    threadId: string, 
    userId: string, 
    page: number = 1, 
    limit: number = 50,
    password?: string
  ): Promise<{ messages: any[]; total: number; hasMore: boolean; needsPassword?: boolean }> {
    try {
      // Verify thread belongs to user and get password info
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
        select: { passwordHash: true },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      // Check if thread requires password
      if (thread.passwordHash) {
        if (!password) {
          return {
            messages: [],
            total: 0,
            hasMore: false,
            needsPassword: true,
          };
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, thread.passwordHash);
        if (!isPasswordValid) {
          throw new ValidationError('Invalid password');
        }
      }

      // Get total count
      const total = await prisma.chatMessage.count({
        where: { threadId },
      });

      // Calculate offset and get messages in reverse chronological order for pagination
      // (most recent first for infinite scroll from bottom)
      const offset = (page - 1) * limit;
      const messages = await prisma.chatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'desc' }, // Most recent first
        skip: offset,
        take: limit,
      });

      // Reverse to get chronological order for display
      const chronologicalMessages = messages.reverse();

      return {
        messages: chronologicalMessages,
        total,
        hasMore: offset + messages.length < total,
      };
    } catch (error) {
      logger.error('Get thread messages error:', error);
      throw error;
    }
  }

  async deleteThread(threadId: string, userId: string): Promise<void> {
    try {
      // Verify thread belongs to user
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      await prisma.chatThread.delete({
        where: { id: threadId },
      });

      logger.info(`Chat thread deleted: ${threadId}`);
    } catch (error) {
      logger.error('Delete thread error:', error);
      throw error;
    }
  }

  async renameThread(threadId: string, userId: string, title: string): Promise<ChatThread> {
    try {
      // Verify thread belongs to user
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      const updatedThread = await prisma.chatThread.update({
        where: { id: threadId },
        data: { title },
      });

      logger.info(`Chat thread renamed: ${threadId} to "${title}"`);
      return updatedThread;
    } catch (error) {
      logger.error('Rename thread error:', error);
      throw error;
    }
  }

  async *streamMessage(request: CreateMessageRequest, userId: string, password?: string) {
    try {
      // Check user's daily usage and plan limits
      await this.checkUsageLimits(userId);

      // Verify thread belongs to user and check password if needed
      const thread = await prisma.chatThread.findFirst({
        where: { id: request.threadId, userId },
        select: { id: true, title: true, summary: true, passwordHash: true },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      // Check password protection
      if (thread.passwordHash) {
        if (!password) {
          throw new ValidationError('Thread is password protected');
        }

        const isPasswordValid = await bcrypt.compare(password, thread.passwordHash);
        if (!isPasswordValid) {
          throw new ValidationError('Invalid password');
        }
      }

      // Get conversation history (limit to last 5 messages for AI input)
      const previousMessages = await prisma.chatMessage.findMany({
        where: { threadId: request.threadId },
        orderBy: { createdAt: 'desc' },
        take: 10, // Get last 5 pairs (user + assistant)
      });
      
      // Reverse to get chronological order
      previousMessages.reverse();

      // Get RAG context with embedding tracking
      const ragResult = await this.ragService.searchRelevantContext(request.content);

      // Save user message with embedding tracking
      const userMessage = await prisma.chatMessage.create({
        data: {
          threadId: request.threadId,
          role: 'user',
          content: request.content,
          tokensEmbedding: ragResult.embeddingTokens,
          embeddingCostUsd: ragResult.embeddingCost,
        },
      });

      // Update embedding analytics immediately for user message
      const analyticsService = new AnalyticsService();

      try {
        await analyticsService.updateUserUsageAggregations(userId, {
          tokensInput: 0,
          tokensOutput: 0,
          tokensEmbedding: ragResult.embeddingTokens,
          costUsd: 0,
          embeddingCostUsd: Number(ragResult.embeddingCost),
          createdAt: userMessage.createdAt,
          isNewThread: previousMessages.length === 0,
        });
      } catch (error) {
        logger.error('Failed to update user analytics for embedding:', error);
      }

      // Update thread title if it's the first message and thread has default title
      if (previousMessages.length === 0 && thread.title === 'New Chat') {
        const title = this.generateThreadTitle(request.content);
        await prisma.chatThread.update({
          where: { id: request.threadId },
          data: { title },
        });
      }

      // Prepare messages for AI - include thread summary for context
      const contextMessages = [];
      
      // Add thread summary if available
      if (thread.summary && previousMessages.length > 0) {
        contextMessages.push({
          role: 'system',
          content: `Previous conversation summary: ${thread.summary}`
        });
      }
      
      // Add recent conversation history (last 5 messages or pairs)
      const recentMessages = previousMessages.slice(-10).map((m: any) => ({
        role: m.role,
        content: m.content
      }));
      
      contextMessages.push(...recentMessages);
      contextMessages.push({ role: 'user', content: request.content });

      // Stream AI response
      let assistantMessage: any = null;
      let fullResponse = '';

      for await (const chunk of this.openaiService.streamChatCompletion(contextMessages, ragResult.context)) {
        if (chunk.finished) {
          // Save assistant message with final token counts and cost
          assistantMessage = await prisma.chatMessage.create({
            data: {
              threadId: request.threadId,
              role: 'assistant',
              content: chunk.fullResponse,
              tokensInput: chunk.tokensInput,
              tokensOutput: chunk.tokensOutput,
              costUsd: chunk.cost,
            },
          });

          // Update analytics immediately for real-time statistics
          const analyticsService = new AnalyticsService();

          await Promise.all([
            // Immediate analytics updates for real-time dashboard
            analyticsService.updateUserUsageAggregations(userId, {
              tokensInput: chunk.tokensInput,
              tokensOutput: chunk.tokensOutput,
              tokensEmbedding: ragResult.embeddingTokens,
              costUsd: Number(chunk.cost),
              embeddingCostUsd: Number(ragResult.embeddingCost),
              createdAt: assistantMessage.createdAt,
              isNewThread: previousMessages.length === 0,
            }),

            analyticsService.updateSystemUsageAggregations({
              tokensInput: chunk.tokensInput,
              tokensOutput: chunk.tokensOutput,
              tokensEmbedding: ragResult.embeddingTokens,
              costUsd: Number(chunk.cost),
              embeddingCostUsd: Number(ragResult.embeddingCost),
              createdAt: assistantMessage.createdAt,
              isNewThread: previousMessages.length === 0,
            }),

            // Update daily usage (legacy method - can be removed later)
            this.updateDailyUsage(userId),
          ]);

          // Still queue tasks for backup/redundancy (can be removed if not needed)
          this.taskQueue.enqueueTask('analytics_update', {
            userId,
            data: {
              tokensInput: chunk.tokensInput,
              tokensOutput: chunk.tokensOutput,
              tokensEmbedding: ragResult.embeddingTokens,
              costUsd: Number(chunk.cost),
              embeddingCostUsd: Number(ragResult.embeddingCost),
              createdAt: assistantMessage.createdAt,
              isNewThread: previousMessages.length === 0,
            },
            type: 'user_usage'
          }).catch(error => {
            logger.error('Failed to queue user analytics update:', error);
          });

          // Queue thread summary generation asynchronously
          this.taskQueue.enqueueTask('summary_generation', {
            threadId: request.threadId,
            messages: [...previousMessages, userMessage, assistantMessage],
            userId
          }).catch(error => {
            logger.error('Failed to queue summary generation:', error);
          });

          yield {
            type: 'complete' as const,
            content: chunk.fullResponse,
            messageId: assistantMessage.id,
          };
        } else {
          fullResponse = chunk.fullResponse;
          yield {
            type: 'chunk' as const,
            content: chunk.content,
          };
        }
      }

      logger.info(`Message processed for thread: ${request.threadId}`);

    } catch (error) {
      logger.error('Stream message error:', error);
      yield {
        type: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async checkUsageLimits(userId: string): Promise<void> {
    // Get user subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    // Handle users without subscription (treat as free users)
    if (!subscription) {
      // For users without subscription record, apply free user limits from database settings
      const freeMessageLimit = await this.settingsService.getFreeMessageLimit();
      const today = new Date().toISOString().split('T')[0];

      const usage = await prisma.dailyUsage.findUnique({
        where: {
          userId_date: {
            userId,
            date: new Date(today),
          },
        },
      });

      const todayChats = usage?.chatsCount || 0;

      if (todayChats >= freeMessageLimit) {
        throw new SubscriptionError(`Daily chat limit reached (${freeMessageLimit} messages per day)`);
      }
      return;
    }

    // For users with subscription: check plan-based limits ONLY
    // Free users: use dynamic database settings
    if (subscription.planId === 'free') {
      const freeMessageLimit = await this.settingsService.getFreeMessageLimit();
      const today = new Date().toISOString().split('T')[0];

      const usage = await prisma.dailyUsage.findUnique({
        where: {
          userId_date: {
            userId,
            date: new Date(today),
          },
        },
      });

      const todayChats = usage?.chatsCount || 0;

      if (todayChats >= freeMessageLimit) {
        throw new SubscriptionError(`Daily chat limit reached (${freeMessageLimit} messages per day)`);
      }
    } else if (subscription.planId === 'pro') {
      // Pro users: check plan limits if they exist (e.g., monthly caps)
      if (subscription.plan && subscription.plan.dailyChatLimit !== null) {
        const today = new Date().toISOString().split('T')[0];

        const usage = await prisma.dailyUsage.findUnique({
          where: {
            userId_date: {
              userId,
              date: new Date(today),
            },
          },
        });

        const todayChats = usage?.chatsCount || 0;

        if (todayChats >= subscription.plan.dailyChatLimit) {
          throw new SubscriptionError(`Daily chat limit reached`);
        }
      }
      // If no daily limit set for Pro, they have unlimited access
    }

    // NOTE: We do NOT check subscription status for messaging
    // Per requirements: messaging is only affected by plan limits (daily/monthly caps)
    // Free users: limited by free token count from database settings
    // Pro users: limited by plan caps (if any) - typically unlimited
    // Subscription status (pending, active, etc.) does NOT affect messaging ability
  }

  private async updateDailyUsage(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await prisma.dailyUsage.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        chatsCount: {
          increment: 1,
        },
        messagesCount: {
          increment: 2, // One user message + one assistant message
        },
      },
      create: {
        userId,
        date: today,
        chatsCount: 1,
        messagesCount: 2,
        tokensInput: 0,
        tokensOutput: 0,
        tokensEmbedding: 0,
        costUsd: 0,
        embeddingCostUsd: 0,
      },
    });
  }

  // Thread summary is now handled asynchronously via task queue
  // The updateThreadSummary method has been moved to TaskQueueService.handleSummaryGeneration

  private generateThreadTitle(firstMessage: string): string {
    // Generate a short title from the first message
    const words = firstMessage.split(' ').slice(0, 6);
    let title = words.join(' ');
    
    if (firstMessage.split(' ').length > 6) {
      title += '...';
    }
    
    return title.length > DEFAULT_LIMITS.MAX_THREAD_TITLE_LENGTH 
      ? title.substring(0, DEFAULT_LIMITS.MAX_THREAD_TITLE_LENGTH - 3) + '...'
      : title;
  }

  async getUserChatStats(userId: string): Promise<{
    totalThreads: number;
    totalMessages: number;
    todayMessages: number;
    totalCost: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalThreads, totalMessages, todayMessages, costResult] = await Promise.all([
        prisma.chatThread.count({
          where: { userId },
        }),
        prisma.chatMessage.count({
          where: {
            thread: { userId },
          },
        }),
        prisma.chatMessage.count({
          where: {
            thread: { userId },
            createdAt: { gte: today },
          },
        }),
        prisma.chatMessage.aggregate({
          where: {
            thread: { userId },
          },
          _sum: {
            costUsd: true,
          },
        }),
      ]);

      return {
        totalThreads,
        totalMessages,
        todayMessages,
        totalCost: Number(costResult._sum.costUsd) || 0,
      };
    } catch (error) {
      logger.error('Get user chat stats error:', error);
      throw error;
    }
  }

  // Password Protection Methods
  async setThreadPassword(threadId: string, userId: string, password: string): Promise<void> {
    try {
      // Verify thread belongs to user
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 12);

      // Update thread with password hash
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { passwordHash },
      });

      logger.info(`Password set for thread ${threadId}`);
    } catch (error) {
      logger.error('Set thread password error:', error);
      throw error;
    }
  }

  async verifyThreadPassword(threadId: string, userId: string, password: string): Promise<boolean> {
    try {
      // Get thread with password hash
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
        select: { passwordHash: true },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      // If no password is set, allow access
      if (!thread.passwordHash) {
        return true;
      }

      // Verify password
      const isValid = await bcrypt.compare(password, thread.passwordHash);
      return isValid;
    } catch (error) {
      logger.error('Verify thread password error:', error);
      throw error;
    }
  }

  async updateThreadPassword(
    threadId: string, 
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    try {
      // Get thread with password hash
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
        select: { passwordHash: true },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      if (!thread.passwordHash) {
        throw new ValidationError('Thread does not have a password set');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, thread.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update thread with new password hash
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { passwordHash: newPasswordHash },
      });

      logger.info(`Password updated for thread ${threadId}`);
    } catch (error) {
      logger.error('Update thread password error:', error);
      throw error;
    }
  }

  async deleteThreadPassword(threadId: string, userId: string, currentPassword: string): Promise<void> {
    try {
      // Get thread with password hash
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
        select: { passwordHash: true },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      if (!thread.passwordHash) {
        throw new ValidationError('Thread does not have a password set');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, thread.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Remove password hash
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { passwordHash: null },
      });

      logger.info(`Password removed from thread ${threadId}`);
    } catch (error) {
      logger.error('Delete thread password error:', error);
      throw error;
    }
  }
}