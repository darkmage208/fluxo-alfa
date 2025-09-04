import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminService } from '../services/adminService';
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

export default router;