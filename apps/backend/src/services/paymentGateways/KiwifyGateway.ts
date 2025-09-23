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
      
      switch (eventData.webhook_event_type) {
        // SUBSCRIPTION EVENTS
        case 'subscription_canceled':
        case 'assinatura_cancelada':
          if (eventData.subscription_id) {
            const customerEmail = eventData.Customer?.email || eventData.customer?.email || eventData.customer_email;
            const subscriptionId = eventData.subscription_id;
            const orderId = eventData.order_id;
            const kiwifySubscription = eventData.Subscription;
            const chargeAmount = eventData.Commissions?.charge_amount || 19700;

            // Create refund payment record if order was refunded
            let refundPayment: PaymentData | undefined;
            if (eventData.order_status === 'refunded' && eventData.refunded_at) {
              refundPayment = {
                id: `${orderId}_refund`,
                amount: chargeAmount,
                currency: 'BRL',
                status: 'refunded',
                type: 'refund',
                subscriptionId: subscriptionId,
                customerId: customerEmail,
                metadata: {
                  ...eventData,
                  kiwifyOrderId: orderId,
                  kiwifySubscriptionId: subscriptionId,
                  refundedAt: eventData.refunded_at,
                  originalOrderId: orderId,
                },
              };
            }

            const canceledSubscription: SubscriptionData = {
              id: subscriptionId,
              status: 'canceled',
              customerId: customerEmail,
              planId: 'pro',
              currentPeriodStart: kiwifySubscription?.start_date ? new Date(kiwifySubscription.start_date) : new Date(),
              currentPeriodEnd: kiwifySubscription?.next_payment ? new Date(kiwifySubscription.next_payment) : new Date(),
              cancelAtPeriodEnd: true,
              metadata: {
                kiwifyOrderId: orderId,
                kiwifySubscriptionId: subscriptionId,
                productId: eventData.Product?.product_id,
                productName: eventData.Product?.product_name,
                customerName: eventData.Customer?.full_name,
                customerEmail: customerEmail,
                canceledAt: eventData.refunded_at || new Date().toISOString(),
                cancelReason: 'refunded',
                subscriptionStatus: kiwifySubscription?.status,
                subscriptionPlan: kiwifySubscription?.plan?.name,
                subscriptionFrequency: kiwifySubscription?.plan?.frequency,
              },
            };

            return {
              subscription: canceledSubscription,
              payment: refundPayment,
              action: 'subscription_canceled'
            };
          }
          break;

        case 'subscription_renewed':
        case 'assinatura_renovada':
          if (eventData.subscription_id) {
            const chargeAmountRenewal = eventData.Commissions?.charge_amount || 19700;
            const customerEmailRenewal = eventData.Customer?.email || eventData.customer?.email || eventData.customer_email;
            const subscriptionIdRenewal = eventData.subscription_id;
            const orderIdRenewal = eventData.order_id;
            const kiwifySubscription = eventData.Subscription;

            const renewalPayment: PaymentData = {
              id: orderIdRenewal,
              amount: chargeAmountRenewal, // Amount in centavos (6023 = R$ 60.23)
              currency: 'BRL',
              status: 'succeeded',
              type: this.getPaymentType(eventData),
              subscriptionId: subscriptionIdRenewal,
              customerId: customerEmailRenewal,
              metadata: {
                ...eventData,
                kiwifyOrderId: orderIdRenewal,
                kiwifySubscriptionId: subscriptionIdRenewal,
                isRenewal: true,
                renewalDate: new Date().toISOString(),
                paymentMethod: eventData.payment_method,
                cardType: eventData.card_type,
                cardLast4: eventData.card_last4digits,
                installments: eventData.installments,
                productName: eventData.Product?.product_name,
                customerName: eventData.Customer?.full_name,
                completedCharges: kiwifySubscription?.charges?.completed?.length || 0,
              },
            };

            const renewedSubscription: SubscriptionData = {
              id: subscriptionIdRenewal,
              status: 'active',
              customerId: customerEmailRenewal,
              planId: 'pro',
              currentPeriodStart: kiwifySubscription?.start_date ? new Date(kiwifySubscription.start_date) : new Date(),
              currentPeriodEnd: kiwifySubscription?.next_payment ? new Date(kiwifySubscription.next_payment) : this.calculateSubscriptionEnd(new Date()),
              cancelAtPeriodEnd: false,
              metadata: {
                kiwifyOrderId: orderIdRenewal,
                kiwifySubscriptionId: subscriptionIdRenewal,
                productId: eventData.Product?.product_id,
                productName: eventData.Product?.product_name,
                customerName: eventData.Customer?.full_name,
                customerEmail: customerEmailRenewal,
                subscriptionPlan: kiwifySubscription?.plan?.name,
                subscriptionFrequency: kiwifySubscription?.plan?.frequency,
                subscriptionStatus: kiwifySubscription?.status,
                lastRenewal: new Date().toISOString(),
                nextPayment: kiwifySubscription?.next_payment,
                renewalCount: kiwifySubscription?.charges?.completed?.length || 1,
                chargeAmount: chargeAmountRenewal,
              },
            };

            return { subscription: renewedSubscription, payment: renewalPayment, action: 'payment_succeeded' };
          }
          break;

        case 'subscription_late':
        case 'subscription_overdue':
        case 'assinatura_em_atraso':
          if (eventData.subscription_id) {
            const chargeAmountLate = eventData.Commissions?.charge_amount || 19700;
            const customerEmailLate = eventData.Customer?.email || eventData.customer?.email || eventData.customer_email;
            const subscriptionIdLate = eventData.subscription_id;
            const orderIdLate = eventData.order_id;
            const kiwifySubscriptionLate = eventData.Subscription;

            const latePayment: PaymentData = {
              id: `${orderIdLate}_late`,
              amount: chargeAmountLate, // Amount in centavos (8871 = R$ 88.71)
              currency: 'BRL',
              status: 'failed',
              type: this.getPaymentType(eventData),
              subscriptionId: subscriptionIdLate,
              customerId: customerEmailLate,
              metadata: {
                ...eventData,
                kiwifyOrderId: orderIdLate,
                kiwifySubscriptionId: subscriptionIdLate,
                isLatePayment: true,
                latePaymentDate: new Date().toISOString(),
                paymentMethod: eventData.payment_method,
                cardType: eventData.card_type,
                cardLast4: eventData.card_last4digits,
                productName: eventData.Product?.product_name,
                customerName: eventData.Customer?.full_name,
                subscriptionStatus: kiwifySubscriptionLate?.status,
                nextPaymentDue: kiwifySubscriptionLate?.next_payment,
              },
            };

            const lateSubscription: SubscriptionData = {
              id: subscriptionIdLate,
              status: 'past_due', // Subscription is past due but not canceled yet
              customerId: customerEmailLate,
              planId: 'pro',
              currentPeriodStart: kiwifySubscriptionLate?.start_date ? new Date(kiwifySubscriptionLate.start_date) : new Date(),
              currentPeriodEnd: kiwifySubscriptionLate?.next_payment ? new Date(kiwifySubscriptionLate.next_payment) : new Date(),
              cancelAtPeriodEnd: false, // Still active, just late
              metadata: {
                kiwifyOrderId: orderIdLate,
                kiwifySubscriptionId: subscriptionIdLate,
                productId: eventData.Product?.product_id,
                productName: eventData.Product?.product_name,
                customerName: eventData.Customer?.full_name,
                customerEmail: customerEmailLate,
                subscriptionPlan: kiwifySubscriptionLate?.plan?.name,
                subscriptionFrequency: kiwifySubscriptionLate?.plan?.frequency,
                subscriptionStatus: kiwifySubscriptionLate?.status,
                lastFailedPayment: new Date().toISOString(),
                nextPayment: kiwifySubscriptionLate?.next_payment,
                lateReason: 'payment_failed',
                chargeAmount: chargeAmountLate,
                completedCharges: kiwifySubscriptionLate?.charges?.completed?.length || 0,
                futureCharges: kiwifySubscriptionLate?.charges?.future?.length || 0,
              },
            };

            return { subscription: lateSubscription, payment: latePayment, action: 'payment_failed' };
          }
          break;

        // PAYMENT EVENTS
        case 'pix_created':
        case 'pix_issued':
        case 'pix_gerado':
          const chargeAmountPix = eventData.Commissions?.charge_amount || 19700;
          const customerEmailPix = eventData.Customer?.email || eventData.customer?.email || eventData.customer_email;
          const orderIdPix = eventData.order_id || eventData.payment_id || eventData.id;
          const subscriptionIdPix = eventData.subscription_id || orderIdPix;
          const kiwifySubscriptionPix = eventData.Subscription;

          const pixPayment: PaymentData = {
            id: orderIdPix,
            amount: chargeAmountPix, // Amount in centavos (4830 = R$ 48.30)
            currency: 'BRL',
            status: 'pending',
            type: 'pix',
            subscriptionId: subscriptionIdPix,
            customerId: customerEmailPix,
            metadata: {
              ...eventData,
              kiwifyOrderId: orderIdPix,
              kiwifyOrderRef: eventData.order_ref,
              kiwifySubscriptionId: subscriptionIdPix,
              paymentMethod: 'pix',
              pixCode: eventData.pix_code,
              pixExpiration: eventData.pix_expiration,
              orderStatus: eventData.order_status,
              productName: eventData.Product?.product_name,
              customerName: eventData.Customer?.full_name,
              customerCPF: eventData.Customer?.CPF,
              createdAt: eventData.created_at,
              subscriptionPlan: kiwifySubscriptionPix?.plan?.name,
              subscriptionFrequency: kiwifySubscriptionPix?.plan?.frequency,
              subscriptionStatus: kiwifySubscriptionPix?.status,
            },
          };

          return { payment: pixPayment, action: 'payment_succeeded' };

        case 'billet_created':
        case 'boleto_issued':
        case 'boleto_gerado':
          const chargeAmountBoleto = eventData.Commissions?.charge_amount || 19700;
          const customerEmailBoleto = eventData.Customer?.email || eventData.customer?.email || eventData.customer_email;
          const orderIdBoleto = eventData.order_id || eventData.payment_id || eventData.id;

          const boletoPayment: PaymentData = {
            id: orderIdBoleto,
            amount: chargeAmountBoleto, // Amount in centavos (1266 = R$ 12.66)
            currency: 'BRL',
            status: 'pending',
            type: 'boleto',
            subscriptionId: orderIdBoleto, // Using order_id as subscription identifier for boleto
            customerId: customerEmailBoleto,
            metadata: {
              ...eventData,
              kiwifyOrderId: eventData.order_id,
              kiwifyOrderRef: eventData.order_ref,
              paymentMethod: 'boleto',
              boletoUrl: eventData.boleto_URL,
              boletoBarcode: eventData.boleto_barcode,
              boletoExpiryDate: eventData.boleto_expiry_date,
              orderStatus: eventData.order_status,
              productName: eventData.Product?.product_name,
              customerName: eventData.Customer?.full_name,
              createdAt: eventData.created_at,
            },
          };

          return { payment: boletoPayment, action: 'payment_succeeded' };

        case 'order_approved':
        case 'purchase_approved':
        case 'compra_aprovada':
          // Extract amount from Commissions.charge_amount (in centavos) or fallback to 19700
          const chargeAmount = eventData.Commissions?.charge_amount || 19700;
          const customerEmail = eventData.Customer?.email || eventData.customer?.email || eventData.customer_email;
          const orderId = eventData.order_id || eventData.payment_id || eventData.id;

          // Use subscription_id if available, otherwise fall back to order_id
          const subscriptionId = eventData.subscription_id || orderId;

          // Extract subscription details if available
          const kiwifySubscription = eventData.Subscription;
          const nextPaymentDate = kiwifySubscription?.next_payment ? new Date(kiwifySubscription.next_payment) : this.calculateSubscriptionEnd(new Date());

          const payment: PaymentData = {
            id: orderId,
            amount: chargeAmount, // Amount in centavos (500 = R$ 5.00, 3373 = R$ 33.73, 19700 = R$ 197.00)
            currency: 'BRL',
            status: 'succeeded',
            type: this.getPaymentType(eventData),
            subscriptionId: subscriptionId,
            customerId: customerEmail,
            metadata: {
              ...eventData,
              kiwifyOrderId: eventData.order_id,
              kiwifyOrderRef: eventData.order_ref,
              paymentMethod: eventData.payment_method,
              productName: eventData.Product?.product_name,
              customerName: eventData.Customer?.full_name,
              approvedDate: eventData.approved_date,
              cardType: eventData.card_type,
              cardLast4: eventData.card_last4digits,
              installments: eventData.installments,
            },
          };

          const subscription: SubscriptionData = {
            id: subscriptionId,
            status: 'active',
            customerId: customerEmail,
            planId: 'pro', // Kiwify payments are for Pro plan
            currentPeriodStart: kiwifySubscription?.start_date ? new Date(kiwifySubscription.start_date) : new Date(),
            currentPeriodEnd: nextPaymentDate,
            cancelAtPeriodEnd: false,
            metadata: {
              kiwifyOrderId: eventData.order_id,
              kiwifyOrderRef: eventData.order_ref,
              kiwifySubscriptionId: eventData.subscription_id,
              productId: eventData.Product?.product_id,
              productName: eventData.Product?.product_name,
              customerName: eventData.Customer?.full_name,
              customerCPF: eventData.Customer?.CPF || eventData.Customer?.cnpj,
              customerMobile: eventData.Customer?.mobile,
              customerCity: eventData.Customer?.city,
              customerState: eventData.Customer?.state,
              paymentMethod: eventData.payment_method,
              chargeAmount: chargeAmount,
              subscriptionPlan: kiwifySubscription?.plan?.name,
              subscriptionFrequency: kiwifySubscription?.plan?.frequency,
              nextPayment: kiwifySubscription?.next_payment,
              subscriptionStatus: kiwifySubscription?.status,
            },
          };

          return { subscription, payment, action: 'subscription_created' };

        case 'purchase_declined':
        case 'compra_recusada':
          const failedPayment: PaymentData = {
            id: eventData.payment_id || eventData.id,
            amount: eventData.amount || 19700,
            currency: 'BRL',
            status: 'failed',
            type: this.getPaymentType(eventData),
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
          const chargeAmountChargeback = eventData.Commissions?.charge_amount || 19700;
          const customerEmailChargeback = eventData.Customer?.email || eventData.customer?.email || eventData.customer_email;
          const subscriptionIdChargeback = eventData.subscription_id;
          const orderIdChargeback = eventData.order_id;
          const kiwifySubscriptionChargeback = eventData.Subscription;

          const chargebackPayment: PaymentData = {
            id: `${orderIdChargeback}_chargeback`,
            amount: chargeAmountChargeback, // Amount in centavos (1251 = R$ 12.51)
            currency: 'BRL',
            status: 'disputed',
            type: 'chargeback',
            subscriptionId: subscriptionIdChargeback,
            customerId: customerEmailChargeback,
            metadata: {
              ...eventData,
              kiwifyOrderId: orderIdChargeback,
              kiwifySubscriptionId: subscriptionIdChargeback,
              isChargeback: true,
              chargebackDate: new Date().toISOString(),
              originalOrderId: orderIdChargeback,
              paymentMethod: eventData.payment_method,
              cardType: eventData.card_type,
              cardLast4: eventData.card_last4digits,
              productName: eventData.Product?.product_name,
              customerName: eventData.Customer?.full_name,
              orderStatus: eventData.order_status,
            },
          };

          // Handle subscription impact of chargeback
          let disputedSubscription: SubscriptionData | undefined;
          if (subscriptionIdChargeback) {
            disputedSubscription = {
              id: subscriptionIdChargeback,
              status: 'canceled', // Chargeback typically cancels subscription
              customerId: customerEmailChargeback,
              planId: 'pro',
              currentPeriodStart: kiwifySubscriptionChargeback?.start_date ? new Date(kiwifySubscriptionChargeback.start_date) : new Date(),
              currentPeriodEnd: kiwifySubscriptionChargeback?.next_payment ? new Date(kiwifySubscriptionChargeback.next_payment) : new Date(),
              cancelAtPeriodEnd: true,
              metadata: {
                kiwifyOrderId: orderIdChargeback,
                kiwifySubscriptionId: subscriptionIdChargeback,
                productId: eventData.Product?.product_id,
                productName: eventData.Product?.product_name,
                customerName: eventData.Customer?.full_name,
                canceledAt: new Date().toISOString(),
                cancelReason: 'chargeback',
                subscriptionPlan: kiwifySubscriptionChargeback?.plan?.name,
                subscriptionFrequency: kiwifySubscriptionChargeback?.plan?.frequency,
                chargebackAmount: chargeAmountChargeback,
              },
            };
          }

          return {
            payment: chargebackPayment,
            subscription: disputedSubscription,
            action: 'payment_failed'
          };

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

  private getPaymentType(eventData: any): string {
    // Map Kiwify payment methods to types
    const paymentMethod = eventData.payment_method?.toLowerCase();

    if (paymentMethod) {
      if (paymentMethod.includes('credit') || paymentMethod.includes('card')) {
        return 'card';
      }
      if (paymentMethod.includes('pix')) {
        return 'pix';
      }
      if (paymentMethod.includes('boleto') || paymentMethod.includes('billet')) {
        return 'boleto';
      }
      if (paymentMethod.includes('debit')) {
        return 'debit';
      }
    }

    // Also check event type for specific payment methods
    const eventType = eventData.webhook_event_type?.toLowerCase();
    if (eventType?.includes('pix')) {
      return 'pix';
    }
    if (eventType?.includes('billet') || eventType?.includes('boleto')) {
      return 'boleto';
    }

    // Default fallback
    return 'subscription';
  }
}