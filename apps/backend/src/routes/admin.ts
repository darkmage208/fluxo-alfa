import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminService } from '../services/adminService';
import { UnifiedBillingService } from '../services/UnifiedBillingService';
import { schedulerService } from '../services/SchedulerService';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { 
  CreateSourceSchema,
  UpdateSourceSchema,
  createSuccessResponse,
  createPaginatedResponse,
  ValidationError 
} from '@fluxo/shared';

const router = Router();
const adminService = new AdminService();
const billingService = new UnifiedBillingService();

// Apply authentication and admin role to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

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

// @route   GET /admin/metrics/overview
// @desc    Get admin dashboard overview metrics
// @access  Admin
router.get('/metrics/overview', async (req, res, next) => {
  try {
    const metrics = await adminService.getOverviewMetrics();
    res.json(createSuccessResponse(metrics, 'Overview metrics retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/users
// @desc    Get all users with pagination and search
// @access  Admin
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    const { users, total } = await adminService.getUsers(page, limit, search);
    res.json(createPaginatedResponse(users, page, limit, total));
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /admin/users/:id
// @desc    Update user details
// @access  Admin
router.patch('/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    const user = await adminService.updateUser(userId, updates);
    res.json(createSuccessResponse(user, 'User updated successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    await adminService.deleteUser(userId);
    res.json(createSuccessResponse(null, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /admin/users/:id/password-reset
// @desc    Request password reset for user
// @access  Admin
router.post('/users/:id/password-reset', async (req, res, next) => {
  try {
    const userId = req.params.id;
    await adminService.requestUserPasswordReset(userId);
    res.json(createSuccessResponse(null, 'Password reset initiated for user'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/user/:id/usage
// @desc    Get user usage statistics
// @access  Admin
router.get('/user/:id/usage', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const stats = await adminService.getUserUsageStats(userId);
    res.json(createSuccessResponse(stats, 'User usage stats retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/subscriptions
// @desc    Get all subscriptions
// @access  Admin
router.get('/subscriptions', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const { subscriptions, total } = await adminService.getSubscriptions(page, limit);
    res.json(createPaginatedResponse(subscriptions, page, limit, total));
  } catch (error) {
    next(error);
  }
});

// Payment History Routes

// @route   GET /admin/payments
// @desc    Get payment history
// @access  Admin
router.get('/payments', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId as string;

    const { payments, total } = await adminService.getPayments(page, limit, userId);
    res.json(createPaginatedResponse(payments, page, limit, total));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/payments/stats
// @desc    Get payment statistics
// @access  Admin
router.get('/payments/stats', async (req, res, next) => {
  try {
    const stats = await adminService.getPaymentStats();
    res.json(createSuccessResponse(stats, 'Payment statistics retrieved'));
  } catch (error) {
    next(error);
  }
});

// RAG Sources Management Routes

// @route   GET /admin/sources
// @desc    Get all RAG sources
// @access  Admin
router.get('/sources', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const { sources, total } = await adminService.getSources(page, limit, search);
    res.json(createPaginatedResponse(sources, page, limit, total));
  } catch (error) {
    next(error);
  }
});

// @route   POST /admin/sources
// @desc    Create new RAG source
// @access  Admin
router.post('/sources', validateRequest(CreateSourceSchema), async (req, res, next) => {
  try {
    const source = await adminService.createSource(req.body);
    res.status(201).json(createSuccessResponse(source, 'Source created successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /admin/sources/:id
// @desc    Update RAG source
// @access  Admin
router.patch('/sources/:id', validateRequest(UpdateSourceSchema), async (req, res, next) => {
  try {
    const sourceId = req.params.id;
    const source = await adminService.updateSource(sourceId, req.body);
    res.json(createSuccessResponse(source, 'Source updated successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /admin/sources/:id
// @desc    Delete RAG source
// @access  Admin
router.delete('/sources/:id', async (req, res, next) => {
  try {
    const sourceId = req.params.id;
    await adminService.deleteSource(sourceId);
    res.json(createSuccessResponse(null, 'Source deleted successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /admin/sources/reprocess
// @desc    Reprocess all sources for RAG
// @access  Admin
router.post('/sources/reprocess', async (req, res, next) => {
  try {
    // Start reprocessing in background
    setImmediate(async () => {
      await adminService.reprocessAllSources();
    });
    
    res.json(createSuccessResponse(null, 'Source reprocessing initiated'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/sources/stats
// @desc    Get RAG sources statistics
// @access  Admin
router.get('/sources/stats', async (req, res, next) => {
  try {
    const stats = await adminService.getSourceStats();
    res.json(createSuccessResponse(stats, 'Source statistics retrieved'));
  } catch (error) {
    next(error);
  }
});

// Token Usage Management Routes

// @route   GET /admin/usage/stats
// @desc    Get overall token usage statistics
// @access  Admin
router.get('/usage/stats', async (req, res, next) => {
  try {
    const stats = await adminService.getTokenUsageStats();
    res.json(createSuccessResponse(stats, 'Token usage statistics retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/usage/users
// @desc    Get per-user token usage statistics
// @access  Admin
router.get('/usage/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const { users, total } = await adminService.getUserTokenUsage(page, limit);
    res.json(createPaginatedResponse(users, page, limit, total));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/usage/timeframe/:timeframe
// @desc    Get token usage statistics by timeframe (total, month, day)
// @access  Admin
router.get('/usage/timeframe/:timeframe', async (req, res, next) => {
  try {
    const timeframe = req.params.timeframe as 'total' | 'month' | 'day';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    if (!['total', 'month', 'day'].includes(timeframe)) {
      return res.status(400).json({ error: 'Invalid timeframe. Use: total, month, or day' });
    }

    const stats = await adminService.getTokenUsageByTimeframe(timeframe, startDate, endDate);
    res.json(createSuccessResponse(stats, 'Token usage statistics retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/usage/users/:timeframe
// @desc    Get per-user token usage statistics by timeframe
// @access  Admin
router.get('/usage/users/:timeframe', async (req, res, next) => {
  try {
    const timeframe = req.params.timeframe as 'total' | 'month' | 'day';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    if (!['total', 'month', 'day'].includes(timeframe)) {
      return res.status(400).json({ error: 'Invalid timeframe. Use: total, month, or day' });
    }

    const { users, total, period } = await adminService.getUserTokenUsageByTimeframe(timeframe, page, limit, startDate, endDate);
    const response = createPaginatedResponse(users, page, limit, total);
    res.json({ ...response, period });
  } catch (error) {
    next(error);
  }
});

// System Settings Management Routes

// @route   GET /admin/settings
// @desc    Get all system settings
// @access  Admin
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await adminService.getSystemSettings();
    res.json(createSuccessResponse(settings, 'System settings retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/settings/:key
// @desc    Get specific system setting
// @access  Admin
router.get('/settings/:key', async (req, res, next) => {
  try {
    const key = req.params.key;
    const setting = await adminService.getSystemSetting(key);

    if (!setting) {
      return res.status(404).json({ error: 'System setting not found' });
    }

    res.json(createSuccessResponse(setting, 'System setting retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   PUT /admin/settings/:key
// @desc    Update system setting
// @access  Admin
router.put('/settings/:key', async (req, res, next) => {
  try {
    const key = req.params.key;
    const { value, type, description } = req.body;

    if (!value) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const setting = await adminService.updateSystemSetting(key, value, type, description);
    res.json(createSuccessResponse(setting, 'System setting updated successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /admin/settings
// @desc    Create new system setting
// @access  Admin
router.post('/settings', async (req, res, next) => {
  try {
    const { key, value, type = 'text', description } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const setting = await adminService.createSystemSetting(key, value, type, description);
    res.status(201).json(createSuccessResponse(setting, 'System setting created successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /admin/settings/:key
// @desc    Delete system setting
// @access  Admin
router.delete('/settings/:key', async (req, res, next) => {
  try {
    const key = req.params.key;
    await adminService.deleteSystemSetting(key);
    res.json(createSuccessResponse(null, 'System setting deleted successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /admin/settings/:key/toggle
// @desc    Toggle system setting active status
// @access  Admin
router.patch('/settings/:key/toggle', async (req, res, next) => {
  try {
    const key = req.params.key;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const setting = await adminService.toggleSystemSetting(key, isActive);
    res.json(createSuccessResponse(setting, `System setting ${isActive ? 'activated' : 'deactivated'} successfully`));
  } catch (error) {
    next(error);
  }
});

// Subscription Management Routes

// @route   POST /admin/subscriptions/check-expired
// @desc    Manual trigger for subscription expiration check
// @access  Admin
router.post('/subscriptions/check-expired', async (req, res, next) => {
  try {
    await billingService.checkExpiredSubscriptions();
    res.json(createSuccessResponse(null, 'Subscription expiration check completed successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/subscriptions/:userId/expiration-status
// @desc    Get subscription expiration status for a user
// @access  Admin
router.get('/subscriptions/:userId/expiration-status', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const status = await billingService.getSubscriptionExpirationStatus(userId);
    res.json(createSuccessResponse(status, 'Subscription expiration status retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /admin/scheduler/status
// @desc    Get scheduler status and configuration
// @access  Admin
router.get('/scheduler/status', async (req, res, next) => {
  try {
    const status = schedulerService.getStatus();
    res.json(createSuccessResponse(status, 'Scheduler status retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /admin/scheduler/trigger-check
// @desc    Manual trigger for scheduler expiration check
// @access  Admin
router.post('/scheduler/trigger-check', async (req, res, next) => {
  try {
    await schedulerService.triggerExpirationCheck();
    res.json(createSuccessResponse(null, 'Scheduler expiration check triggered successfully'));
  } catch (error) {
    next(error);
  }
});

export default router;