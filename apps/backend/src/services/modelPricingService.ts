import { prisma } from '../config/database';
import logger from '../config/logger';
import { env } from '../config/env';

interface PricingData {
  inputPer1k?: number;
  outputPer1k?: number;
  per1k?: number;
}

interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export class ModelPricingService {
  private pricingCache: Map<string, PricingData> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async initializePricing(): Promise<void> {
    try {
      // Initialize pricing data for current models
      await this.upsertModelPricing({
        provider: 'openai',
        modelName: env.INFERENCE_MODEL,
        modelType: 'inference',
        inputPer1k: 0.00025, // GPT-4o-mini: $0.150 per 1M input tokens -> $0.00015 per 1k
        outputPer1k: 0.0006,  // GPT-4o-mini: $0.600 per 1M output tokens -> $0.0006 per 1k
        description: 'GPT-4o-mini pricing'
      });

      await this.upsertModelPricing({
        provider: 'openai',
        modelName: env.EMBEDDING_MODEL,
        modelType: 'embedding',
        per1k: 0.00002, // text-embedding-3-small: $0.02 per 1M tokens
        description: 'Text Embedding 3 Small pricing'
      });

      // Add additional models that might be used
      await this.upsertModelPricing({
        provider: 'openai',
        modelName: 'gpt-4o',
        modelType: 'inference',
        inputPer1k: 0.0025,  // $2.50 per 1M input tokens
        outputPer1k: 0.01,   // $10.00 per 1M output tokens
        description: 'GPT-4o pricing'
      });

      await this.upsertModelPricing({
        provider: 'openai',
        modelName: 'gpt-4-turbo',
        modelType: 'inference',
        inputPer1k: 0.01,    // $10.00 per 1M input tokens
        outputPer1k: 0.03,   // $30.00 per 1M output tokens
        description: 'GPT-4 Turbo pricing'
      });

      logger.info('Model pricing initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize model pricing:', error);
      throw error;
    }
  }

  private async upsertModelPricing(data: {
    provider: string;
    modelName: string;
    modelType: string;
    inputPer1k?: number;
    outputPer1k?: number;
    per1k?: number;
    description?: string;
  }): Promise<void> {
    try {
      const existing = await prisma.modelPricing.findFirst({
        where: {
          provider: data.provider,
          modelName: data.modelName,
          isActive: true,
        },
      });

      if (existing) {
        // Update existing pricing
        await prisma.modelPricing.update({
          where: { id: existing.id },
          data: {
            inputPer1k: data.inputPer1k,
            outputPer1k: data.outputPer1k,
            per1k: data.per1k,
            description: data.description,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new pricing
        await prisma.modelPricing.create({
          data: {
            provider: data.provider,
            modelName: data.modelName,
            modelType: data.modelType,
            inputPer1k: data.inputPer1k,
            outputPer1k: data.outputPer1k,
            per1k: data.per1k,
            description: data.description,
          },
        });
      }

      // Clear cache for this model
      const cacheKey = `${data.provider}:${data.modelName}`;
      this.pricingCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    } catch (error) {
      logger.error('Failed to upsert model pricing:', error);
      throw error;
    }
  }

  async getModelPricing(provider: string, modelName: string): Promise<PricingData | null> {
    const cacheKey = `${provider}:${modelName}`;

    // Check cache first
    if (this.pricingCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.pricingCache.get(cacheKey) || null;
      }
    }

    try {
      const pricing = await prisma.modelPricing.findFirst({
        where: {
          provider,
          modelName,
          isActive: true,
          validFrom: { lte: new Date() },
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } }
          ]
        },
        orderBy: { validFrom: 'desc' }
      });

      if (pricing) {
        const pricingData: PricingData = {
          inputPer1k: pricing.inputPer1k ? Number(pricing.inputPer1k) : undefined,
          outputPer1k: pricing.outputPer1k ? Number(pricing.outputPer1k) : undefined,
          per1k: pricing.per1k ? Number(pricing.per1k) : undefined,
        };

        // Cache the result
        this.pricingCache.set(cacheKey, pricingData);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

        return pricingData;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get model pricing:', error);
      return null;
    }
  }

  async calculateInferenceCost(
    provider: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<CostCalculation> {
    const pricing = await this.getModelPricing(provider, modelName);

    if (!pricing || !pricing.inputPer1k || !pricing.outputPer1k) {
      logger.warn(`No pricing found for ${provider}:${modelName}, using fallback`);
      // Fallback to reasonable defaults for unknown models
      const inputCost = (inputTokens / 1000) * 0.001; // $1 per 1M tokens
      const outputCost = (outputTokens / 1000) * 0.002; // $2 per 1M tokens
      return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost
      };
    }

    const inputCost = (inputTokens / 1000) * pricing.inputPer1k;
    const outputCost = (outputTokens / 1000) * pricing.outputPer1k;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  async calculateEmbeddingCost(
    provider: string,
    modelName: string,
    tokens: number
  ): Promise<number> {
    const pricing = await this.getModelPricing(provider, modelName);

    if (!pricing || !pricing.per1k) {
      logger.warn(`No embedding pricing found for ${provider}:${modelName}, using fallback`);
      // Fallback to reasonable default
      return (tokens / 1000) * 0.0001; // $0.1 per 1M tokens
    }

    return (tokens / 1000) * pricing.per1k;
  }

  async updateModelPricing(
    provider: string,
    modelName: string,
    pricingData: Partial<PricingData> & { description?: string }
  ): Promise<void> {
    try {
      // Expire current pricing
      await prisma.modelPricing.updateMany({
        where: {
          provider,
          modelName,
          isActive: true,
        },
        data: {
          validUntil: new Date(),
          isActive: false,
        },
      });

      // Create new pricing record
      await prisma.modelPricing.create({
        data: {
          provider,
          modelName,
          modelType: pricingData.inputPer1k ? 'inference' : 'embedding',
          inputPer1k: pricingData.inputPer1k,
          outputPer1k: pricingData.outputPer1k,
          per1k: pricingData.per1k,
          description: pricingData.description,
        },
      });

      // Clear cache
      const cacheKey = `${provider}:${modelName}`;
      this.pricingCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);

      logger.info(`Updated pricing for ${provider}:${modelName}`);
    } catch (error) {
      logger.error('Failed to update model pricing:', error);
      throw error;
    }
  }

  async getAllActivePricing(): Promise<Array<{
    id: string;
    provider: string;
    modelName: string;
    modelType: string;
    inputPer1k?: number;
    outputPer1k?: number;
    per1k?: number;
    description?: string;
    validFrom: Date;
    validUntil?: Date;
  }>> {
    try {
      const pricingRecords = await prisma.modelPricing.findMany({
        where: {
          isActive: true,
        },
        orderBy: [
          { provider: 'asc' },
          { modelName: 'asc' },
          { validFrom: 'desc' }
        ]
      });

      return pricingRecords.map(record => ({
        id: record.id,
        provider: record.provider,
        modelName: record.modelName,
        modelType: record.modelType,
        inputPer1k: record.inputPer1k ? Number(record.inputPer1k) : undefined,
        outputPer1k: record.outputPer1k ? Number(record.outputPer1k) : undefined,
        per1k: record.per1k ? Number(record.per1k) : undefined,
        description: record.description || undefined,
        validFrom: record.validFrom,
        validUntil: record.validUntil || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get all active pricing:', error);
      throw error;
    }
  }

  // Method to warm up cache with frequently used models
  async warmUpCache(): Promise<void> {
    try {
      const commonModels = [
        { provider: 'openai', modelName: env.INFERENCE_MODEL },
        { provider: 'openai', modelName: env.EMBEDDING_MODEL },
        { provider: 'openai', modelName: 'gpt-4o' },
        { provider: 'openai', modelName: 'gpt-4-turbo' },
      ];

      await Promise.all(
        commonModels.map(model =>
          this.getModelPricing(model.provider, model.modelName)
        )
      );

      logger.info('Model pricing cache warmed up');
    } catch (error) {
      logger.error('Failed to warm up pricing cache:', error);
    }
  }

  // Clear expired cache entries
  clearExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.pricingCache.delete(key);
      this.cacheExpiry.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.debug(`Cleared ${expiredKeys.length} expired pricing cache entries`);
    }
  }
}