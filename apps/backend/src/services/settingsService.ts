import { prisma } from '../config/database';
import logger from '../config/logger';
import { AI_CONFIG } from '@fluxo/shared';

export class SettingsService {
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clear cache periodically
    setInterval(() => {
      this.clearExpiredCache();
    }, this.cacheExpiry);
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }

  async getSetting(key: string, defaultValue?: any): Promise<any> {
    try {
      // Check cache first
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.value;
      }

      // Fetch from database
      const setting = await prisma.systemSettings.findUnique({
        where: { key, isActive: true },
      });

      if (!setting) {
        logger.warn(`Setting not found: ${key}, using default value`);
        return defaultValue;
      }

      // Parse value based on type
      let parsedValue;
      switch (setting.type) {
        case 'number':
          parsedValue = parseFloat(setting.value);
          break;
        case 'boolean':
          parsedValue = setting.value.toLowerCase() === 'true';
          break;
        case 'json':
          try {
            parsedValue = JSON.parse(setting.value);
          } catch (error) {
            logger.error(`Failed to parse JSON for setting ${key}:`, error);
            parsedValue = defaultValue;
          }
          break;
        default:
          parsedValue = setting.value;
      }

      // Cache the result
      this.cache.set(key, {
        value: parsedValue,
        timestamp: Date.now(),
      });

      return parsedValue;
    } catch (error) {
      logger.error(`Error fetching setting ${key}:`, error);
      return defaultValue;
    }
  }

  async getSystemPrompt(): Promise<string> {
    return await this.getSetting('system_prompt', AI_CONFIG.SYSTEM_PROMPT);
  }

  async getAIModel(): Promise<string> {
    return await this.getSetting('ai_model', AI_CONFIG.MODEL);
  }

  async getMaxTokens(): Promise<number> {
    return await this.getSetting('max_tokens', AI_CONFIG.MAX_TOKENS);
  }

  async getTemperature(): Promise<number> {
    return await this.getSetting('temperature', AI_CONFIG.TEMPERATURE);
  }

  async getFreeMessageLimit(): Promise<number> {
    return await this.getSetting('free_message_limit', 5);
  }

  // Invalidate cache for a specific key
  invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get all AI-related settings
  async getAISettings(): Promise<{
    systemPrompt: string;
    model: string;
    maxTokens: number;
    temperature: number;
  }> {
    const [systemPrompt, model, maxTokens, temperature] = await Promise.all([
      this.getSystemPrompt(),
      this.getAIModel(),
      this.getMaxTokens(),
      this.getTemperature(),
    ]);

    return {
      systemPrompt,
      model,
      maxTokens,
      temperature,
    };
  }
}