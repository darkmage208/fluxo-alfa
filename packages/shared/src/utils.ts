import { ApiResponse, PaginatedResponse } from './types';

export const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

export const createErrorResponse = (error: string, message?: string): ApiResponse => ({
  success: false,
  error,
  message,
});

export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> => ({
  success: true,
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

export const sanitizeUser = (user: any) => {
  const { password_hash, ...sanitized } = user;
  return sanitized;
};

export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const splitIntoSentences = (text: string): string[] => {
  // Regex to split text into sentences
  // Handles common sentence endings (.!?) and preserves the punctuation
  // Also handles common abbreviations and edge cases
  const sentenceRegex = /[^.!?]+(?:[.!?](?:["']|(?=\s))?)/g;
  const matches = text.match(sentenceRegex) || [];
  
  // Clean and filter sentences
  return matches
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

export const chunkTextBySentences = (
  text: string, 
  maxChunkSize: number = 1000, 
  overlapSentences: number = 2
): string[] => {
  const sentences = splitIntoSentences(text);
  
  if (sentences.length === 0) return [];
  
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;
  let i = 0;
  
  while (i < sentences.length) {
    const sentence = sentences[i];
    const sentenceSize = sentence.length;
    
    // If adding this sentence would exceed max size and we have at least one sentence
    if (currentSize + sentenceSize > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.join(' '));
      
      // Start new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - overlapSentences);
      currentChunk = currentChunk.slice(overlapStart);
      currentSize = currentChunk.join(' ').length;
    }
    
    // Add sentence to current chunk
    currentChunk.push(sentence);
    currentSize += sentenceSize + 1; // +1 for space
    i++;
  }
  
  // Add remaining sentences
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  
  return chunks.filter(chunk => chunk.length > 0);
};

// Keep the old function for backward compatibility but use sentence-based internally
export const chunkText = (text: string, maxChunkSize: number = 1000, overlap: number = 100): string[] => {
  // Convert overlap from characters to approximate sentences (assuming ~100 chars per sentence)
  const overlapSentences = Math.max(1, Math.floor(overlap / 100));
  return chunkTextBySentences(text, maxChunkSize, overlapSentences);
};

export const calculateTokens = (text: string): number => {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};