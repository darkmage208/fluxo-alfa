import { Router } from 'express';
import { UnifiedBillingService } from '../../services/UnifiedBillingService';
import { schedulerService } from '../../services/SchedulerService';
import logger from '../../config/logger';

const router = Router();
const billingService = new UnifiedBillingService();

// Manual trigger for subscription expiration check
router.post('/check-expired', async (req, res) => {
  try {
    logger.info('Manual subscription expiration check triggered via API');
    await billingService.checkExpiredSubscriptions();

    res.json({
      success: true,
      message: 'Subscription expiration check completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Manual subscription expiration check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check expired subscriptions',
      details: error.message,
    });
  }
});

// Get subscription expiration status for a user
router.get('/expiration-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await billingService.getSubscriptionExpirationStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Failed to get subscription expiration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get expiration status',
      details: error.message,
    });
  }
});

// Get scheduler status
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = schedulerService.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Failed to get scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status',
      details: error.message,
    });
  }
});

// Manual trigger for scheduler expiration check
router.post('/scheduler/trigger-check', async (req, res) => {
  try {
    await schedulerService.triggerExpirationCheck();

    res.json({
      success: true,
      message: 'Scheduler expiration check triggered successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to trigger scheduler check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger expiration check',
      details: error.message,
    });
  }
});

export default router;