import { create } from 'zustand';
import { chatApi } from '@/lib/api';
import type { ChatThread, ChatMessage } from '@shared/types';

interface ThreadMessageCache {
  messages: ChatMessage[];
  total: number;
  hasMore: boolean;
  lastPage: number;
  password?: string; // Store the password for secured threads
}

interface ChatState {
  threads: ChatThread[];
  currentThread: ChatThread | null;
  messages: ChatMessage[];
  messageCache: Map<string, ThreadMessageCache>;
  isLoading: boolean;
  isLoadingMoreMessages: boolean;
  isStreaming: boolean;
  streamingMessage: string;
  createThread: (title?: string) => Promise<ChatThread>;
  loadThreads: () => Promise<void>;
  loadMessages: (threadId: string, page?: number, password?: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  setCurrentThread: (thread: ChatThread | null, password?: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  sendMessage: (content: string, password?: string) => Promise<void>;
  clearStreamingMessage: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  currentThread: null,
  messages: [],
  messageCache: new Map<string, ThreadMessageCache>(),
  isLoading: false,
  isLoadingMoreMessages: false,
  isStreaming: false,
  streamingMessage: '',

  createThread: async (title?: string) => {
    const thread = await chatApi.createThread(title);
    set((state) => ({
      threads: [thread, ...state.threads],
      currentThread: thread,
      messages: [],
    }));
    return thread;
  },

  loadThreads: async () => {
    set({ isLoading: true });
    try {
      const response = await chatApi.getThreads();
      set({ threads: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to load threads:', error);
      set({ isLoading: false });
    }
  },

  loadMessages: async (threadId: string, page: number = 1, password?: string) => {
    const { messageCache } = get();
    
    // Check if we have cached data for this thread
    const cachedData = messageCache.get(threadId);
    if (cachedData && page === 1) {
      set({ messages: cachedData.messages, isLoading: false });
      return;
    }

    set({ isLoading: page === 1, isLoadingMoreMessages: page > 1 });
    
    try {
      const response = await chatApi.getThreadMessages(threadId, page, undefined, password);
      const newMessages = response.data;
      const { total, hasMore } = response.meta;

      if (page === 1) {
        // First page - replace messages
        const cacheData: ThreadMessageCache = {
          messages: newMessages,
          total,
          hasMore,
          lastPage: 1,
          password, // Store the password for future pagination requests
        };
        
        set((state) => {
          const newCache = new Map(state.messageCache);
          newCache.set(threadId, cacheData);
          return {
            messages: newMessages,
            messageCache: newCache,
            isLoading: false,
            isLoadingMoreMessages: false,
          };
        });
      } else {
        // Subsequent pages - prepend messages (for infinite scroll upward)
        set((state) => {
          const existingCache = state.messageCache.get(threadId);
          if (existingCache) {
            const updatedMessages = [...newMessages, ...existingCache.messages];
            const updatedCache: ThreadMessageCache = {
              messages: updatedMessages,
              total,
              hasMore,
              lastPage: page,
              password: existingCache.password, // Preserve the password
            };
            
            const newCache = new Map(state.messageCache);
            newCache.set(threadId, updatedCache);
            
            return {
              messages: updatedMessages,
              messageCache: newCache,
              isLoading: false,
              isLoadingMoreMessages: false,
            };
          }
          return { isLoading: false, isLoadingMoreMessages: false };
        });
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      set({ isLoading: false, isLoadingMoreMessages: false });
      
      // If it's a 403 error, throw it so the UI can handle it
      if (error.response?.status === 403) {
        throw error;
      }
    }
  },

  loadMoreMessages: async () => {
    const { currentThread, messageCache, isLoadingMoreMessages } = get();

    if (!currentThread || isLoadingMoreMessages) return;

    const cachedData = messageCache.get(currentThread.id);
    if (!cachedData || !cachedData.hasMore) return;

    const nextPage = cachedData.lastPage + 1;
    await get().loadMessages(currentThread.id, nextPage, cachedData.password);
  },

  setCurrentThread: async (thread: ChatThread | null, password?: string) => {
    const { messageCache } = get();
    
    if (thread) {
      const cachedData = messageCache.get(thread.id);
      if (cachedData) {
        // Use cached messages immediately
        set({ 
          currentThread: thread, 
          messages: cachedData.messages, 
          streamingMessage: '',
          isLoading: false
        });
      } else {
        // No cache, load from server
        set({ currentThread: thread, messages: [], streamingMessage: '' });
        try {
          await get().loadMessages(thread.id, 1, password);
        } catch (error: any) {
          // If 403, reset current thread and rethrow
          if (error.response?.status === 403) {
            set({ currentThread: null, messages: [] });
            throw error;
          }
        }
      }
    } else {
      set({ currentThread: null, messages: [], streamingMessage: '' });
    }
  },

  deleteThread: async (threadId: string) => {
    await chatApi.deleteThread(threadId);
    set((state) => {
      const newCache = new Map(state.messageCache);
      newCache.delete(threadId); // Clear cache for deleted thread
      
      return {
        threads: state.threads.filter((t) => t.id !== threadId),
        currentThread: state.currentThread?.id === threadId ? null : state.currentThread,
        messages: state.currentThread?.id === threadId ? [] : state.messages,
        messageCache: newCache,
      };
    });
  },

  renameThread: async (threadId: string, title: string) => {
    await chatApi.renameThread(threadId, title);
    set((state) => ({
      threads: state.threads.map((t) => 
        t.id === threadId ? { ...t, title } : t
      ),
      currentThread: state.currentThread?.id === threadId 
        ? { ...state.currentThread, title } 
        : state.currentThread,
    }));
  },

  sendMessage: async (content: string, password?: string) => {
    const { currentThread } = get();
    if (!currentThread) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      threadId: currentThread.id,
      role: 'user',
      content,
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      createdAt: new Date(),
    };

    set((state) => {
      const newMessages = [...state.messages, userMessage];
      
      // Update cache with new user message
      const cachedData = state.messageCache.get(currentThread.id);
      if (cachedData) {
        const newCache = new Map(state.messageCache);
        newCache.set(currentThread.id, {
          ...cachedData,
          messages: newMessages,
          total: cachedData.total + 1,
        });
        
        return {
          messages: newMessages,
          messageCache: newCache,
          isStreaming: true,
          streamingMessage: '',
        };
      }
      
      return {
        messages: newMessages,
        isStreaming: true,
        streamingMessage: '',
      };
    });

    try {
      // Create a custom EventSource-like implementation
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          threadId: currentThread.id,
          content,
          ...(password && { password }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to send message';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If not JSON, use the text directly if it's meaningful
          if (errorText.length < 200) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let streamingContent = '';
      let buffer = ''; // Buffer for incomplete lines

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode the chunk and add to buffer
        const chunk = new TextDecoder().decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines only
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Skip empty lines
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              // Final message should already be added, just clean up
              set({ isStreaming: false, streamingMessage: '' });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'chunk') {
                // Server now sends properly incremental chunks without duplication
                const newContent = parsed.content || '';
                if (newContent) {
                  streamingContent += newContent;
                  set({ streamingMessage: streamingContent });
                }
              } else if (parsed.type === 'message') {
                // Alternative message type for incremental updates
                streamingContent += parsed.content || '';
                set({ streamingMessage: streamingContent });
              } else if (parsed.type === 'complete') {
                // Add the complete assistant message
                const assistantMessage: ChatMessage = {
                  id: parsed.messageId || 'temp-assistant-' + Date.now(),
                  threadId: currentThread.id,
                  role: 'assistant',
                  content: parsed.content || streamingContent, // Use the final content
                  tokensInput: parsed.tokensInput || 0,
                  tokensOutput: parsed.tokensOutput || 0,
                  costUsd: parsed.costUsd || 0,
                  createdAt: new Date(),
                };

                set((state) => {
                  const newMessages = [...state.messages, assistantMessage];
                  
                  // Update cache with assistant message
                  const cachedData = state.messageCache.get(currentThread.id);
                  if (cachedData) {
                    const newCache = new Map(state.messageCache);
                    newCache.set(currentThread.id, {
                      ...cachedData,
                      messages: newMessages,
                      total: cachedData.total + 1,
                    });
                    
                    return {
                      messages: newMessages,
                      messageCache: newCache,
                      isStreaming: false,
                      streamingMessage: '',
                    };
                  }
                  
                  return {
                    messages: newMessages,
                    isStreaming: false,
                    streamingMessage: '',
                  };
                });
                
                // Reload threads to get updated title from server
                // This ensures the frontend reflects any title changes made by the backend
                get().loadThreads();
                
                // Reset accumulator for next message
                streamingContent = '';
              } else if (parsed.type === 'error') {
                console.error('Streaming error:', parsed.error);
                set((state) => ({
                  messages: state.messages.slice(0, -1), // Remove the user message
                  isStreaming: false, 
                  streamingMessage: ''
                }));
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Log parse errors for debugging but continue
              if (e instanceof SyntaxError) {
                console.warn('Failed to parse SSE data:', data, e);
              } else {
                throw e;
              }
            }
          }
        }
      }
      
      // Process any remaining buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        if (data !== '[DONE]') {
          console.warn('Incomplete SSE message in buffer:', buffer);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      set((state) => ({
        messages: state.messages.slice(0, -1), // Remove the user message
        isStreaming: false,
        streamingMessage: ''
      }));
      throw error;
    }
  },

  clearStreamingMessage: () => {
    set({ streamingMessage: '', isStreaming: false });
  },
}));