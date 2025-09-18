import Stripe from 'stripe';
import { env } from '../../config/env';
import logger from '../../config/logger';
import {
  PaymentGateway,
  CreateCheckoutSessionData,
  CheckoutSessionResult,
  SubscriptionData,
  PaymentData,
  WebhookEvent
} from '../../interfaces/PaymentGateway';
import { NotFoundError, ValidationError } from '@fluxo/shared';

export class StripeGateway extends PaymentGateway {
  gatewayName = 'stripe';
  private stripe: Stripe;

  constructor() {
    super();
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(data: CreateCheckoutSessionData): Promise<CheckoutSessionResult> {
    try {
      if (!data.userEmail || !data.userId || !data.planId) {
        throw new ValidationError('Missing required parameters: userEmail, userId, or planId');
      }

      const priceId = this.getPriceIdFromPlan(data.planId);

      // Create or retrieve Stripe customer
      let customer;
      const existingCustomers = await this.stripe.customers.search({
        query: `email:'${data.userEmail}'`,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await this.stripe.customers.create({
          email: data.userEmail,
          metadata: {
            userId: data.userId,
            gateway: this.gatewayName,
          },
        });
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: data.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: data.cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        metadata: {
          userId: data.userId,
          planId: data.planId,
          gateway: this.gatewayName,
          ...data.metadata,
        },
      });

      logger.info(`Stripe checkout session created: ${session.id}`);

      return {
        sessionId: session.id,
        url: session.url!,
        gatewayData: { customerId: customer.id }
      };
    } catch (error) {
      logger.error('Stripe create checkout session error:', error);
      throw error;
    }
  }

  async createCustomerPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    try {
      // Find customer by userId metadata
      const customers = await this.stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
      });

      if (customers.data.length === 0) {
        throw new NotFoundError('No Stripe customer found');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error) {
      logger.error('Stripe create customer portal session error:', error);
      throw error;
    }
  }

  async handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    try {
      if (!signature) {
        throw new ValidationError('Missing webhook signature');
      }

      if (!env.STRIPE_WEBHOOK_SECRET) {
        throw new ValidationError('Stripe webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );

      logger.info(`Stripe webhook received: ${event.type} - ${event.id}`);

      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        signature,
      };
    } catch (error: any) {
      logger.error('Stripe webhook validation error:', error);
      if (error.type === 'StripeSignatureVerificationError') {
        throw new ValidationError('Invalid webhook signature');
      }
      throw new ValidationError(`Webhook validation failed: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      if (!subscriptionId) {
        throw new ValidationError('Subscription ID is required');
      }

      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      logger.info(`Stripe subscription ${subscriptionId} marked for cancellation at period end`);
    } catch (error: any) {
      logger.error('Stripe cancel subscription error:', error);
      if (error.type === 'StripeInvalidRequestError') {
        throw new NotFoundError(`Subscription ${subscriptionId} not found`);
      }
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionData> {
    try {
      if (!subscriptionId) {
        throw new ValidationError('Subscription ID is required');
      }

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method'],
      });

      if (!subscription.items.data[0]?.price?.id) {
        throw new ValidationError('Invalid subscription: missing price information');
      }

      return {
        id: subscription.id,
        status: subscription.status,
        customerId: subscription.customer as string,
        planId: this.getPlanIdFromPrice(subscription.items.data[0].price.id),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        metadata: subscription.metadata,
      };
    } catch (error: any) {
      logger.error('Stripe get subscription error:', error);
      if (error.type === 'StripeInvalidRequestError') {
        throw new NotFoundError(`Subscription ${subscriptionId} not found`);
      }
      throw error;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<{
    subscription?: SubscriptionData;
    payment?: PaymentData;
    action: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'payment_succeeded' | 'payment_failed' | 'unknown';
  }> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data as Stripe.Checkout.Session;
          if (session.subscription) {
            const subscription = await this.getSubscription(session.subscription as string);
            return { subscription, action: 'subscription_created' };
          }
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscriptionData = await this.getSubscription(event.data.id);
          return { subscription: subscriptionData, action: 'subscription_updated' };

        case 'customer.subscription.deleted':
          const deletedSubscription = await this.getSubscription(event.data.id);
          return { subscription: deletedSubscription, action: 'subscription_canceled' };

        case 'invoice.payment_succeeded':
          const invoice = event.data as Stripe.Invoice;
          const payment: PaymentData = {
            id: invoice.id,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            status: 'succeeded',
            type: 'subscription',
            subscriptionId: invoice.subscription as string,
            customerId: invoice.customer as string,
            metadata: invoice.metadata,
          };
          return { payment, action: 'payment_succeeded' };

        case 'invoice.payment_failed':
          const failedInvoice = event.data as Stripe.Invoice;
          const failedPayment: PaymentData = {
            id: failedInvoice.id,
            amount: failedInvoice.amount_due / 100,
            currency: failedInvoice.currency,
            status: 'failed',
            type: 'subscription',
            subscriptionId: failedInvoice.subscription as string,
            customerId: failedInvoice.customer as string,
            metadata: failedInvoice.metadata,
          };
          return { payment: failedPayment, action: 'payment_failed' };

        default:
          return { action: 'unknown' };
      }

      return { action: 'unknown' };
    } catch (error) {
      logger.error('Stripe process webhook event error:', error);
      throw error;
    }
  }

  private getPriceIdFromPlan(planId: string): string {
    switch (planId) {
      case 'pro':
        return env.STRIPE_PRICE_PRO;
      default:
        throw new ValidationError(`Invalid plan ID: ${planId}`);
    }
  }

  private getPlanIdFromPrice(priceId: string): string {
    if (priceId === env.STRIPE_PRICE_PRO) {
      return 'pro';
    }
    return 'free';
  }
}