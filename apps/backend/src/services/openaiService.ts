import OpenAI from 'openai';
import { env } from '../config/env';
import logger from '../config/logger';
import { calculateTokens } from '@fluxo/shared';

export class OpenAIService {
  private openai: OpenAI;
  private pricing: any;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    
    this.pricing = env.PRICING_JSON;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: env.EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  async *streamChatCompletion(messages: Array<{ role: string; content: string }>, context?: string) {
    try {
      // Prepare system message with context
      const systemMessage = context 
        ? {
            role: 'system' as const,
            content: `${this.getSystemPrompt()}\n\nContext:\n${context}`
          }
        : {
            role: 'system' as const,
            content: this.getSystemPrompt()
          };

      const allMessages = [systemMessage, ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))];

      const stream = await this.openai.chat.completions.create({
        model: env.INFERENCE_MODEL,
        messages: allMessages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      });

      let fullResponse = '';
      let tokensInput = 0;
      let tokensOutput = 0;

      // Calculate input tokens
      const inputText = allMessages.map(m => m.content).join(' ');
      tokensInput = calculateTokens(inputText);

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          tokensOutput = calculateTokens(fullResponse);
          
          yield {
            content,
            fullResponse,
            tokensInput,
            tokensOutput,
            finished: false
          };
        }
      }

      // Calculate costs
      const inputCost = (tokensInput / 1000) * this.pricing.inference_model.input_per_1k;
      const outputCost = (tokensOutput / 1000) * this.pricing.inference_model.output_per_1k;
      const totalCost = inputCost + outputCost;

      yield {
        content: '',
        fullResponse,
        tokensInput,
        tokensOutput,
        cost: totalCost,
        finished: true
      };

    } catch (error) {
      logger.error('OpenAI streaming error:', error);
      throw error;
    }
  }

  calculateEmbeddingCost(tokenCount: number): number {
    return (tokenCount / 1000) * this.pricing.embedding_model.per_1k;
  }

  private getSystemPrompt(): string {
    return `You are an AI assistant that provides helpful, accurate, and contextual responses based on the provided context.

When responding:
1. Use the provided context to inform your answers
2. Be concise and direct
3. If the context doesn't contain enough information, acknowledge this
4. Maintain a helpful and professional tone
5. Do not make up information not present in the context`;
  }
}