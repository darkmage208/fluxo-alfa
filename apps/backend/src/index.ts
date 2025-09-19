import app from './app';
import { env } from './config/env';
import { connectRedis } from './config/redis';
import { prisma } from './config/database';
import logger from './config/logger';
import { InitializationService } from './services/initializationService';

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    
    // Test database connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    // Initialize application services (model pricing, task queue, etc.)
    const initService = InitializationService.getInstance();
    await initService.initialize();
    logger.info('✅ Application services initialized');

    // Start the server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📚 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await initService.shutdown();
      server.close(() => {
        logger.info('Process terminated');
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await initService.shutdown();
      await prisma.$disconnect();
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();