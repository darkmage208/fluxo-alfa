import cron from 'node-cron';
import logger from '../config/logger';
import { UnifiedBillingService } from './UnifiedBillingService';

export class SchedulerService {
  private billingService: UnifiedBillingService;
  private isInitialized = false;

  constructor() {
    this.billingService = new UnifiedBillingService();
  }

  init(): void {
    if (this.isInitialized) {
      logger.warn('SchedulerService already initialized');
      return;
    }

    logger.info('Initializing scheduled jobs...');

    // Check expired subscriptions every hour
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running scheduled subscription expiration check');
        await this.billingService.checkExpiredSubscriptions();
        logger.info('Scheduled subscription expiration check completed');
      } catch (error) {
        logger.error('Scheduled subscription expiration check failed:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    // Check critical expiring subscriptions daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('Running daily subscription expiration alerts');
        await this.checkExpiringSubscriptions();
        logger.info('Daily subscription expiration alerts completed');
      } catch (error) {
        logger.error('Daily subscription expiration alerts failed:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    // Cleanup old payment records monthly (1st day of month at 2 AM)
    cron.schedule('0 2 1 * *', async () => {
      try {
        logger.info('Running monthly cleanup of old payment records');
        await this.cleanupOldPaymentRecords();
        logger.info('Monthly cleanup completed');
      } catch (error) {
        logger.error('Monthly cleanup failed:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.isInitialized = true;
    logger.info('Scheduled jobs initialized successfully');
  }

  private async checkExpiringSubscriptions(): Promise<void> {
    try {
      // This would typically send email notifications or alerts
      // For now, just log the expiring subscriptions

      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

      // Import prisma here to avoid circular dependencies
      const { prisma } = await import('../config/database');

      // Find subscriptions expiring in 3 days
      const expiringIn3Days = await prisma.subscription.findMany({
        where: {
          AND: [
            { status: 'active' },
            { planId: { not: 'free' } },
            {
              currentPeriodEnd: {
                gte: now,
                lte: threeDaysFromNow,
              }
            }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            }
          }
        }
      });

      // Find subscriptions expiring in 7 days
      const expiringIn7Days = await prisma.subscription.findMany({
        where: {
          AND: [
            { status: 'active' },
            { planId: { not: 'free' } },
            {
              currentPeriodEnd: {
                gte: threeDaysFromNow,
                lte: sevenDaysFromNow,
              }
            }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            }
          }
        }
      });

      logger.info(`Found ${expiringIn3Days.length} subscriptions expiring in 3 days`);
      logger.info(`Found ${expiringIn7Days.length} subscriptions expiring in 7 days`);

      // Log detailed information for monitoring
      for (const sub of expiringIn3Days) {
        logger.warn(`Subscription ${sub.id} for user ${sub.user.email} expires in 3 days (${sub.currentPeriodEnd})`);
      }

      for (const sub of expiringIn7Days) {
        logger.info(`Subscription ${sub.id} for user ${sub.user.email} expires in 7 days (${sub.currentPeriodEnd})`);
      }

      // TODO: Implement email notifications here
      // await this.sendExpirationEmails(expiringIn3Days, expiringIn7Days);

    } catch (error) {
      logger.error('Error checking expiring subscriptions:', error);
      throw error;
    }
  }

  private async cleanupOldPaymentRecords(): Promise<void> {
    try {
      const { prisma } = await import('../config/database');

      // Delete payment records older than 1 year, except for successful payments
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const deletedRecords = await prisma.payment.deleteMany({
        where: {
          AND: [
            {
              createdAt: {
                lt: oneYearAgo,
              }
            },
            {
              status: {
                in: ['failed', 'canceled', 'checkout_created'],
              }
            },
            {
              type: {
                not: 'system_event', // Keep system events for auditing
              }
            }
          ]
        }
      });

      logger.info(`Cleaned up ${deletedRecords.count} old payment records`);
    } catch (error) {
      logger.error('Error cleaning up old payment records:', error);
      throw error;
    }
  }

  // Manual method to trigger expiration check
  async triggerExpirationCheck(): Promise<void> {
    try {
      logger.info('Manual trigger: Running subscription expiration check');
      await this.billingService.checkExpiredSubscriptions();
      logger.info('Manual subscription expiration check completed');
    } catch (error) {
      logger.error('Manual subscription expiration check failed:', error);
      throw error;
    }
  }

  // Get scheduled job status
  getStatus(): { initialized: boolean; jobs: string[] } {
    return {
      initialized: this.isInitialized,
      jobs: [
        'Subscription expiration check - Every hour',
        'Expiration alerts - Daily at 9 AM (America/Sao_Paulo)',
        'Payment records cleanup - Monthly on 1st at 2 AM (America/Sao_Paulo)',
      ]
    };
  }

  // Graceful shutdown
  shutdown(): void {
    if (this.isInitialized) {
      cron.getTasks().forEach(task => task.destroy());
      this.isInitialized = false;
      logger.info('Scheduler service shut down');
    }
  }
}

// Create singleton instance
export const schedulerService = new SchedulerService();