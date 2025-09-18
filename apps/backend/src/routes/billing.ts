import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UnifiedBillingService } from '../services/UnifiedBillingService';
import { authenticateToken } from '../middleware/auth';
import {
  createSuccessResponse,
  ValidationError
} from '@fluxo/shared';

const router = Router();
const billingService = new UnifiedBillingService();

// Enhanced schema for multi-gateway support
const CreateCheckoutSessionSchema = z.object({
  planId: z.string(),
  gateway: z.enum(['stripe', 'mercado_pago', 'kiwify']),
  returnUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.any()).optional(),
});

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(new ValidationError('Invalid request data'));
    }
  };
};

// @route   POST /billing/checkout
// @desc    Create checkout session for any supported gateway
// @access  Private
router.post('/checkout',
  authenticateToken,
  validateRequest(CreateCheckoutSessionSchema),
  async (req, res, next) => {
    try {
      const { planId, gateway, returnUrl, cancelUrl, metadata } = req.body;
      const userId = req.userId!;

      const session = await billingService.createCheckoutSession(userId, {
        planId,
        gateway,
        returnUrl,
        cancelUrl,
        metadata,
      });

      res.json(createSuccessResponse(session, `${gateway} checkout session created`));
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /billing/portal
// @desc    Create customer portal session for the user's gateway
// @access  Private
router.get('/portal', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const returnUrl = (req.query.return_url as string) || process.env.USER_FRONTEND_URL;

    const session = await billingService.createCustomerPortalSession(userId, returnUrl);

    res.json(createSuccessResponse(session, 'Customer portal session created'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /billing/subscription
// @desc    Get user subscription status
// @access  Private
router.get('/subscription', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const subscription = await billingService.getSubscriptionStatus(userId);

    res.json(createSuccessResponse(subscription, 'Subscription status retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /billing/cancel
// @desc    Cancel subscription
// @access  Private
router.post('/cancel', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const result = await billingService.cancelSubscription(userId);

    res.json(createSuccessResponse(result, 'Subscription cancellation initiated'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /billing/webhook/:gateway
// @desc    Handle webhooks for all supported gateways
// @access  Public (but verified via gateway-specific validation)
router.post('/webhook/:gateway', async (req, res, next) => {
  try {
    const { gateway } = req.params;
    const rawBody = req.body;
    const signature = req.headers['stripe-signature'] as string; // For Stripe
    const headers = req.headers as Record<string, string>;

    if (!['stripe', 'mercado_pago', 'kiwify'].includes(gateway)) {
      return res.status(400).json({ error: 'Unsupported gateway' });
    }

    await billingService.handleWebhook(gateway, rawBody, signature, headers);

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

// Legacy webhook endpoint for Stripe (for backward compatibility)
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.body;

    await billingService.handleWebhook('stripe', rawBody, signature);

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

// @route   GET /billing/gateways
// @desc    Get available payment gateways
// @access  Public
router.get('/gateways', (_req, res) => {
  const gateways = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Credit/Debit Cards, Apple Pay, Google Pay',
      icon: '💳',
      popular: true,
      currencies: ['USD', 'EUR', 'BRL'],
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'mercado_pago',
      name: 'Mercado Pago',
      description: 'PIX, Credit Cards, Bank Transfer',
      icon: '💰',
      popular: false,
      currencies: ['BRL', 'ARS', 'MXN'],
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      id: 'kiwify',
      name: 'Kiwify',
      description: 'Brazilian Payment Methods, PIX',
      icon: '🥝',
      popular: false,
      currencies: ['BRL'],
      color: 'from-green-500 to-green-600'
    }
  ];

  res.json(createSuccessResponse(gateways, 'Payment gateways retrieved'));
});

export default router;