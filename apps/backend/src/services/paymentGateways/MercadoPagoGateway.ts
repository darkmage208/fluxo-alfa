import { MercadoPagoConfig, PreApproval, Customer } from 'mercadopago';
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

export class MercadoPagoGateway extends PaymentGateway {
  gatewayName = 'mercado_pago';
  private client: MercadoPagoConfig;
  private preApproval: PreApproval;
  private customer: Customer;

  constructor() {
    super();
    this.client = new MercadoPagoConfig({
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
      },
    });
    this.preApproval = new PreApproval(this.client);
    this.customer = new Customer(this.client);
  }

  async createCheckoutSession(data: CreateCheckoutSessionData): Promise<CheckoutSessionResult> {
    try {
      // Create MercadoPago customer
      const customerData = await this.customer.create({
        body: {
          email: data.userEmail,
          first_name: data.userEmail.split('@')[0],
          identification: {
            type: 'CPF',
            number: '11111111111', // This should be provided by the user in a real implementation
          },
          phone: {
            area_code: '11',
            number: '999999999', // This should be provided by the user in a real implementation
          },
        },
      });

      // Get plan details
      const planDetails = this.getPlanDetails(data.planId);

      // Create preapproval (subscription)
      const preApprovalData = await this.preApproval.create({
        body: {
          reason: `Fluxo Alfa - ${planDetails.name}`,
          external_reference: `${data.userId}_${data.planId}_${Date.now()}`,
          payer_email: data.userEmail,
          back_url: data.successUrl,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            transaction_amount: planDetails.amount,
            currency_id: planDetails.currency,
          },
          status: 'pending',
        },
      });

      const checkoutUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=${preApprovalData.id}`;

      logger.info(`MercadoPago preapproval created: ${preApprovalData.id}`);

      return {
        sessionId: preApprovalData.id,
        url: checkoutUrl,
        gatewayData: {
          customerId: customerData.id,
          preApprovalId: preApprovalData.id
        }
      };
    } catch (error) {
      logger.error('MercadoPago create checkout session error:', error);
      throw error;
    }
  }

  async createCustomerPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    // MercadoPago doesn't have a customer portal like Stripe
    // Instead, we redirect to the MercadoPago account management page
    return {
      url: returnUrl + '?message=Please contact support to manage your subscription'
    };
  }

  async handleWebhook(rawBody: string, signature?: string): Promise<WebhookEvent> {
    try {
      const event = JSON.parse(rawBody);

      // Validate the webhook (MercadoPago doesn't use signature validation like Stripe)
      // You might want to implement IP validation or other security measures

      return {
        id: event.id || Date.now().toString(),
        type: event.type || event.action,
        data: event.data || event,
        signature,
      };
    } catch (error) {
      logger.error('MercadoPago webhook validation error:', error);
      throw new ValidationError('Invalid webhook payload');
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.preApproval.update({
        id: subscriptionId,
        body: {
          status: 'cancelled',
        },
      });
    } catch (error) {
      logger.error('MercadoPago cancel subscription error:', error);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionData> {
    try {
      const subscription = await this.preApproval.get({ id: subscriptionId });

      const autoRecurring = subscription.auto_recurring as any;

      return {
        id: subscription.id!,
        status: this.mapMercadoPagoStatus(subscription.status!),
        customerId: subscription.payer_email!,
        planId: 'pro', // Extract from external_reference if needed
        currentPeriodStart: new Date(autoRecurring?.start_date || Date.now()),
        currentPeriodEnd: new Date(autoRecurring?.end_date || Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: subscription.status === 'cancelled',
        metadata: { external_reference: subscription.external_reference },
      };
    } catch (error) {
      logger.error('MercadoPago get subscription error:', error);
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
        case 'subscription_preapproval':
        case 'preapproval':
          if (event.data.id) {
            const subscription = await this.getSubscription(event.data.id);

            if (subscription.status === 'active') {
              return { subscription, action: 'subscription_created' };
            } else if (subscription.status === 'canceled') {
              return { subscription, action: 'subscription_canceled' };
            } else {
              return { subscription, action: 'subscription_updated' };
            }
          }
          break;

        case 'payment':
          // For payment events, we need to fetch the payment details
          try {
            const paymentResponse = await axios.get(
              `https://api.mercadopago.com/v1/payments/${event.data.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
                },
              }
            );

            const paymentData = paymentResponse.data;

            const payment: PaymentData = {
              id: paymentData.id.toString(),
              amount: paymentData.transaction_amount,
              currency: paymentData.currency_id,
              status: this.mapPaymentStatus(paymentData.status),
              type: 'subscription',
              metadata: paymentData.metadata,
            };

            if (payment.status === 'succeeded') {
              return { payment, action: 'payment_succeeded' };
            } else {
              return { payment, action: 'payment_failed' };
            }
          } catch (paymentError) {
            logger.error('Error fetching payment details:', paymentError);
            return { action: 'unknown' };
          }

        default:
          return { action: 'unknown' };
      }

      return { action: 'unknown' };
    } catch (error) {
      logger.error('MercadoPago process webhook event error:', error);
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
        };
      default:
        throw new ValidationError(`Invalid plan ID: ${planId}`);
    }
  }

  private mapMercadoPagoStatus(status: string): string {
    switch (status) {
      case 'authorized':
      case 'pending':
        return 'active';
      case 'cancelled':
        return 'canceled';
      case 'paused':
        return 'past_due';
      default:
        return status;
    }
  }

  private mapPaymentStatus(status: string): string {
    switch (status) {
      case 'approved':
        return 'succeeded';
      case 'rejected':
      case 'cancelled':
        return 'failed';
      case 'pending':
      case 'in_process':
        return 'pending';
      default:
        return 'failed';
    }
  }
}