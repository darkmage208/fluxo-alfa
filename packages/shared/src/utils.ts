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

export const chunkText = (text: string, maxChunkSize: number = 1000, overlap: number = 100): string[] => {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + maxChunkSize, text.length);
    let chunk = text.slice(startIndex, endIndex);

    // Try to end at a natural boundary (sentence, paragraph, etc.)
    if (endIndex < text.length) {
      const lastSentenceEnd = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const lastSpace = chunk.lastIndexOf(' ');
      
      const boundary = Math.max(lastSentenceEnd, lastNewline, lastSpace);
      if (boundary > maxChunkSize * 0.7) { // Only use boundary if it's not too far back
        chunk = chunk.slice(0, boundary + 1);
      }
    }

    chunks.push(chunk.trim());
    
    // Move start index, accounting for overlap
    startIndex = startIndex + chunk.length - overlap;
    if (startIndex >= text.length) break;
  }

  return chunks.filter(chunk => chunk.length > 0);
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