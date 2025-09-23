import { ModelPricingService } from './modelPricingService';
import { TaskQueueService } from './taskQueueService';
import { schedulerService } from './SchedulerService';
import logger from '../config/logger';

export class InitializationService {
  private static instance: InitializationService;
  private modelPricingService: ModelPricingService;
  private taskQueueService: TaskQueueService;
  private isInitialized = false;

  private constructor() {
    this.modelPricingService = new ModelPricingService();
    this.taskQueueService = new TaskQueueService();
  }

  static getInstance(): InitializationService {
    if (!InitializationService.instance) {
      InitializationService.instance = new InitializationService();
    }
    return InitializationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Services already initialized');
      return;
    }

    try {
      logger.info('Initializing application services...');

      // Initialize model pricing data
      await this.modelPricingService.initializePricing();
      logger.info('✅ Model pricing service initialized');

      // Warm up pricing cache
      await this.modelPricingService.warmUpCache();
      logger.info('✅ Pricing cache warmed up');

      // Start task queue processing
      this.taskQueueService.startProcessing(3000); // Process every 3 seconds
      logger.info('✅ Task queue processing started');

      // Set up periodic cleanup
      this.setupPeriodicCleanup();
      logger.info('✅ Periodic cleanup scheduled');

      // Initialize subscription scheduler
      schedulerService.init();
      logger.info('✅ Subscription scheduler initialized');

      this.isInitialized = true;
      logger.info('🚀 All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down services...');

      // Stop task queue processing
      this.taskQueueService.stopProcessing();
      logger.info('✅ Task queue processing stopped');

      // Shutdown scheduler
      schedulerService.shutdown();
      logger.info('✅ Subscription scheduler stopped');

      this.isInitialized = false;
      logger.info('🛑 Services shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }

  private setupPeriodicCleanup(): void {
    // Clean up pricing cache every 10 minutes
    setInterval(() => {
      this.modelPricingService.clearExpiredCache();
    }, 10 * 60 * 1000);

    // Clean up completed tasks daily at 2 AM
    const scheduleDaily = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0); // 2 AM

      const msUntilTomorrow = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        this.taskQueueService.cleanupCompletedTasks(7); // Keep tasks for 7 days
        setInterval(() => {
          this.taskQueueService.cleanupCompletedTasks(7);
        }, 24 * 60 * 60 * 1000); // Repeat daily
      }, msUntilTomorrow);
    };

    scheduleDaily();
  }

  getModelPricingService(): ModelPricingService {
    return this.modelPricingService;
  }

  getTaskQueueService(): TaskQueueService {
    return this.taskQueueService;
  }

  async getSystemStats(): Promise<{
    pricing: {
      totalModels: number;
      cachedModels: number;
    };
    taskQueue: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
  }> {
    try {
      const [allPricing, queueStats] = await Promise.all([
        this.modelPricingService.getAllActivePricing(),
        this.taskQueueService.getQueueStats(),
      ]);

      return {
        pricing: {
          totalModels: allPricing.length,
          cachedModels: 0, // This would require exposing cache size from pricing service
        },
        taskQueue: queueStats,
      };
    } catch (error) {
      logger.error('Failed to get system stats:', error);
      return {
        pricing: { totalModels: 0, cachedModels: 0 },
        taskQueue: { pending: 0, processing: 0, completed: 0, failed: 0 },
      };
    }
  }
}