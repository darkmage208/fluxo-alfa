import Stripe from 'stripe';
import { prisma } from '../config/database';
import { env } from '../config/env';
import logger from '../config/logger';
import { 
  NotFoundError, 
  ValidationError,
  SubscriptionError,
  createSuccessResponse 
} from '@fluxo/shared';

export class BillingService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string) {
    try {
      // Get user with subscription
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if user already has an active subscription
      if (user.subscription?.status === 'active') {
        throw new ValidationError('User already has an active subscription');
      }

      let customerId = user.subscription?.stripeCustomerId;

      // Create or retrieve Stripe customer
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;

        // Update subscription record with customer ID
        if (user.subscription) {
          await prisma.subscription.update({
            where: { userId: user.id },
            data: { stripeCustomerId: customerId },
          });
        }
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id,
        },
      });

      logger.info(`Checkout session created for user ${user.email}: ${session.id}`);

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      logger.error('Create checkout session error:', error);
      throw error;
    }
  }

  async createCustomerPortalSession(userId: string, returnUrl: string) {
    try {
      // Get user with subscription
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user || !user.subscription?.stripeCustomerId) {
        throw new NotFoundError('No billing information found');
      }

      // Create portal session
      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.subscription.stripeCustomerId,
        return_url: returnUrl,
      });

      logger.info(`Customer portal session created for user ${user.email}: ${session.id}`);

      return { url: session.url };
    } catch (error) {
      logger.error('Create customer portal session error:', error);
      throw error;
    }
  }

  async handleWebhook(rawBody: string, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );

      logger.info(`Stripe webhook received: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      logger.error('Webhook handling error:', error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    try {
      const userId = session.metadata?.userId;
      if (!userId) {
        throw new ValidationError('No user ID in session metadata');
      }

      // Get the subscription from Stripe
      const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);
      
      await this.updateSubscription(userId, subscription);

      logger.info(`Checkout completed for user ${userId}`);
    } catch (error) {
      logger.error('Handle checkout completed error:', error);
      throw error;
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    try {
      const customer = await this.stripe.customers.retrieve(subscription.customer as string);
      const userId = (customer as Stripe.Customer).metadata?.userId;

      if (!userId) {
        logger.warn('No user ID found for subscription update');
        return;
      }

      await this.updateSubscription(userId, subscription);

      logger.info(`Subscription updated for user ${userId}: ${subscription.status}`);
    } catch (error) {
      logger.error('Handle subscription update error:', error);
      throw error;
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
      const customer = await this.stripe.customers.retrieve(subscription.customer as string);
      const userId = (customer as Stripe.Customer).metadata?.userId;

      if (!userId) {
        logger.warn('No user ID found for subscription deletion');
        return;
      }

      // Update subscription to free plan
      await prisma.subscription.update({
        where: { userId },
        data: {
          planId: 'free',
          status: 'canceled',
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
      });

      logger.info(`Subscription canceled for user ${userId}`);
    } catch (error) {
      logger.error('Handle subscription deletion error:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
      // Payment succeeded - subscription is active
      logger.info(`Payment succeeded for invoice ${invoice.id}`);
    } catch (error) {
      logger.error('Handle payment succeeded error:', error);
      throw error;
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    try {
      // Payment failed - handle accordingly
      logger.warn(`Payment failed for invoice ${invoice.id}`);
    } catch (error) {
      logger.error('Handle payment failed error:', error);
      throw error;
    }
  }

  private async updateSubscription(userId: string, subscription: Stripe.Subscription) {
    const planId = this.getPlanIdFromPrice(subscription.items.data[0].price.id);
    
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        planId,
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
      create: {
        userId,
        planId,
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private getPlanIdFromPrice(priceId: string): string {
    // Map Stripe price IDs to plan IDs
    if (priceId === env.STRIPE_PRICE_PRO) {
      return 'pro';
    }
    return 'free';
  }

  async getSubscriptionStatus(userId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      return subscription;
    } catch (error) {
      logger.error('Get subscription status error:', error);
      throw error;
    }
  }

  async cancelSubscription(userId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription?.stripeSubscriptionId) {
        throw new NotFoundError('No active subscription found');
      }

      // Cancel at period end
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      logger.info(`Subscription marked for cancellation for user ${userId}`);

      return { message: 'Subscription will be canceled at the end of the current period' };
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      throw error;
    }
  }
}