import { prisma } from '../config/database';
import logger from '../config/logger';
import { env } from '../config/env';

export class SubscriptionExpirationService {
  private gracePeriodDays = 3; // 3-day grace period for renewals

  async checkExpiredSubscriptions(): Promise<void> {
    try {
      const now = new Date();
      const gracePeriodEnd = new Date(now.getTime() - (this.gracePeriodDays * 24 * 60 * 60 * 1000));

      logger.info('Starting subscription expiration check');

      // Find subscriptions that have expired beyond grace period
      const expiredSubscriptions = await prisma.subscription.findMany({
        where: {
          AND: [
            {
              OR: [
                { status: 'active' },
                { status: 'past_due' },
              ]
            },
            {
              currentPeriodEnd: {
                lt: gracePeriodEnd, // Expired more than grace period ago
              }
            },
            {
              planId: {
                not: 'free', // Don't process free plans
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

      logger.info(`Found ${expiredSubscriptions.length} expired subscriptions to process`);

      for (const subscription of expiredSubscriptions) {
        await this.revertToFreePlan(subscription);
      }

      // Check for subscriptions in grace period (past due but not yet reverted)
      await this.handleGracePeriodSubscriptions();

      logger.info('Subscription expiration check completed');
    } catch (error) {
      logger.error('Error checking expired subscriptions:', error);
      throw error;
    }
  }

  private async revertToFreePlan(subscription: any): Promise<void> {
    try {
      logger.info(`Reverting subscription ${subscription.id} to free plan for user ${subscription.user.email}`);

      // Update subscription to free plan
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: 'free',
          status: 'canceled',
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
          // Keep payment method and gateway IDs for potential reactivation
        }
      });

      // Log the reversion
      await this.logSubscriptionEvent(subscription.userId, 'subscription_expired', {
        previousPlanId: subscription.planId,
        expiredAt: subscription.currentPeriodEnd,
        revertedAt: new Date(),
        gracePeriodDays: this.gracePeriodDays,
      });

      logger.info(`Successfully reverted subscription ${subscription.id} to free plan`);
    } catch (error) {
      logger.error(`Error reverting subscription ${subscription.id} to free plan:`, error);
      throw error;
    }
  }

  private async handleGracePeriodSubscriptions(): Promise<void> {
    try {
      const now = new Date();

      // Find subscriptions that are past due but still in grace period
      const gracePeriodSubscriptions = await prisma.subscription.findMany({
        where: {
          AND: [
            { status: 'active' },
            {
              currentPeriodEnd: {
                lt: now, // Already expired
                gte: new Date(now.getTime() - (this.gracePeriodDays * 24 * 60 * 60 * 1000)), // But within grace period
              }
            },
            {
              planId: {
                not: 'free',
              }
            }
          ]
        }
      });

      logger.info(`Found ${gracePeriodSubscriptions.length} subscriptions in grace period`);

      for (const subscription of gracePeriodSubscriptions) {
        // Mark as past_due but don't revert yet
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'past_due',
          }
        });

        await this.logSubscriptionEvent(subscription.userId, 'subscription_past_due', {
          planId: subscription.planId,
          expiredAt: subscription.currentPeriodEnd,
          gracePeriodEndsAt: new Date(subscription.currentPeriodEnd.getTime() + (this.gracePeriodDays * 24 * 60 * 60 * 1000)),
        });

        logger.info(`Marked subscription ${subscription.id} as past_due (grace period)`);
      }
    } catch (error) {
      logger.error('Error handling grace period subscriptions:', error);
      throw error;
    }
  }

  async handleRenewalPayment(subscriptionId: string, paymentData: any): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        logger.warn(`Subscription not found for renewal: ${subscriptionId}`);
        return;
      }

      // Calculate new period end (1 month from current period end or now, whichever is later)
      const now = new Date();
      const currentPeriodEnd = subscription.currentPeriodEnd;
      const newPeriodStart = currentPeriodEnd > now ? currentPeriodEnd : now;
      const newPeriodEnd = new Date(newPeriodStart);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      // Update subscription with new period and active status
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        }
      });

      await this.logSubscriptionEvent(subscription.userId, 'subscription_renewed', {
        planId: subscription.planId,
        previousPeriodEnd: subscription.currentPeriodEnd,
        newPeriodStart,
        newPeriodEnd,
        paymentId: paymentData.id,
        amount: paymentData.amount,
      });

      logger.info(`Successfully renewed subscription ${subscriptionId} until ${newPeriodEnd}`);
    } catch (error) {
      logger.error(`Error handling renewal payment for subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  private async logSubscriptionEvent(userId: string, eventType: string, metadata: any): Promise<void> {
    try {
      await prisma.payment.create({
        data: {
          userId,
          amount: 0,
          currency: 'BRL',
          status: 'succeeded',
          type: 'system_event',
          paymentMethod: 'system',
          description: `Subscription event: ${eventType}`,
          metadata: {
            eventType,
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error(`Error logging subscription event ${eventType} for user ${userId}:`, error);
      // Don't throw - logging failure shouldn't break the main process
    }
  }

  // Check if a subscription is in renewal process
  async isRenewalInProgress(subscriptionId: string): Promise<boolean> {
    try {
      // Check for recent pending payments for this subscription
      const recentPendingPayments = await prisma.payment.findMany({
        where: {
          subscriptionId,
          status: 'pending',
          createdAt: {
            gte: new Date(Date.now() - (24 * 60 * 60 * 1000)), // Last 24 hours
          }
        }
      });

      return recentPendingPayments.length > 0;
    } catch (error) {
      logger.error(`Error checking renewal status for subscription ${subscriptionId}:`, error);
      return false;
    }
  }

  // Manual method to reactivate a subscription (for customer service)
  async reactivateSubscription(subscriptionId: string, newPeriodEnd: Date): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: newPeriodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        }
      });

      await this.logSubscriptionEvent(subscription.userId, 'subscription_reactivated', {
        planId: subscription.planId,
        reactivatedAt: new Date(),
        newPeriodEnd,
        method: 'manual',
      });

      logger.info(`Manually reactivated subscription ${subscriptionId}`);
    } catch (error) {
      logger.error(`Error reactivating subscription ${subscriptionId}:`, error);
      throw error;
    }
  }
}