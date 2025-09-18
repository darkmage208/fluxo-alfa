import { prisma } from '../config/database';
import { env } from '../config/env';
import logger from '../config/logger';
import {
  NotFoundError,
  ValidationError,
  SubscriptionError
} from '@fluxo/shared';

import { PaymentGateway } from '../interfaces/PaymentGateway';
import { StripeGateway } from './paymentGateways/StripeGateway';
import { MercadoPagoGateway } from './paymentGateways/MercadoPagoGateway';
import { KiwifyGateway } from './paymentGateways/KiwifyGateway';

export interface CreateCheckoutSessionRequest {
  planId: string;
  gateway: 'stripe' | 'mercado_pago' | 'kiwify';
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export class UnifiedBillingService {
  private gateways: Map<string, PaymentGateway>;

  constructor() {
    this.gateways = new Map();
    this.gateways.set('stripe', new StripeGateway());
    this.gateways.set('mercado_pago', new MercadoPagoGateway());
    this.gateways.set('kiwify', new KiwifyGateway());
  }

  async createCheckoutSession(userId: string, request: CreateCheckoutSessionRequest) {
    try {
      const gateway = this.getGateway(request.gateway);

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

      const checkoutData = {
        userId,
        planId: request.planId,
        successUrl: request.returnUrl,
        cancelUrl: request.cancelUrl,
        userEmail: user.email,
        metadata: {
          gateway: request.gateway,
          ...request.metadata,
        },
      };

      const result = await gateway.createCheckoutSession(checkoutData);

      // Store gateway-specific data in subscription
      await this.upsertSubscription(userId, {
        planId: request.planId,
        status: 'pending',
        paymentMethod: request.gateway,
        gatewayData: result.gatewayData,
      });

      logger.info(`Checkout session created for user ${user.email} with ${request.gateway}: ${result.sessionId}`);

      return {
        checkoutUrl: result.url,
        sessionId: result.sessionId,
        gateway: request.gateway,
      };
    } catch (error) {
      logger.error('Create checkout session error:', error);
      throw error;
    }
  }

  async createCustomerPortalSession(userId: string, returnUrl: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user || !user.subscription) {
        throw new NotFoundError('No subscription found');
      }

      const gateway = this.getGateway(user.subscription.paymentMethod!);
      const result = await gateway.createCustomerPortalSession(userId, returnUrl);

      logger.info(`Customer portal session created for user ${user.email}`);

      return result;
    } catch (error) {
      logger.error('Create customer portal session error:', error);
      throw error;
    }
  }

  async handleWebhook(gateway: string, rawBody: string, signature?: string, headers?: Record<string, string>) {
    try {
      const paymentGateway = this.getGateway(gateway);
      const event = await paymentGateway.handleWebhook(rawBody, signature, headers);

      logger.info(`${gateway} webhook received: ${event.type}`);

      const result = await paymentGateway.processWebhookEvent(event);

      // Process the webhook result
      if (result.subscription) {
        await this.updateSubscriptionFromGateway(result.subscription, gateway);
      }

      if (result.payment) {
        await this.recordPayment(result.payment, gateway);
      }

      // Handle specific actions
      switch (result.action) {
        case 'subscription_created':
        case 'subscription_updated':
          logger.info(`Subscription ${result.action} for ${gateway}`);
          break;
        case 'subscription_canceled':
          logger.info(`Subscription canceled for ${gateway}`);
          break;
        case 'payment_succeeded':
          logger.info(`Payment succeeded for ${gateway}`);
          break;
        case 'payment_failed':
          logger.info(`Payment failed for ${gateway}`);
          break;
      }

      return { received: true };
    } catch (error) {
      logger.error(`${gateway} webhook handling error:`, error);
      throw error;
    }
  }

  async getSubscriptionStatus(userId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      if (!subscription) {
        // Return default free subscription
        return {
          userId,
          planId: 'free',
          status: 'active',
          plan: { id: 'free', dailyChatLimit: 10 },
        };
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

      if (!subscription) {
        throw new NotFoundError('No subscription found');
      }

      if (!subscription.paymentMethod) {
        throw new ValidationError('No payment method associated with subscription');
      }

      const gateway = this.getGateway(subscription.paymentMethod);
      const gatewaySubscriptionId = this.getGatewaySubscriptionId(subscription);

      if (!gatewaySubscriptionId) {
        throw new ValidationError('No gateway subscription ID found');
      }

      // Cancel in the gateway
      await gateway.cancelSubscription(gatewaySubscriptionId);

      // Update local subscription
      await prisma.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
        },
      });

      logger.info(`Subscription cancellation initiated for user ${userId}`);

      return { message: 'Subscription will be canceled at the end of the current period' };
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      throw error;
    }
  }

  private getGateway(gatewayName: string): PaymentGateway {
    const gateway = this.gateways.get(gatewayName);
    if (!gateway) {
      throw new ValidationError(`Unsupported payment gateway: ${gatewayName}`);
    }
    return gateway;
  }

  private async upsertSubscription(userId: string, data: {
    planId: string;
    status: string;
    paymentMethod: string;
    gatewayData?: any;
  }) {
    const updateData: any = {
      planId: data.planId,
      status: data.status,
      paymentMethod: data.paymentMethod,
    };

    // Set gateway-specific fields
    if (data.gatewayData) {
      switch (data.paymentMethod) {
        case 'stripe':
          updateData.stripeCustomerId = data.gatewayData.customerId;
          break;
        case 'mercado_pago':
          updateData.mercadoPagoCustomerId = data.gatewayData.customerId;
          updateData.mercadoPagoSubscriptionId = data.gatewayData.preApprovalId;
          break;
        case 'kiwify':
          updateData.kiwifyCustomerId = data.gatewayData.userId;
          break;
      }
    }

    return await prisma.subscription.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });
  }

  private async updateSubscriptionFromGateway(gatewaySubscription: any, gateway: string) {
    try {
      // Find user by gateway customer ID or subscription ID
      const whereClause = this.buildSubscriptionWhereClause(gatewaySubscription, gateway);

      const subscription = await prisma.subscription.findFirst({
        where: whereClause,
      });

      if (!subscription) {
        logger.warn(`No subscription found for ${gateway} subscription ${gatewaySubscription.id}`);
        return;
      }

      const updateData: any = {
        planId: gatewaySubscription.planId,
        status: gatewaySubscription.status,
        currentPeriodStart: gatewaySubscription.currentPeriodStart,
        currentPeriodEnd: gatewaySubscription.currentPeriodEnd,
        cancelAtPeriodEnd: gatewaySubscription.cancelAtPeriodEnd || false,
      };

      // Update gateway-specific subscription ID
      switch (gateway) {
        case 'stripe':
          updateData.stripeSubscriptionId = gatewaySubscription.id;
          break;
        case 'mercado_pago':
          updateData.mercadoPagoSubscriptionId = gatewaySubscription.id;
          break;
        case 'kiwify':
          updateData.kiwifySubscriptionId = gatewaySubscription.id;
          break;
      }

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData,
      });

      logger.info(`Subscription updated from ${gateway} webhook: ${subscription.userId}`);
    } catch (error) {
      logger.error('Update subscription from gateway error:', error);
      throw error;
    }
  }

  private async recordPayment(payment: any, gateway: string) {
    try {
      // Find subscription if payment is related to one
      let subscriptionId = null;
      if (payment.subscriptionId) {
        const subscription = await prisma.subscription.findFirst({
          where: this.buildSubscriptionWhereClause({ id: payment.subscriptionId }, gateway),
        });
        subscriptionId = subscription?.id;
      }

      // Find user by customer ID or email
      let userId = null;
      if (payment.customerId) {
        let user = null;

        switch (gateway) {
          case 'stripe':
            user = await prisma.user.findFirst({
              where: { subscription: { stripeCustomerId: payment.customerId } },
            });
            break;
          case 'mercado_pago':
            user = await prisma.user.findFirst({
              where: { subscription: { mercadoPagoCustomerId: payment.customerId } },
            });
            break;
          case 'kiwify':
            user = await prisma.user.findFirst({
              where: { email: payment.customerId }, // Kiwify uses email as customer ID
            });
            break;
        }

        userId = user?.id;
      }

      if (!userId) {
        logger.warn(`No user found for ${gateway} payment ${payment.id}`);
        return;
      }

      const gatewayIdField = this.getGatewayPaymentIdField(gateway);

      await prisma.payment.create({
        data: {
          userId,
          subscriptionId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          type: payment.type,
          paymentMethod: gateway,
          description: `${gateway} payment`,
          [gatewayIdField]: payment.id,
          gatewayResponse: payment.metadata || {},
          metadata: payment.metadata || {},
        },
      });

      logger.info(`Payment recorded from ${gateway}: ${payment.id}`);
    } catch (error) {
      logger.error('Record payment error:', error);
      throw error;
    }
  }

  private buildSubscriptionWhereClause(gatewaySubscription: any, gateway: string) {
    switch (gateway) {
      case 'stripe':
        return {
          OR: [
            { stripeCustomerId: gatewaySubscription.customerId },
            { stripeSubscriptionId: gatewaySubscription.id },
          ],
        };
      case 'mercado_pago':
        return {
          OR: [
            { mercadoPagoCustomerId: gatewaySubscription.customerId },
            { mercadoPagoSubscriptionId: gatewaySubscription.id },
          ],
        };
      case 'kiwify':
        return {
          OR: [
            { user: { email: gatewaySubscription.customerId } },
            { kiwifySubscriptionId: gatewaySubscription.id },
          ],
        };
      default:
        throw new ValidationError(`Unsupported gateway: ${gateway}`);
    }
  }

  private getGatewaySubscriptionId(subscription: any): string | null {
    switch (subscription.paymentMethod) {
      case 'stripe':
        return subscription.stripeSubscriptionId;
      case 'mercado_pago':
        return subscription.mercadoPagoSubscriptionId;
      case 'kiwify':
        return subscription.kiwifySubscriptionId;
      default:
        return null;
    }
  }

  private getGatewayPaymentIdField(gateway: string): string {
    switch (gateway) {
      case 'stripe':
        return 'stripePaymentIntentId';
      case 'mercado_pago':
        return 'mercadoPagoPaymentId';
      case 'kiwify':
        return 'kiwifyTransactionId';
      default:
        throw new ValidationError(`Unsupported gateway: ${gateway}`);
    }
  }
}