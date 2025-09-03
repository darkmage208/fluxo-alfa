import { prisma } from '../config/database';
import { OpenAIService } from './openaiService';
import logger from '../config/logger';
import { chunkTextBySentences, DEFAULT_LIMITS } from '@fluxo/shared';

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
      logger.info(`RAG: Finding source ${sourceId}`);
      const source = await prisma.source.findUnique({
        where: { id: sourceId },
      });

      if (!source) {
        throw new Error('Source not found');
      }

      logger.info(`RAG: Found source "${source.title}", deleting existing chunks`);
      // Delete existing chunks using raw SQL to avoid pgvector issues
      await prisma.$executeRaw`
        DELETE FROM source_chunks WHERE source_id = ${sourceId}::uuid
      `;

      logger.info(`RAG: Chunking text of length ${source.rawText.length}`);
      
      // Use sentence-based chunking for better context preservation
      const SAFE_CHUNK_SIZE = 800;  // Increased size since we're chunking by sentences
      const OVERLAP_SENTENCES = 2;  // Overlap by 2 sentences for better context continuity
      
      // Use the sentence-based chunking function
      const chunks = chunkTextBySentences(source.rawText, SAFE_CHUNK_SIZE, OVERLAP_SENTENCES);

      logger.info(`RAG: Generated ${chunks.length} chunks, starting embedding generation`);

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        try {
          logger.info(`RAG: Processing chunk ${i + 1}/${chunks.length}`);
          const chunk = chunks[i];
          
          logger.info(`RAG: Generating embedding for chunk ${i + 1}`);
          const embedding = await this.openaiService.generateEmbedding(chunk);
          
          if (!Array.isArray(embedding) || embedding.length !== 1536) {
            throw new Error(`Invalid embedding format for chunk ${i}, expected array of 1536 numbers`);
          }

          logger.info(`RAG: Inserting chunk ${i + 1} into database`);
          // Use raw query for inserting vector data since Prisma doesn't handle pgvector well
          await prisma.$executeRaw`
            INSERT INTO source_chunks (id, source_id, chunk_index, text, embedding)
            VALUES (gen_random_uuid(), ${sourceId}::uuid, ${i}, ${chunk}, ${JSON.stringify(embedding)}::vector)
          `;

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (chunkError) {
          logger.error(`RAG: Error processing chunk ${i + 1}:`, chunkError);
          throw chunkError;
        }
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