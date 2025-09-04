const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creating test data...');

    // Create test plans first
    await prisma.plan.upsert({
      where: { id: 'free' },
      update: {},
      create: {
        id: 'free',
        dailyChatLimit: 10,
      }
    });

    await prisma.plan.upsert({
      where: { id: 'pro' },
      update: {},
      create: {
        id: 'pro',
        dailyChatLimit: null,
        stripePriceId: 'price_test_pro'
      }
    });

    // Create test users
    const testUsers = [
      {
        email: 'admin@test.com',
        role: 'admin',
        plan: 'pro',
        isActive: true
      },
      {
        email: 'user1@test.com', 
        role: 'user',
        plan: 'free',
        isActive: true
      },
      {
        email: 'user2@test.com',
        role: 'user', 
        plan: 'pro',
        isActive: true
      },
      {
        email: 'user3@test.com',
        role: 'user',
        plan: 'free',
        isActive: false
      },
      {
        email: 'user4@test.com',
        role: 'user',
        plan: 'pro',
        isActive: true
      }
    ];

    const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvOKL1EZ8iWZQ7VgdXOVm2h/A1.B3Zk2kG'; // 'password123' hashed

    for (const userData of testUsers) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          passwordHash: hashedPassword,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
        }
      });

      // Create subscription for each user
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          planId: userData.plan,
          status: userData.isActive ? 'active' : 'canceled',
          paymentMethod: userData.plan === 'pro' ? 'stripe' : null,
          stripeCustomerId: userData.plan === 'pro' ? `cus_test_${user.id.slice(0, 8)}` : null,
          currentPeriodStart: userData.plan === 'pro' ? new Date() : null,
          currentPeriodEnd: userData.plan === 'pro' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        }
      });

      // Create some chat threads and messages for active users
      if (userData.isActive) {
        const threadCount = Math.floor(Math.random() * 5) + 1;
        
        for (let i = 0; i < threadCount; i++) {
          const thread = await prisma.chatThread.create({
            data: {
              userId: user.id,
              title: `Test Chat ${i + 1} for ${userData.email}`,
              createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last 7 days
            }
          });

          // Create messages for this thread
          const messageCount = Math.floor(Math.random() * 10) + 2;
          
          for (let j = 0; j < messageCount; j += 2) {
            const messageTime = new Date(thread.createdAt.getTime() + j * 30 * 60 * 1000); // 30 minutes apart
            
            // User message
            await prisma.chatMessage.create({
              data: {
                threadId: thread.id,
                role: 'user',
                content: `Test user message ${j + 1} in thread ${i + 1}`,
                tokensEmbedding: Math.floor(Math.random() * 100) + 50,
                embeddingCostUsd: (Math.random() * 0.001).toFixed(6),
                createdAt: messageTime
              }
            });

            // Assistant message
            await prisma.chatMessage.create({
              data: {
                threadId: thread.id,
                role: 'assistant',
                content: `Test assistant response ${j + 1} in thread ${i + 1}. This is a sample response with some details.`,
                tokensInput: Math.floor(Math.random() * 500) + 100,
                tokensOutput: Math.floor(Math.random() * 800) + 200,
                costUsd: (Math.random() * 0.01).toFixed(6),
                createdAt: new Date(messageTime.getTime() + 5000) // 5 seconds later
              }
            });
          }
        }
      }
    }

    // Create some test payments
    const proUsers = await prisma.user.findMany({
      where: {
        subscription: {
          planId: 'pro'
        }
      },
      include: {
        subscription: true
      }
    });

    for (const user of proUsers) {
      const paymentCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < paymentCount; i++) {
        await prisma.payment.create({
          data: {
            userId: user.id,
            subscriptionId: user.subscription.id,
            amount: 29.99,
            currency: 'usd',
            status: 'succeeded',
            type: 'subscription',
            paymentMethod: Math.random() > 0.5 ? 'stripe' : 'mercado_pago',
            description: `Monthly subscription - ${new Date().toLocaleDateString()}`,
            stripePaymentIntentId: `pi_test_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) // Random date within last 60 days
          }
        });
      }
    }

    console.log('Test data created successfully!');
    console.log('Test users created:');
    testUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}, ${user.plan} plan, ${user.isActive ? 'active' : 'inactive'})`);
    });
    console.log('\nYou can login with any email using password: password123');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();