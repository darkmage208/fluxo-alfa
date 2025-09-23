const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://user:password@localhost:5432/fluxoalfa'
    }
  }
});

async function testDirectMetrics() {
  console.log('Testing direct database metrics...');

  try {
    // Test the same queries that the admin service uses
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      freeUsers,
      proUsers,
      totalSubscriptions,
      activeSubscriptions,
      totalChatMessages,
      totalTokensResult,
      totalCostResult,
      totalRevenueResult
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({
        where: {
          OR: [
            { subscription: { planId: 'free' } },
            { subscription: null }
          ]
        }
      }),
      prisma.user.count({ where: { subscription: { planId: 'pro' } } }),

      // Subscription counts
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'active' } }),

      // Chat statistics
      prisma.chatMessage.aggregate({
        _count: { id: true },
        _sum: { tokensInput: true, tokensOutput: true, tokensEmbedding: true }
      }),
      prisma.chatMessage.aggregate({
        _sum: { tokensInput: true, tokensOutput: true, tokensEmbedding: true }
      }),
      prisma.chatMessage.aggregate({
        _sum: { costUsd: true, embeddingCostUsd: true }
      }),

      // Revenue statistics
      prisma.payment.aggregate({
        where: { status: 'succeeded' },
        _sum: { amount: true }
      })
    ]);

    // Calculate totals
    const totalTokens = (totalTokensResult._sum.tokensInput || 0) +
                       (totalTokensResult._sum.tokensOutput || 0) +
                       (totalTokensResult._sum.tokensEmbedding || 0);
    const totalCost = (Number(totalCostResult._sum.costUsd) || 0) +
                     (Number(totalCostResult._sum.embeddingCostUsd) || 0);
    const totalRevenue = Number(totalRevenueResult._sum.amount) || 0;
    const totalChats = totalChatMessages._count.id || 0;

    const metrics = {
      totalUsers,
      activeUsers,
      freeUsers,
      proUsers,
      totalSubscriptions,
      activeSubscriptions,
      totalChats,
      totalTokens,
      totalCost,
      totalRevenue
    };

    console.log('✅ Direct metrics from database:');
    console.log(JSON.stringify(metrics, null, 2));

    // Verify we have test data
    if (totalUsers > 0) {
      console.log('✅ Test data found in database');
    } else {
      console.log('❌ No test data found - make sure to run the seeding script');
    }

  } catch (error) {
    console.error('❌ Error testing direct metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectMetrics();