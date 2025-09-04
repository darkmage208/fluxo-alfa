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

    // Create comprehensive test payments with all payment methods
    const allUsers = await prisma.user.findMany({
      include: {
        subscription: true
      }
    });

    const paymentMethods = [
      'stripe',
      'mercado_pago', 
      'kiwify',
      'credit_card',
      'pix',
      'boleto_bancario',
      'wallet',
      'bank_debit',
      'paypal',
      'apple_pay',
      'google_pay'
    ];

    const paymentTypes = ['subscription', 'one_time', 'refund', 'chargeback'];
    const paymentStatuses = ['succeeded', 'failed', 'pending', 'refunded'];
    const currencies = ['usd', 'brl', 'eur'];

    for (const user of allUsers) {
      const paymentCount = Math.floor(Math.random() * 8) + 2; // 2-10 payments per user
      
      for (let i = 0; i < paymentCount; i++) {
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
        const currency = currencies[Math.floor(Math.random() * currencies.length)];
        
        // Bias towards successful payments (80% success rate)
        const status = Math.random() < 0.8 ? 'succeeded' : 
                      Math.random() < 0.7 ? 'failed' : 
                      Math.random() < 0.8 ? 'pending' : 'refunded';

        // Different amounts based on type and currency
        let amount;
        if (currency === 'brl') {
          amount = paymentType === 'subscription' ? 149.90 : (Math.random() * 500 + 50);
        } else if (currency === 'eur') {
          amount = paymentType === 'subscription' ? 24.99 : (Math.random() * 100 + 20);
        } else {
          amount = paymentType === 'subscription' ? 29.99 : (Math.random() * 100 + 10);
        }

        // Refunds should be negative amounts
        if (paymentType === 'refund') {
          amount = -Math.abs(amount);
        }

        const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Random date within last 90 days

        const paymentData = {
          userId: user.id,
          subscriptionId: user.subscription?.id || null,
          amount: Number(amount.toFixed(2)),
          currency,
          status,
          type: paymentType,
          paymentMethod,
          description: getPaymentDescription(paymentType, paymentMethod, currency),
          createdAt,
          gatewayResponse: generateGatewayResponse(paymentMethod, status),
          metadata: generatePaymentMetadata(paymentMethod, paymentType)
        };

        // Add method-specific transaction IDs
        switch (paymentMethod) {
          case 'stripe':
            paymentData.stripePaymentIntentId = `pi_test_${Math.random().toString(36).substr(2, 9)}`;
            paymentData.stripeChargeId = `ch_test_${Math.random().toString(36).substr(2, 9)}`;
            break;
          case 'mercado_pago':
            paymentData.mercadoPagoPaymentId = Math.floor(Math.random() * 999999999).toString();
            break;
          case 'kiwify':
            paymentData.kiwifyTransactionId = `kw_${Math.random().toString(36).substr(2, 12)}`;
            break;
        }

        await prisma.payment.create({ data: paymentData });
      }
    }

    // Helper functions for generating realistic test data
    function getPaymentDescription(type, method, currency) {
      const descriptions = {
        subscription: [
          `Monthly Pro subscription - ${method}`,
          `Premium plan renewal via ${method}`,
          `Subscription payment (${currency.toUpperCase()})`
        ],
        one_time: [
          `One-time purchase via ${method}`,
          `Additional credits purchase`,
          `Premium feature unlock`
        ],
        refund: [
          `Refund for subscription cancellation`,
          `Customer refund request`,
          `Disputed charge refund`
        ],
        chargeback: [
          `Chargeback dispute`,
          `Bank reversal`,
          `Card dispute`
        ]
      };
      
      const typeDescriptions = descriptions[type] || ['Payment'];
      return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
    }

    function generateGatewayResponse(method, status) {
      const baseResponse = {
        method,
        processed_at: new Date().toISOString(),
        status
      };

      switch (method) {
        case 'stripe':
          return {
            ...baseResponse,
            stripe_fee: Math.random() * 2 + 0.30,
            card_last4: Math.floor(Math.random() * 9000) + 1000,
            card_brand: ['visa', 'mastercard', 'amex'][Math.floor(Math.random() * 3)]
          };
        case 'mercado_pago':
          return {
            ...baseResponse,
            mercadopago_fee: Math.random() * 3 + 0.50,
            payment_type: ['credit_card', 'debit_card', 'pix'][Math.floor(Math.random() * 3)]
          };
        case 'kiwify':
          return {
            ...baseResponse,
            kiwify_fee: Math.random() * 2 + 0.25,
            transaction_type: 'digital_product'
          };
        default:
          return baseResponse;
      }
    }

    function generatePaymentMetadata(method, type) {
      return {
        source: 'admin_test_data',
        payment_flow: type === 'subscription' ? 'recurring' : 'one_time',
        user_agent: 'Mozilla/5.0 Test Browser',
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        method_details: {
          gateway: method,
          processed_by: 'test_system'
        }
      };
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