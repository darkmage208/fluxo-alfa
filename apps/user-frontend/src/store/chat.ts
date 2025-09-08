import { create } from 'zustand';
import { chatApi } from '@/lib/api';
import type { ChatThread, ChatMessage } from '@shared/types';

interface ChatState {
  threads: ChatThread[];
  currentThread: ChatThread | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessage: string;
  createThread: (title?: string) => Promise<ChatThread>;
  loadThreads: () => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  setCurrentThread: (thread: ChatThread | null) => void;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearStreamingMessage: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  currentThread: null,
  messages: [],
  isLoading: false,
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

  loadMessages: async (threadId: string) => {
    set({ isLoading: true });
    try {
      const messages = await chatApi.getThreadMessages(threadId);
      set({ messages, isLoading: false });
    } catch (error) {
      console.error('Failed to load messages:', error);
      set({ isLoading: false });
    }
  },

  setCurrentThread: (thread: ChatThread | null) => {
    set({ currentThread: thread, messages: [], streamingMessage: '' });
    if (thread) {
      get().loadMessages(thread.id);
    }
  },

  deleteThread: async (threadId: string) => {
    await chatApi.deleteThread(threadId);
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== threadId),
      currentThread: state.currentThread?.id === threadId ? null : state.currentThread,
      messages: state.currentThread?.id === threadId ? [] : state.messages,
    }));
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

  sendMessage: async (content: string) => {
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

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      streamingMessage: '',
    }));

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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
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

                set((state) => ({
                  messages: [...state.messages, assistantMessage],
                  isStreaming: false,
                  streamingMessage: '', // Clear streaming message when complete
                }));
                
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