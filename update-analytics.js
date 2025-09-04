const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAnalytics() {
  try {
    console.log('Updating analytics aggregations...');

    // Get all chat messages to process
    const messages = await prisma.chatMessage.findMany({
      include: {
        thread: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Processing ${messages.length} messages...`);

    for (const message of messages) {
      const userId = message.thread.userId;
      const createdAt = message.createdAt;
      const date = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      const year = createdAt.getFullYear();
      const month = createdAt.getMonth() + 1;

      // Check if this is the first message in the thread
      const firstMessage = await prisma.chatMessage.findFirst({
        where: { threadId: message.threadId },
        orderBy: { createdAt: 'asc' }
      });
      const isNewThread = firstMessage.id === message.id && message.role === 'user';

      // Update daily usage
      await prisma.dailyUsage.upsert({
        where: {
          userId_date: { userId, date }
        },
        update: {
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: message.tokensInput },
          tokensOutput: { increment: message.tokensOutput },
          tokensEmbedding: { increment: message.tokensEmbedding },
          costUsd: { increment: message.costUsd },
          embeddingCostUsd: { increment: message.embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          userId,
          date,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput: message.tokensInput,
          tokensOutput: message.tokensOutput,
          tokensEmbedding: message.tokensEmbedding,
          costUsd: message.costUsd,
          embeddingCostUsd: message.embeddingCostUsd,
        },
      });

      // Update monthly usage
      await prisma.monthlyUsage.upsert({
        where: {
          userId_year_month: { userId, year, month }
        },
        update: {
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: message.tokensInput },
          tokensOutput: { increment: message.tokensOutput },
          tokensEmbedding: { increment: message.tokensEmbedding },
          costUsd: { increment: message.costUsd },
          embeddingCostUsd: { increment: message.embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          userId,
          year,
          month,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput: message.tokensInput,
          tokensOutput: message.tokensOutput,
          tokensEmbedding: message.tokensEmbedding,
          costUsd: message.costUsd,
          embeddingCostUsd: message.embeddingCostUsd,
        },
      });

      // Update yearly usage
      await prisma.yearlyUsage.upsert({
        where: {
          userId_year: { userId, year }
        },
        update: {
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: message.tokensInput },
          tokensOutput: { increment: message.tokensOutput },
          tokensEmbedding: { increment: message.tokensEmbedding },
          costUsd: { increment: message.costUsd },
          embeddingCostUsd: { increment: message.embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          userId,
          year,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput: message.tokensInput,
          tokensOutput: message.tokensOutput,
          tokensEmbedding: message.tokensEmbedding,
          costUsd: message.costUsd,
          embeddingCostUsd: message.embeddingCostUsd,
        },
      });

      // Get current user counts
      const [totalUsers, activeUsers, freeUsers, proUsers] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({
          where: {
            subscription: {
              planId: 'free'
            }
          }
        }),
        prisma.user.count({
          where: {
            subscription: {
              planId: 'pro'
            }
          }
        }),
      ]);

      // Update system daily stats
      await prisma.systemDailyStats.upsert({
        where: { date },
        update: {
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: message.tokensInput },
          tokensOutput: { increment: message.tokensOutput },
          tokensEmbedding: { increment: message.tokensEmbedding },
          costUsd: { increment: message.costUsd },
          embeddingCostUsd: { increment: message.embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          date,
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput: message.tokensInput,
          tokensOutput: message.tokensOutput,
          tokensEmbedding: message.tokensEmbedding,
          costUsd: message.costUsd,
          embeddingCostUsd: message.embeddingCostUsd,
        },
      });

      // Update system monthly stats
      await prisma.systemMonthlyStats.upsert({
        where: {
          year_month: { year, month }
        },
        update: {
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: message.tokensInput },
          tokensOutput: { increment: message.tokensOutput },
          tokensEmbedding: { increment: message.tokensEmbedding },
          costUsd: { increment: message.costUsd },
          embeddingCostUsd: { increment: message.embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          year,
          month,
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput: message.tokensInput,
          tokensOutput: message.tokensOutput,
          tokensEmbedding: message.tokensEmbedding,
          costUsd: message.costUsd,
          embeddingCostUsd: message.embeddingCostUsd,
        },
      });

      // Update system yearly stats
      await prisma.systemYearlyStats.upsert({
        where: { year },
        update: {
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: { increment: 1 },
          chatsCount: isNewThread ? { increment: 1 } : undefined,
          tokensInput: { increment: message.tokensInput },
          tokensOutput: { increment: message.tokensOutput },
          tokensEmbedding: { increment: message.tokensEmbedding },
          costUsd: { increment: message.costUsd },
          embeddingCostUsd: { increment: message.embeddingCostUsd },
          updatedAt: new Date(),
        },
        create: {
          year,
          totalUsers,
          activeUsers,
          freeUsers,
          proUsers,
          messagesCount: 1,
          chatsCount: isNewThread ? 1 : 0,
          tokensInput: message.tokensInput,
          tokensOutput: message.tokensOutput,
          tokensEmbedding: message.tokensEmbedding,
          costUsd: message.costUsd,
          embeddingCostUsd: message.embeddingCostUsd,
        },
      });
    }

    // Update payment aggregations
    const payments = await prisma.payment.findMany({
      where: {
        status: 'succeeded'
      }
    });

    for (const payment of payments) {
      const createdAt = payment.createdAt;
      const date = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      const year = createdAt.getFullYear();
      const month = createdAt.getMonth() + 1;
      const amountUsd = payment.currency.toLowerCase() === 'usd' ? Number(payment.amount) : Number(payment.amount) * 0.85;

      // Update daily stats
      await prisma.systemDailyStats.upsert({
        where: { date },
        update: {
          revenueUsd: { increment: amountUsd },
          updatedAt: new Date(),
        },
        create: {
          date,
          revenueUsd: amountUsd,
          totalUsers: 0,
          activeUsers: 0,
          freeUsers: 0,
          proUsers: 0,
          messagesCount: 0,
          chatsCount: 0,
          tokensInput: 0,
          tokensOutput: 0,
          tokensEmbedding: 0,
          costUsd: 0,
          embeddingCostUsd: 0,
        },
      });

      // Update monthly stats
      await prisma.systemMonthlyStats.upsert({
        where: {
          year_month: { year, month }
        },
        update: {
          revenueUsd: { increment: amountUsd },
          updatedAt: new Date(),
        },
        create: {
          year,
          month,
          revenueUsd: amountUsd,
          totalUsers: 0,
          activeUsers: 0,
          freeUsers: 0,
          proUsers: 0,
          messagesCount: 0,
          chatsCount: 0,
          tokensInput: 0,
          tokensOutput: 0,
          tokensEmbedding: 0,
          costUsd: 0,
          embeddingCostUsd: 0,
        },
      });

      // Update yearly stats
      await prisma.systemYearlyStats.upsert({
        where: { year },
        update: {
          revenueUsd: { increment: amountUsd },
          updatedAt: new Date(),
        },
        create: {
          year,
          revenueUsd: amountUsd,
          totalUsers: 0,
          activeUsers: 0,
          freeUsers: 0,
          proUsers: 0,
          messagesCount: 0,
          chatsCount: 0,
          tokensInput: 0,
          tokensOutput: 0,
          tokensEmbedding: 0,
          costUsd: 0,
          embeddingCostUsd: 0,
        },
      });
    }

    console.log('Analytics aggregations updated successfully!');
  } catch (error) {
    console.error('Error updating analytics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAnalytics();