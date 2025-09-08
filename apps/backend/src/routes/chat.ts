import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ChatService } from '../services/chatService';
import { authenticateToken } from '../middleware/auth';
import { 
  CreateMessageSchema,
  SetThreadPasswordSchema,
  VerifyThreadPasswordSchema,
  UpdateThreadPasswordSchema,
  DeleteThreadPasswordSchema,
  createSuccessResponse,
  createPaginatedResponse,
  ValidationError,
  RATE_LIMITS 
} from '@fluxo/shared';

const router = Router();
const chatService = new ChatService();

// Rate limiting for chat endpoints
const chatLimiter = rateLimit({
  windowMs: RATE_LIMITS.CHAT.windowMs,
  max: RATE_LIMITS.CHAT.max,
  message: {
    error: 'Too many messages, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication to all chat routes
router.use(authenticateToken);

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

// @route   POST /chat/thread
// @desc    Create a new chat thread
// @access  Private
router.post('/thread', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { title } = req.body;

    const thread = await chatService.createThread(userId, title);
    res.status(201).json(createSuccessResponse(thread, 'Thread created successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /chat/threads
// @desc    Get user's chat threads
// @access  Private
router.get('/threads', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { threads, total } = await chatService.getUserThreads(userId, page, limit);
    
    res.json(createPaginatedResponse(threads, page, limit, total));
  } catch (error) {
    next(error);
  }
});

// @route   GET /chat/thread/:id/messages
// @desc    Get messages for a specific thread with pagination
// @access  Private
router.get('/thread/:id/messages', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const threadId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Cap at 100
    const password = req.query.password as string;

    const result = await chatService.getThreadMessages(threadId, userId, page, limit, password);
    
    // If password is needed, return special response
    if (result.needsPassword) {
      res.status(403).json({
        success: false,
        error: 'Password required',
        needsPassword: true
      });
      return;
    }

    const response = createPaginatedResponse(result.messages, page, limit, result.total);
    
    // Add hasMore to meta field
    res.json({
      ...response,
      meta: {
        ...response.pagination,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /chat/thread/:id
// @desc    Delete a chat thread
// @access  Private
router.delete('/thread/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const threadId = req.params.id;

    await chatService.deleteThread(threadId, userId);
    res.json(createSuccessResponse(null, 'Thread deleted successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /chat/thread/:id
// @desc    Rename a chat thread
// @access  Private
router.patch('/thread/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const threadId = req.params.id;
    const { title } = req.body;

    const thread = await chatService.renameThread(threadId, userId, title);
    res.json(createSuccessResponse(thread, 'Thread renamed successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /chat/message
// @desc    Send a message and get AI response (SSE stream)
// @access  Private
router.post('/message', 
  chatLimiter,
  validateRequest(CreateMessageSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // Send initial connection confirmation
      res.write('data: {"type":"connected"}\n\n');

      try {
        // Get password from request if provided
        const password = req.body.password as string;
        
        // Stream the AI response
        for await (const chunk of chatService.streamMessage(req.body, userId, password)) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } catch (streamError) {
        // Send error through stream
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: streamError instanceof Error ? streamError.message : 'Unknown error'
        })}\n\n`);
      }

      // Close the stream
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /chat/stats
// @desc    Get user's chat statistics
// @access  Private
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const stats = await chatService.getUserChatStats(userId);
    res.json(createSuccessResponse(stats, 'Chat statistics retrieved'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /chat/thread/:id/password
// @desc    Set password for a thread
// @access  Private
router.post('/thread/:id/password', 
  validateRequest(SetThreadPasswordSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      const threadId = req.params.id;
      const { password } = req.body;

      await chatService.setThreadPassword(threadId, userId, password);
      res.json(createSuccessResponse(null, 'Thread password set successfully'));
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /chat/thread/:id/verify-password
// @desc    Verify password for a thread
// @access  Private
router.post('/thread/:id/verify-password',
  validateRequest(VerifyThreadPasswordSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      const threadId = req.params.id;
      const { password } = req.body;

      const isValid = await chatService.verifyThreadPassword(threadId, userId, password);
      res.json(createSuccessResponse({ isValid }, 'Password verification completed'));
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /chat/thread/:id/password
// @desc    Update password for a thread
// @access  Private
router.put('/thread/:id/password',
  validateRequest(UpdateThreadPasswordSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      const threadId = req.params.id;
      const { currentPassword, newPassword } = req.body;

      await chatService.updateThreadPassword(threadId, userId, currentPassword, newPassword);
      res.json(createSuccessResponse(null, 'Thread password updated successfully'));
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /chat/thread/:id/password
// @desc    Remove password from a thread
// @access  Private
router.delete('/thread/:id/password',
  validateRequest(DeleteThreadPasswordSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      const threadId = req.params.id;
      const { currentPassword } = req.body;

      await chatService.deleteThreadPassword(threadId, userId, currentPassword);
      res.json(createSuccessResponse(null, 'Thread password removed successfully'));
    } catch (error) {
      next(error);
    }
  }
);

export default router;