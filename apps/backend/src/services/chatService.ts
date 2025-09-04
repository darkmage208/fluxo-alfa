import { prisma } from '../config/database';
import { OpenAIService } from './openaiService';
import { RAGService } from './ragService';
import logger from '../config/logger';
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

  constructor() {
    this.openaiService = new OpenAIService();
    this.ragService = new RAGService();
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
        }),
        prisma.chatThread.count({
          where: { userId },
        }),
      ]);

      return { threads, total };
    } catch (error) {
      logger.error('Get user threads error:', error);
      throw error;
    }
  }

  async getThreadMessages(threadId: string, userId: string): Promise<ChatMessage[]> {
    try {
      // Verify thread belongs to user
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      const messages = await prisma.chatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'asc' },
      });

      return messages;
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

  async *streamMessage(request: CreateMessageRequest, userId: string) {
    try {
      // Check user's daily usage and plan limits
      await this.checkUsageLimits(userId);

      // Verify thread belongs to user
      const thread = await prisma.chatThread.findFirst({
        where: { id: request.threadId, userId },
      });

      if (!thread) {
        throw new NotFoundError('Thread not found');
      }

      // Get conversation history
      const previousMessages = await prisma.chatMessage.findMany({
        where: { threadId: request.threadId },
        orderBy: { createdAt: 'asc' },
        take: 20, // Limit context window
      });

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

      // Update thread title if it's the first message
      if (previousMessages.length === 0) {
        const title = this.generateThreadTitle(request.content);
        await prisma.chatThread.update({
          where: { id: request.threadId },
          data: { title },
        });
      }

      // Prepare messages for AI
      const messages = [
        ...previousMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: request.content }
      ];

      // Stream AI response
      let assistantMessage: ChatMessage | null = null;
      let fullResponse = '';

      for await (const chunk of this.openaiService.streamChatCompletion(messages, ragResult.context)) {
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

          // Update daily usage
          await this.updateDailyUsage(userId);

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

    if (!subscription) {
      throw new SubscriptionError('No subscription found');
    }

    // Check if plan has daily limits
    if (subscription.plan.dailyChatLimit !== null) {
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
        throw new SubscriptionError(`Daily chat limit of ${subscription.plan.dailyChatLimit} reached. Upgrade to Pro for unlimited chats.`);
      }
    }

    // Check if subscription is active (for pro users)
    if (subscription.planId === 'pro' && subscription.status !== 'active') {
      throw new SubscriptionError('Subscription is not active');
    }
  }

  private async updateDailyUsage(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await prisma.dailyUsage.upsert({
      where: {
        userId_date: {
          userId,
          date: new Date(today),
        },
      },
      update: {
        chatsCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        date: new Date(today),
        chatsCount: 1,
      },
    });
  }

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
}