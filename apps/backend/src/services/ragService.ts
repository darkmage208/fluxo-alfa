import { prisma } from '../config/database';
import { OpenAIService } from './openaiService';
import logger from '../config/logger';
import { chunkText, DEFAULT_LIMITS } from '@fluxo/shared';

export class RAGService {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  async searchRelevantContext(query: string, limit: number = DEFAULT_LIMITS.MAX_SEARCH_RESULTS): Promise<string> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.openaiService.generateEmbedding(query);

      // Search for similar chunks using pgvector
      const similarChunks = await this.searchSimilarChunks(queryEmbedding, limit);

      if (similarChunks.length === 0) {
        return '';
      }

      // Combine relevant chunks into context
      const context = similarChunks
        .map(chunk => chunk.text)
        .join('\n\n');

      logger.info(`Found ${similarChunks.length} relevant chunks for query`);
      return context;
    } catch (error) {
      logger.error('RAG search error:', error);
      // Return empty context on error, don't fail the chat
      return '';
    }
  }

  private async searchSimilarChunks(embedding: number[], limit: number) {
    try {
      // Use raw SQL for vector similarity search
      const chunks = await prisma.$queryRaw`
        SELECT sc.text, sc.chunk_index, s.title,
               (sc.embedding <-> ${JSON.stringify(embedding)}::vector) as distance
        FROM source_chunks sc
        JOIN sources s ON sc.source_id = s.id
        WHERE s.is_active = true
        ORDER BY sc.embedding <-> ${JSON.stringify(embedding)}::vector
        LIMIT ${limit};
      `;

      return chunks as Array<{
        text: string;
        chunk_index: number;
        title: string;
        distance: number;
      }>;
    } catch (error) {
      logger.error('Vector search error:', error);
      return [];
    }
  }

  async processSource(sourceId: string): Promise<void> {
    try {
      const source = await prisma.source.findUnique({
        where: { id: sourceId },
      });

      if (!source) {
        throw new Error('Source not found');
      }

      // Delete existing chunks
      await prisma.sourceChunk.deleteMany({
        where: { sourceId },
      });

      // Chunk the text
      const chunks = chunkText(
        source.rawText,
        DEFAULT_LIMITS.MAX_CHUNK_SIZE,
        DEFAULT_LIMITS.CHUNK_OVERLAP
      );

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.openaiService.generateEmbedding(chunk);

        await prisma.sourceChunk.create({
          data: {
            sourceId,
            chunkIndex: i,
            text: chunk,
            embedding: JSON.stringify(embedding),
          },
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`Processed source: ${source.title} with ${chunks.length} chunks`);
    } catch (error) {
      logger.error('Process source error:', error);
      throw error;
    }
  }

  async reprocessAllSources(): Promise<void> {
    try {
      const sources = await prisma.source.findMany({
        where: { isActive: true },
      });

      for (const source of sources) {
        await this.processSource(source.id);
      }

      logger.info(`Reprocessed ${sources.length} sources`);
    } catch (error) {
      logger.error('Reprocess all sources error:', error);
      throw error;
    }
  }
}