#!/usr/bin/env tsx

/**
 * Application Startup Script
 *
 * This script initializes all application services
 * Run with: npx tsx src/scripts/startup.ts
 */

import { InitializationService } from '../services/initializationService';
import logger from '../config/logger';

async function startupServices() {
  console.log('🚀 Starting Fluxo Alfa Services...\n');

  try {
    const initService = InitializationService.getInstance();

    // Initialize all services
    await initService.initialize();

    // Show system stats
    const stats = await initService.getSystemStats();

    console.log('\n📊 System Statistics:');
    console.log(`  Pricing Models: ${stats.pricing.totalModels} active`);
    console.log(`  Task Queue: ${stats.taskQueue.pending} pending, ${stats.taskQueue.processing} processing`);
    console.log(`  Completed Tasks: ${stats.taskQueue.completed}`);
    console.log(`  Failed Tasks: ${stats.taskQueue.failed}`);

    console.log('\n✨ All services are running and ready!');
    console.log('🔄 Task queue is processing background tasks');
    console.log('💰 Dynamic pricing is active for accurate cost calculation');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down services...');
      await initService.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down services...');
      await initService.shutdown();
      process.exit(0);
    });

    // Log periodic stats
    setInterval(async () => {
      const currentStats = await initService.getSystemStats();
      logger.info('System Stats:', {
        taskQueue: currentStats.taskQueue,
        pricing: currentStats.pricing
      });
    }, 60000); // Every minute

  } catch (error) {
    console.error('❌ Failed to start services:', error);
    process.exit(1);
  }
}

// Run the startup function
if (require.main === module) {
  startupServices().catch(console.error);
}