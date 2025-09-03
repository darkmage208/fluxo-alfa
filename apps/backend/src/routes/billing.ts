import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BillingService } from '../services/billingService';
import { authenticateToken } from '../middleware/auth';
import { 
  CreateCheckoutSessionSchema,
  createSuccessResponse,
  ValidationError 
} from '@fluxo/shared';

const router = Router();
const billingService = new BillingService();

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(new ValidationError('Invalid request data'));
    }
  };
};

// @route   POST /billing/checkout
// @desc    Create Stripe checkout session
// @access  Private
router.post('/checkout', 
  authenticateToken, 
  validateRequest(CreateCheckoutSessionSchema), 
  async (req, res, next) => {
    try {
      const { priceId, successUrl, cancelUrl } = req.body;
      const userId = req.userId!;

      const session = await billingService.createCheckoutSession(
        userId,
        priceId,
        successUrl,
        cancelUrl
      );

      res.json(createSuccessResponse(session, 'Checkout session created'));
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /billing/portal
// @desc    Create Stripe customer portal session
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

// @route   POST /billing/webhook
// @desc    Handle Stripe webhooks
// @access  Public (but verified via Stripe signature)
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.body;

    await billingService.handleWebhook(rawBody, signature);

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

export default router;