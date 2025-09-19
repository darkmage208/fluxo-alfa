import { prisma } from '../config/database';
import logger from '../config/logger';

export interface TaskPayload {
  [key: string]: any;
}

export interface QueuedTask {
  id: string;
  taskType: string;
  status: string;
  priority: number;
  payload: TaskPayload;
  result?: any;
  errorMessage?: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export type TaskHandler = (payload: TaskPayload) => Promise<any>;

export class TaskQueueService {
  private handlers: Map<string, TaskHandler> = new Map();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    // Register built-in task handlers
    this.registerHandler('summary_generation', this.handleSummaryGeneration.bind(this));
    this.registerHandler('analytics_update', this.handleAnalyticsUpdate.bind(this));
    this.registerHandler('usage_aggregation', this.handleUsageAggregation.bind(this));
  }

  registerHandler(taskType: string, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
    logger.info(`Registered task handler for: ${taskType}`);
  }

  async enqueueTask(
    taskType: string,
    payload: TaskPayload,
    options: {
      priority?: number;
      scheduledAt?: Date;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    try {
      const task = await prisma.taskQueue.create({
        data: {
          taskType,
          payload,
          priority: options.priority || 1,
          scheduledAt: options.scheduledAt || new Date(),
          maxRetries: options.maxRetries || 3,
        },
      });

      logger.debug(`Enqueued task: ${taskType} with ID: ${task.id}`);
      return task.id;
    } catch (error) {
      logger.error('Failed to enqueue task:', error);
      throw error;
    }
  }

  async enqueueHighPriorityTask(taskType: string, payload: TaskPayload): Promise<string> {
    return this.enqueueTask(taskType, payload, { priority: 5 });
  }

  async enqueueBulkTasks(
    tasks: Array<{
      taskType: string;
      payload: TaskPayload;
      priority?: number;
      scheduledAt?: Date;
    }>
  ): Promise<string[]> {
    try {
      const createdTasks = await prisma.taskQueue.createMany({
        data: tasks.map(task => ({
          taskType: task.taskType,
          payload: task.payload,
          priority: task.priority || 1,
          scheduledAt: task.scheduledAt || new Date(),
        })),
      });

      logger.info(`Enqueued ${tasks.length} bulk tasks`);
      return []; // Prisma createMany doesn't return IDs
    } catch (error) {
      logger.error('Failed to enqueue bulk tasks:', error);
      throw error;
    }
  }

  startProcessing(intervalMs: number = 5000): void {
    if (this.isProcessing) {
      logger.warn('Task processing already started');
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processNextTask().catch(error => {
        logger.error('Error processing task:', error);
      });
    }, intervalMs);

    logger.info(`Task queue processing started with ${intervalMs}ms interval`);
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isProcessing = false;
    logger.info('Task queue processing stopped');
  }

  private async processNextTask(): Promise<void> {
    try {
      // Get next pending task with highest priority
      const task = await prisma.taskQueue.findFirst({
        where: {
          status: 'pending',
          scheduledAt: { lte: new Date() },
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledAt: 'asc' },
        ],
      });

      if (!task) {
        return; // No tasks to process
      }

      await this.executeTask(task);
    } catch (error) {
      logger.error('Error in processNextTask:', error);
    }
  }

  private async executeTask(task: QueuedTask): Promise<void> {
    const handler = this.handlers.get(task.taskType);
    if (!handler) {
      await this.markTaskFailed(task.id, `No handler found for task type: ${task.taskType}`);
      return;
    }

    try {
      // Mark task as processing
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });

      logger.debug(`Processing task: ${task.taskType} (${task.id})`);

      // Execute the task
      const result = await handler(task.payload);

      // Mark task as completed
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          result,
          completedAt: new Date(),
        },
      });

      logger.debug(`Completed task: ${task.taskType} (${task.id})`);
    } catch (error) {
      logger.error(`Task execution failed: ${task.taskType} (${task.id}):`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newRetryCount = task.retryCount + 1;

      if (newRetryCount <= task.maxRetries) {
        // Retry task with exponential backoff
        const retryDelay = Math.pow(2, newRetryCount) * 1000; // 2^n seconds
        const scheduledAt = new Date(Date.now() + retryDelay);

        await prisma.taskQueue.update({
          where: { id: task.id },
          data: {
            status: 'pending',
            retryCount: newRetryCount,
            scheduledAt,
            errorMessage,
            startedAt: null,
          },
        });

        logger.info(`Scheduled retry ${newRetryCount}/${task.maxRetries} for task ${task.id} in ${retryDelay}ms`);
      } else {
        // Max retries exceeded, mark as failed
        await this.markTaskFailed(task.id, errorMessage);
      }
    }
  }

  private async markTaskFailed(taskId: string, errorMessage: string): Promise<void> {
    await prisma.taskQueue.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    });

    logger.error(`Task ${taskId} failed permanently: ${errorMessage}`);
  }

  async getTaskStatus(taskId: string): Promise<QueuedTask | null> {
    try {
      const task = await prisma.taskQueue.findUnique({
        where: { id: taskId },
      });

      return task as QueuedTask | null;
    } catch (error) {
      logger.error('Failed to get task status:', error);
      return null;
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const [pending, processing, completed, failed] = await Promise.all([
        prisma.taskQueue.count({ where: { status: 'pending' } }),
        prisma.taskQueue.count({ where: { status: 'processing' } }),
        prisma.taskQueue.count({ where: { status: 'completed' } }),
        prisma.taskQueue.count({ where: { status: 'failed' } }),
      ]);

      return { pending, processing, completed, failed };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }
  }

  async cleanupCompletedTasks(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await prisma.taskQueue.deleteMany({
        where: {
          status: { in: ['completed', 'failed'] },
          completedAt: { lt: cutoffDate },
        },
      });

      logger.info(`Cleaned up ${result.count} completed tasks older than ${olderThanDays} days`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup completed tasks:', error);
      return 0;
    }
  }

  // Default task handlers
  private async handleSummaryGeneration(payload: TaskPayload): Promise<any> {
    // This will be implemented to generate thread summaries asynchronously
    const { threadId, messages, userId } = payload;

    // Import here to avoid circular dependencies
    const { OpenAIService } = await import('./openaiService');
    const { AnalyticsService } = await import('./analyticsService');

    const openaiService = new OpenAIService();
    const analyticsService = new AnalyticsService();

    if (!threadId || !messages || messages.length < 4) {
      throw new Error('Invalid summary generation payload');
    }

    // Generate summary
    const conversationText = messages
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const summaryPrompt = [
      {
        role: 'system',
        content: 'You are a helpful assistant that creates concise summaries of conversations. Create a summary that captures the main topics, key decisions, and important context from this conversation. Keep it under 200 words and focus on information that would be useful for continuing the conversation later.'
      },
      {
        role: 'user',
        content: `Please summarize this conversation:\n\n${conversationText}`
      }
    ];

    const summaryResult = await openaiService.generateSummary(summaryPrompt);

    // Update thread with summary
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { summary: summaryResult.summary },
    });

    // Track analytics if userId provided
    if (userId) {
      await analyticsService.updateUserUsageAggregations(userId, {
        tokensInput: summaryResult.tokensInput,
        tokensOutput: summaryResult.tokensOutput,
        tokensEmbedding: 0,
        costUsd: summaryResult.cost,
        embeddingCostUsd: 0,
        createdAt: new Date(),
        isNewThread: false,
      });
    }

    return { summary: summaryResult.summary, cost: summaryResult.cost };
  }

  private async handleAnalyticsUpdate(payload: TaskPayload): Promise<any> {
    // Handle analytics updates asynchronously
    const { userId, data, type } = payload;

    const { AnalyticsService } = await import('./analyticsService');
    const analyticsService = new AnalyticsService();

    switch (type) {
      case 'user_usage':
        await analyticsService.updateUserUsageAggregations(userId, data);
        break;
      case 'system_usage':
        await analyticsService.updateSystemUsageAggregations(data);
        break;
      default:
        throw new Error(`Unknown analytics update type: ${type}`);
    }

    return { success: true };
  }

  private async handleUsageAggregation(payload: TaskPayload): Promise<any> {
    // Handle usage aggregation for reporting
    const { period, date } = payload;

    // This could trigger aggregation of daily/monthly/yearly usage
    // for performance optimization

    return { success: true, period, date };
  }
}