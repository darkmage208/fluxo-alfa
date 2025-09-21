import OpenAI from 'openai';
import { env } from '../config/env';
import logger from '../config/logger';
import { calculateTokens } from '@fluxo/shared';
import { ModelPricingService } from './modelPricingService';
import { SettingsService } from './settingsService';

export class OpenAIService {
  private openai: OpenAI;
  private pricingService: ModelPricingService;
  private settingsService: SettingsService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    this.pricingService = new ModelPricingService();
    this.settingsService = new SettingsService();
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
      // Get AI settings from database
      const aiSettings = await this.settingsService.getAISettings();

      // Prepare system message with adaptive content based on context availability
      const systemMessage = {
        role: 'system' as const,
        content: await this.getContextualSystemPrompt(context)
      };

      const allMessages = [systemMessage, ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))];

      const stream = await this.openai.chat.completions.create({
        model: aiSettings.model || env.INFERENCE_MODEL,
        messages: allMessages,
        stream: true,
        max_tokens: aiSettings.maxTokens || 4096,
        temperature: aiSettings.temperature || 0.7,
        stream_options: { include_usage: true }
      });

      let fullResponse = '';
      let tokensInput = 0;
      let tokensOutput = 0;
      let chunkBuffer = '';
      let sentChunkLength = 0; // Track what we've already sent

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          chunkBuffer += content;
          
          // Implement natural chunking - send chunks at sentence boundaries for better UX
          const sentences = chunkBuffer.split(/(?<=[.!?])\s+/);
          
          if (sentences.length > 1) {
            // Send all complete sentences except the last one
            const completeText = sentences.slice(0, -1).join(' ').trim();
            if (completeText && completeText.length > sentChunkLength) {
              // Only send the new part that hasn't been sent yet
              const newContent = completeText.substring(sentChunkLength);
              if (newContent) {
                yield {
                  content: newContent + ' ',
                  fullResponse,
                  tokensInput: 0,
                  tokensOutput: 0,
                  finished: false,
                  isChunked: true
                };
                sentChunkLength = completeText.length;
              }
            }
            // Keep the incomplete sentence for the next iteration
            chunkBuffer = sentences[sentences.length - 1] || '';
            sentChunkLength = 0; // Reset counter for the new buffer
          } else if (chunkBuffer.length > sentChunkLength + 30) {
            // If we have significant new content but no complete sentence, send it for immediate feedback
            const newContent = chunkBuffer.substring(sentChunkLength);
            yield {
              content: newContent,
              fullResponse,
              tokensInput: 0,
              tokensOutput: 0,
              finished: false
            };
            sentChunkLength = chunkBuffer.length;
          }
        }

        // Get actual token usage from the final chunk
        if (chunk.usage) {
          tokensInput = chunk.usage.prompt_tokens;
          tokensOutput = chunk.usage.completion_tokens;
        }
      }

      // Fallback to estimation if OpenAI doesn't provide usage
      if (!tokensInput) {
        const inputText = allMessages.map(m => m.content).join(' ');
        tokensInput = calculateTokens(inputText);
      }
      if (!tokensOutput) {
        tokensOutput = calculateTokens(fullResponse);
      }

      // Send any remaining content in the buffer
      if (chunkBuffer.trim() && chunkBuffer.length > sentChunkLength) {
        const finalContent = chunkBuffer.substring(sentChunkLength);
        if (finalContent.trim()) {
          yield {
            content: finalContent,
            fullResponse,
            tokensInput: 0,
            tokensOutput: 0,
            finished: false
          };
        }
      }

      // Calculate costs with dynamic pricing
      const costCalculation = await this.pricingService.calculateInferenceCost(
        'openai',
        env.INFERENCE_MODEL,
        tokensInput,
        tokensOutput
      );

      yield {
        content: '',
        fullResponse,
        tokensInput,
        tokensOutput,
        cost: costCalculation.totalCost,
        finished: true
      };

    } catch (error) {
      logger.error('OpenAI streaming error:', error);
      throw error;
    }
  }

  async calculateEmbeddingCost(tokenCount: number): Promise<number> {
    return await this.pricingService.calculateEmbeddingCost(
      'openai',
      env.EMBEDDING_MODEL,
      tokenCount
    );
  }

  async generateSummary(messages: Array<{ role: string; content: string }>): Promise<{
    summary: string;
    tokensInput: number;
    tokensOutput: number;
    cost: number;
  }> {
    try {
      // Get AI settings from database
      const aiSettings = await this.settingsService.getAISettings();

      const response = await this.openai.chat.completions.create({
        model: aiSettings.model || env.INFERENCE_MODEL,
        messages: messages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content
        })),
        max_tokens: 300,
        temperature: 0.3,
      });

      const summary = response.choices[0]?.message?.content || '';
      const tokensInput = response.usage?.prompt_tokens || 0;
      const tokensOutput = response.usage?.completion_tokens || 0;

      // Calculate cost for summary generation
      const costCalculation = await this.pricingService.calculateInferenceCost(
        'openai',
        env.INFERENCE_MODEL,
        tokensInput,
        tokensOutput
      );

      return {
        summary,
        tokensInput,
        tokensOutput,
        cost: costCalculation.totalCost
      };
    } catch (error) {
      logger.error('OpenAI summary generation error:', error);
      throw error;
    }
  }

  private async getContextualSystemPrompt(context?: string): Promise<string> {
    // Get the system prompt from database, fallback to default if not available
    const basePrompt = await this.settingsService.getSystemPrompt();

    if (context && context.trim()) {
      return `${basePrompt}

**Importante**: Você tem acesso a informações relevantes da base de conhecimento do usuário:

${context}

Use essas informações para fornecer respostas precisas e informadas. Integre os detalhes relevantes naturalmente à sua conversa, sem mencionar explicitamente "com base no contexto" ou frases semelhantes. Se as informações fornecidas não abordarem completamente a pergunta do usuário, responda naturalmente.
`;
    } else {
      return `${basePrompt}

Observação: Nenhuma informação contextual específica está disponível para esta consulta, portanto, forneça respostas úteis com base no seu conhecimento geral.
`;
    }
  }

}