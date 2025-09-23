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
        // SUBSCRIPTION EVENTS
        case 'subscription_canceled':
        case 'assinatura_cancelada':
          if (eventData.subscription_id) {
            const subscription = await this.getSubscription(eventData.subscription_id);
            return { subscription, action: 'subscription_canceled' };
          }
          break;

        case 'subscription_renewed':
        case 'assinatura_renovada':
          if (eventData.subscription_id) {
            const subscription = await this.getSubscription(eventData.subscription_id);

            const payment: PaymentData = {
              id: eventData.payment_id || eventData.id,
              amount: eventData.amount || 19700, // 36.00 BRL in cents
              currency: 'BRL',
              status: 'succeeded',
              type: 'subscription',
              subscriptionId: subscription.id,
              customerId: subscription.customerId,
              metadata: {
                ...eventData,
                isRenewal: true,
                renewalDate: new Date().toISOString(),
              },
            };

            const renewedSubscription: SubscriptionData = {
              ...subscription,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: this.calculateSubscriptionEnd(new Date()),
              cancelAtPeriodEnd: false,
              metadata: {
                ...subscription.metadata,
                lastRenewal: new Date().toISOString(),
                renewalCount: (subscription.metadata?.renewalCount || 0) + 1,
              },
            };

            return { subscription: renewedSubscription, payment, action: 'payment_succeeded' };
          }
          break;

        case 'subscription_late':
        case 'subscription_overdue':
        case 'assinatura_em_atraso':
          if (eventData.subscription_id) {
            const subscription = await this.getSubscription(eventData.subscription_id);

            const payment: PaymentData = {
              id: eventData.payment_id || eventData.id,
              amount: eventData.amount || subscription.metadata?.amount || 3600,
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

        // PAYMENT EVENTS
        case 'pix_issued':
        case 'pix_gerado':
          const pixPayment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 19700, // 36.00 BRL in cents
            currency: 'BRL',
            status: 'pending',
            type: 'subscription',
            subscriptionId: eventData.subscription_id || eventData.id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: {
              ...eventData,
              paymentMethod: 'pix',
              pixCode: eventData.pix_code,
              pixQrCode: eventData.pix_qr_code,
              pixExpiresAt: eventData.pix_expires_at,
            },
          };

          return { payment: pixPayment, action: 'payment_succeeded' };

        case 'boleto_issued':
        case 'boleto_gerado':
          const boletoPayment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 19700,
            currency: 'BRL',
            status: 'pending',
            type: 'subscription',
            subscriptionId: eventData.subscription_id || eventData.id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: {
              ...eventData,
              paymentMethod: 'boleto',
              boletoUrl: eventData.boleto_url,
              boletoBarcode: eventData.boleto_barcode,
              boletoExpiresAt: eventData.boleto_expires_at,
            },
          };

          return { payment: boletoPayment, action: 'payment_succeeded' };

        case 'purchase_approved':
        case 'compra_aprovada':
          const payment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 19700, // 36.00 BRL in cents
            currency: 'BRL',
            status: 'succeeded',
            type: 'subscription',
            subscriptionId: eventData.subscription_id || eventData.id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: eventData,
          };

          const subscription: SubscriptionData = {
            id: eventData.subscription_id || eventData.id,
            status: 'active',
            customerId: eventData.customer?.email || eventData.customer_email,
            planId: 'pro', // Kiwify payments are for Pro plan
            currentPeriodStart: new Date(),
            currentPeriodEnd: this.calculateSubscriptionEnd(new Date()),
            cancelAtPeriodEnd: false,
            metadata: eventData,
          };

          return { subscription, payment, action: 'subscription_created' };

        case 'purchase_declined':
        case 'compra_recusada':
          const failedPayment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 19700,
            currency: 'BRL',
            status: 'failed',
            type: 'subscription',
            subscriptionId: eventData.subscription_id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: eventData,
          };

          return { payment: failedPayment, action: 'payment_failed' };

        case 'refund':
        case 'compra_reembolsada':
          const refundPayment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 19700,
            currency: 'BRL',
            status: 'refunded',
            type: 'refund',
            subscriptionId: eventData.subscription_id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: eventData,
          };

          return { payment: refundPayment, action: 'payment_failed' };

        case 'chargeback':
        case 'estorno':
          const chargebackPayment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 19700,
            currency: 'BRL',
            status: 'disputed',
            type: 'chargeback',
            subscriptionId: eventData.subscription_id,
            customerId: eventData.customer?.email || eventData.customer_email,
            metadata: {
              ...eventData,
              isChargeback: true,
              chargebackReason: eventData.chargeback_reason,
            },
          };

          return { payment: chargebackPayment, action: 'payment_failed' };

        case 'abandoned_cart':
        case 'carrinho_abandonado':
          // Log abandoned cart for analytics, but don't create payment record
          logger.info('Kiwify abandoned cart event:', {
            customerId: eventData.customer?.email || eventData.customer_email,
            productId: eventData.product_id,
            amount: eventData.amount,
            abandonedAt: new Date().toISOString(),
          });

          return { action: 'unknown' }; // No payment/subscription action needed

        default:
          logger.warn('Unknown Kiwify webhook event type:', event.type);
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

  private calculateSubscriptionEnd(startDate: Date): Date {
    // For Kiwify payments, typically add 1 month
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }
}