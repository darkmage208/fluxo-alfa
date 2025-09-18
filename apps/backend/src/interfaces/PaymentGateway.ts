export interface CreateCheckoutSessionData {
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  userEmail: string;
  metadata?: Record<string, any>;
}

export interface CheckoutSessionResult {
  sessionId?: string;
  url: string;
  gatewayData?: any;
}

export interface SubscriptionData {
  id: string;
  status: string;
  customerId: string;
  planId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
}

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  subscriptionId?: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  signature?: string;
}

export abstract class PaymentGateway {
  abstract gatewayName: string;

  abstract createCheckoutSession(data: CreateCheckoutSessionData): Promise<CheckoutSessionResult>;

  abstract createCustomerPortalSession(userId: string, returnUrl: string): Promise<{ url: string }>;

  abstract handleWebhook(rawBody: string, signature?: string, headers?: Record<string, string>): Promise<WebhookEvent>;

  abstract cancelSubscription(subscriptionId: string): Promise<void>;

  abstract getSubscription(subscriptionId: string): Promise<SubscriptionData>;

  abstract processWebhookEvent(event: WebhookEvent): Promise<{
    subscription?: SubscriptionData;
    payment?: PaymentData;
    action: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'payment_succeeded' | 'payment_failed' | 'unknown';
  }>;
}