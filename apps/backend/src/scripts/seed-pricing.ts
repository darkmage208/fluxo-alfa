#!/usr/bin/env tsx

/**
 * Model Pricing Seed Script
 *
 * This script initializes the model pricing data in the database
 * Run with: npx tsx src/scripts/seed-pricing.ts
 */

import { prisma } from '../config/database';
import logger from '../config/logger';

async function seedModelPricing() {
  console.log('🌱 Seeding model pricing data...\n');

  try {
    // OpenAI Models Pricing (as of 2024)
    const pricingData = [
      // GPT-4o-mini (current default)
      {
        provider: 'openai',
        modelName: 'gpt-4o-mini',
        modelType: 'inference',
        inputPer1k: 0.00015,  // $0.150 per 1M input tokens
        outputPer1k: 0.0006,  // $0.600 per 1M output tokens
        description: 'GPT-4o-mini: Fast and efficient model for most tasks'
      },

      // GPT-4o
      {
        provider: 'openai',
        modelName: 'gpt-4o',
        modelType: 'inference',
        inputPer1k: 0.0025,   // $2.50 per 1M input tokens
        outputPer1k: 0.01,    // $10.00 per 1M output tokens
        description: 'GPT-4o: High-performance model for complex tasks'
      },

      // GPT-4 Turbo
      {
        provider: 'openai',
        modelName: 'gpt-4-turbo',
        modelType: 'inference',
        inputPer1k: 0.01,     // $10.00 per 1M input tokens
        outputPer1k: 0.03,    // $30.00 per 1M output tokens
        description: 'GPT-4 Turbo: Previous generation high-performance model'
      },

      // GPT-3.5 Turbo
      {
        provider: 'openai',
        modelName: 'gpt-3.5-turbo',
        modelType: 'inference',
        inputPer1k: 0.0005,   // $0.50 per 1M input tokens
        outputPer1k: 0.0015,  // $1.50 per 1M output tokens
        description: 'GPT-3.5 Turbo: Cost-effective model for simple tasks'
      },

      // Text Embedding 3 Small
      {
        provider: 'openai',
        modelName: 'text-embedding-3-small',
        modelType: 'embedding',
        per1k: 0.00002,       // $0.02 per 1M tokens
        description: 'Text Embedding 3 Small: Efficient embedding model'
      },

      // Text Embedding 3 Large
      {
        provider: 'openai',
        modelName: 'text-embedding-3-large',
        modelType: 'embedding',
        per1k: 0.00013,       // $0.13 per 1M tokens
        description: 'Text Embedding 3 Large: High-quality embedding model'
      },

      // Ada v2 (legacy)
      {
        provider: 'openai',
        modelName: 'text-embedding-ada-002',
        modelType: 'embedding',
        per1k: 0.0001,        // $0.10 per 1M tokens
        description: 'Text Embedding Ada 002: Legacy embedding model'
      }
    ];

    let created = 0;
    let updated = 0;

    for (const pricing of pricingData) {
      // Check if pricing already exists
      const existing = await prisma.modelPricing.findFirst({
        where: {
          provider: pricing.provider,
          modelName: pricing.modelName,
          isActive: true,
        },
      });

      if (existing) {
        // Update existing pricing
        await prisma.modelPricing.update({
          where: { id: existing.id },
          data: {
            inputPer1k: pricing.inputPer1k || null,
            outputPer1k: pricing.outputPer1k || null,
            per1k: pricing.per1k || null,
            description: pricing.description,
            updatedAt: new Date(),
          },
        });
        updated++;
        console.log(`✅ Updated pricing for ${pricing.provider}:${pricing.modelName}`);
      } else {
        // Create new pricing
        await prisma.modelPricing.create({
          data: {
            provider: pricing.provider,
            modelName: pricing.modelName,
            modelType: pricing.modelType,
            inputPer1k: pricing.inputPer1k || null,
            outputPer1k: pricing.outputPer1k || null,
            per1k: pricing.per1k || null,
            description: pricing.description,
          },
        });
        created++;
        console.log(`✅ Created pricing for ${pricing.provider}:${pricing.modelName}`);
      }
    }

    console.log(`\n🎉 Pricing data seeded successfully!`);
    console.log(`📊 Summary:`);
    console.log(`  • Created: ${created} pricing records`);
    console.log(`  • Updated: ${updated} pricing records`);
    console.log(`  • Total: ${created + updated} pricing records processed`);

    // Display all active pricing
    console.log(`\n📋 Active Pricing Records:`);
    const allPricing = await prisma.modelPricing.findMany({
      where: { isActive: true },
      orderBy: [
        { provider: 'asc' },
        { modelType: 'asc' },
        { modelName: 'asc' }
      ]
    });

    allPricing.forEach(p => {
      if (p.modelType === 'inference') {
        console.log(`  • ${p.provider}:${p.modelName} - Input: $${Number(p.inputPer1k)}/1k, Output: $${Number(p.outputPer1k)}/1k`);
      } else {
        console.log(`  • ${p.provider}:${p.modelName} - $${Number(p.per1k)}/1k tokens`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to seed pricing data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedModelPricing().catch(console.error);
}