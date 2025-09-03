import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger from '../config/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('🌱 Starting database seeding...');

    // Create plans if they don't exist
    await prisma.plan.upsert({
      where: { id: 'free' },
      update: {},
      create: {
        id: 'free',
        dailyChatLimit: 10,
        stripePriceId: null,
      },
    });

    await prisma.plan.upsert({
      where: { id: 'pro' },
      update: {},
      create: {
        id: 'pro',
        dailyChatLimit: null,
        stripePriceId: process.env.STRIPE_PRICE_PRO || 'price_placeholder',
      },
    });

    logger.info('✅ Plans created successfully');

    // Create admin user if it doesn't exist
    const adminEmail = 'admin@fluxoalfa.com';
    const adminPassword = 'admin123456';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashedPassword,
          role: 'admin',
          isActive: true,
        },
      });

      // Create subscription for admin
      await prisma.subscription.create({
        data: {
          userId: adminUser.id,
          planId: 'pro',
          status: 'active',
        },
      });

      logger.info('✅ Admin user created successfully');
      logger.info(`📧 Admin email: ${adminEmail}`);
      logger.info(`🔑 Admin password: ${adminPassword}`);
    } else {
      logger.info('ℹ️ Admin user already exists');
    }

    // Create sample sources for RAG
    const sampleSources = [
      {
        title: 'Welcome to Fluxo Alfa',
        rawText: `Fluxo Alfa is an AI-powered chat application that uses RAG (Retrieval-Augmented Generation) to provide contextual responses. 
        
        Our platform offers two plans:
        - Free Plan: 10 chats per day
        - Pro Plan: Unlimited chats with premium features
        
        The AI assistant can help answer questions based on the knowledge base and provide intelligent responses using the latest AI technology.`,
        tags: ['welcome', 'introduction', 'plans'],
        isActive: true,
      },
      {
        title: 'Getting Started Guide',
        rawText: `To get started with Fluxo Alfa:
        
        1. Sign up for an account using your email or Google account
        2. Start a new chat conversation
        3. Ask questions and get AI-powered responses
        4. Upgrade to Pro for unlimited access
        
        Features include:
        - Real-time streaming responses
        - Context-aware conversations
        - Multiple chat threads
        - User dashboard and analytics`,
        tags: ['guide', 'getting-started', 'features'],
        isActive: true,
      },
      {
        title: 'Subscription and Billing',
        rawText: `Fluxo Alfa uses Stripe for secure payment processing. 
        
        Free Plan includes:
        - 10 chat messages per day
        - Basic AI responses
        - Standard support
        
        Pro Plan includes:
        - Unlimited chat messages
        - Premium AI models
        - Priority support
        - Advanced features
        - Customer portal access
        
        You can manage your subscription, view billing history, and update payment methods through the customer portal.`,
        tags: ['billing', 'subscription', 'pricing', 'stripe'],
        isActive: true,
      },
    ];

    for (const source of sampleSources) {
      await prisma.source.upsert({
        where: { id: `seed-${source.title.toLowerCase().replace(/\s+/g, '-')}` },
        update: {},
        create: {
          ...source,
          id: `seed-${source.title.toLowerCase().replace(/\s+/g, '-')}`,
        },
      });
    }

    logger.info('✅ Sample sources created successfully');
    logger.info('🎉 Database seeding completed successfully!');

  } catch (error) {
    logger.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});