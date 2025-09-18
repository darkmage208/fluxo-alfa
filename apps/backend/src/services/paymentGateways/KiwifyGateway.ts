import axios from 'axios';
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

export class KiwifyGateway extends PaymentGateway {
  gatewayName = 'kiwify';
  private baseUrl = 'https://public-api.kiwify.com/v1';

  constructor() {
    super();
  }

  async createCheckoutSession(data: CreateCheckoutSessionData): Promise<CheckoutSessionResult> {
    try {
      // Create Kiwify checkout session
      // Note: This implementation assumes you have products configured in Kiwify
      // and will redirect users to the Kiwify checkout page

      const planDetails = this.getPlanDetails(data.planId);

      // Kiwify checkout URL construction
      // This should be replaced with actual product URLs from your Kiwify dashboard
      const checkoutUrl = `${env.KIWIFY_CHECKOUT_BASE_URL}/${planDetails.productId}?email=${encodeURIComponent(data.userEmail)}&external_id=${data.userId}`;

      logger.info(`Kiwify checkout session created for user: ${data.userId}`);

      return {
        sessionId: `kiwify_${Date.now()}`,
        url: checkoutUrl,
        gatewayData: {
          productId: planDetails.productId,
          userId: data.userId
        }
      };
    } catch (error) {
      logger.error('Kiwify create checkout session error:', error);
      throw error;
    }
  }

  async createCustomerPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    // Kiwify doesn't have a customer portal like Stripe
    // Users need to manage subscriptions through the original purchase email
    return {
      url: returnUrl + '?message=Please check your email for subscription management or contact support'
    };
  }

  async handleWebhook(rawBody: string, signature?: string, headers?: Record<string, string>): Promise<WebhookEvent> {
    try {
      const event = JSON.parse(rawBody);

      // Validate webhook token if provided in headers
      const webhookToken = headers?.['x-kiwify-webhook-token'] || event.token;
      if (webhookToken && env.KIWIFY_WEBHOOK_TOKEN && webhookToken !== env.KIWIFY_WEBHOOK_TOKEN) {
        throw new ValidationError('Invalid webhook token');
      }

      return {
        id: event.id || Date.now().toString(),
        type: event.type || 'unknown',
        data: event,
        signature,
      };
    } catch (error) {
      logger.error('Kiwify webhook validation error:', error);
      throw new ValidationError('Invalid webhook payload');
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      // Kiwify subscription cancellation via API
      await axios.post(`${this.baseUrl}/subscriptions/${subscriptionId}/cancel`, {}, {
        headers: {
          'Authorization': `Bearer ${env.KIWIFY_API_TOKEN}`,
          'x-kiwify-account-id': env.KIWIFY_ACCOUNT_ID,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`Kiwify subscription canceled: ${subscriptionId}`);
    } catch (error) {
      logger.error('Kiwify cancel subscription error:', error);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionData> {
    try {
      const response = await axios.get(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${env.KIWIFY_API_TOKEN}`,
          'x-kiwify-account-id': env.KIWIFY_ACCOUNT_ID,
        },
      });

      const subscription = response.data;

      return {
        id: subscription.id,
        status: this.mapKiwifyStatus(subscription.status),
        customerId: subscription.customer?.email || subscription.customer_email,
        planId: this.getPlanIdFromProduct(subscription.product_id),
        currentPeriodStart: new Date(subscription.current_period_start),
        currentPeriodEnd: new Date(subscription.current_period_end),
        cancelAtPeriodEnd: subscription.status === 'canceled',
        metadata: subscription.metadata || {},
      };
    } catch (error) {
      logger.error('Kiwify get subscription error:', error);
      throw error;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<{
    subscription?: SubscriptionData;
    payment?: PaymentData;
    action: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'payment_succeeded' | 'payment_failed' | 'unknown';
  }> {
    try {
      const eventData = event.data;

      switch (event.type) {
        case 'subscription_canceled':
          if (eventData.subscription_id) {
            const subscription = await this.getSubscription(eventData.subscription_id);
            return { subscription, action: 'subscription_canceled' };
          }
          break;

        case 'subscription_renewed':
          if (eventData.subscription_id) {
            const subscription = await this.getSubscription(eventData.subscription_id);

            // Create payment record for the renewal
            const payment: PaymentData = {
              id: eventData.payment_id || eventData.id,
              amount: eventData.amount || subscription.metadata?.amount || 197,
              currency: 'BRL',
              status: 'succeeded',
              type: 'subscription',
              subscriptionId: subscription.id,
              customerId: subscription.customerId,
              metadata: eventData,
            };

            return { subscription, payment, action: 'payment_succeeded' };
          }
          break;

        case 'subscription_late':
          if (eventData.subscription_id) {
            const subscription = await this.getSubscription(eventData.subscription_id);

            const payment: PaymentData = {
              id: eventData.payment_id || eventData.id,
              amount: eventData.amount || subscription.metadata?.amount || 197,
              currency: 'BRL',
              status: 'failed',
              type: 'subscription',
              subscriptionId: subscription.id,
              customerId: subscription.customerId,
              metadata: eventData,
            };

            return { subscription, payment, action: 'payment_failed' };
          }
          break;

        case 'compra_aprovada':
          // Handle approved purchase (could be initial subscription)
          const payment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 197,
            currency: 'BRL',
            status: 'succeeded',
            type: eventData.subscription_id ? 'subscription' : 'one_time',
            subscriptionId: eventData.subscription_id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: eventData,
          };

          if (eventData.subscription_id) {
            const subscription = await this.getSubscription(eventData.subscription_id);
            return { subscription, payment, action: 'subscription_created' };
          } else {
            return { payment, action: 'payment_succeeded' };
          }

        case 'compra_recusada':
          const failedPayment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 197,
            currency: 'BRL',
            status: 'failed',
            type: 'subscription',
            subscriptionId: eventData.subscription_id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: eventData,
          };

          return { payment: failedPayment, action: 'payment_failed' };

        case 'compra_reembolsada':
          const refundPayment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 197,
            currency: 'BRL',
            status: 'refunded',
            type: 'refund',
            subscriptionId: eventData.subscription_id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: eventData,
          };

          return { payment: refundPayment, action: 'payment_failed' };

        default:
          return { action: 'unknown' };
      }

      return { action: 'unknown' };
    } catch (error) {
      logger.error('Kiwify process webhook event error:', error);
      throw error;
    }
  }

  private getPlanDetails(planId: string) {
    switch (planId) {
      case 'pro':
        return {
          name: 'Pro Plan',
          amount: 197, // R$ 197
          currency: 'BRL',
          productId: env.KIWIFY_PRO_PRODUCT_ID, // This should be configured in your environment
        };
      default:
        throw new ValidationError(`Invalid plan ID: ${planId}`);
    }
  }

  private getPlanIdFromProduct(productId: string): string {
    if (productId === env.KIWIFY_PRO_PRODUCT_ID) {
      return 'pro';
    }
    return 'free';
  }

  private mapKiwifyStatus(status: string): string {
    switch (status) {
      case 'active':
      case 'approved':
        return 'active';
      case 'canceled':
      case 'cancelled':
        return 'canceled';
      case 'late':
      case 'overdue':
        return 'past_due';
      case 'paused':
        return 'paused';
      default:
        return status;
    }
  }
}