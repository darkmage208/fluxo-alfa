import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import StreamingMarkdownRenderer from '@/components/StreamingMarkdownRenderer';
import TypingIndicator from '@/components/TypingIndicator';
import type { ChatThread, Message as MessageType } from '@shared/types';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { 
  MessageCircle, 
  Plus, 
  Bot,
  Menu
} from 'lucide-react';

interface ChatAreaProps {
  currentThread: ChatThread | null;
  messages: MessageType[];
  isStreaming: boolean;
  streamingMessage: string;
  messageInput: string;
  setMessageInput: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onCreateThread: () => void;
  isLoading: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;
  onLoadMoreMessages: () => void;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  previousScrollHeight: number;
  setPreviousScrollHeight: (height: number) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentThread,
  messages,
  isStreaming,
  streamingMessage,
  messageInput,
  setMessageInput,
  onSendMessage,
  onCreateThread,
  isLoading,
  setIsMobileSidebarOpen,
  hasMoreMessages,
  isLoadingMoreMessages,
  onLoadMoreMessages,
  messagesContainerRef,
  previousScrollHeight,
  setPreviousScrollHeight,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { loadMoreRef } = useInfiniteScroll({
    hasMore: hasMoreMessages,
    isLoading: isLoadingMoreMessages,
    onLoadMore: () => {
      const container = messagesContainerRef.current;
      if (container) {
        setPreviousScrollHeight(container.scrollHeight);
      }
      onLoadMoreMessages();
    },
    rootMargin: '50px',
  });

  // Scroll to bottom when entering a new thread
  useEffect(() => {
    if (currentThread && messagesEndRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 100);
    }
  }, [currentThread?.id]);

  // Scroll to bottom when new messages arrive or streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage]);

  // Maintain scroll position when loading more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && previousScrollHeight > 0 && !isLoadingMoreMessages) {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeight;
      container.scrollTop = container.scrollTop + scrollDiff;
      setPreviousScrollHeight(0);
    }
  }, [messages.length, isLoadingMoreMessages, previousScrollHeight, setPreviousScrollHeight]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Mobile Header */}
      <div className="sm:hidden p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="h-8 w-8 p-0"
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Fluxo Alfa Logo" className="w-6 h-6 rounded-md" />
            <img src="/fluxoalfa.png" alt="Fluxo Alfa" className="h-5 w-auto" />
          </div>
        </div>
      </div>
      
      {currentThread ? (
        <>
          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 thin-scrollbar">
            <div className="w-full max-w-4xl mx-auto space-y-6" style={{ minWidth: '320px' }}>
              {/* Load more messages trigger */}
              {hasMoreMessages && (
                <div ref={loadMoreRef} className="flex justify-center py-3">
                  {isLoadingMoreMessages ? (
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading more messages...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground/70">Scroll up for more messages</div>
                  )}
                </div>
              )}
              
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="w-full">
                    <Message message={message} />
                  </div>
                ))}
              </div>
              
              {/* Typing Indicator or Streaming Message */}
              {isStreaming && (
                <div className="w-full">
                  <div className="flex justify-start">
                    <div 
                      className="flex items-start space-x-3 w-full"
                      style={{
                        maxWidth: 'min(600px, max(90vw, 320px))',
                        minWidth: '320px'
                      }}
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center shadow-sm ring-2 ring-purple-200 dark:ring-purple-800 ring-offset-2 ring-offset-background">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="rounded-2xl shadow-md border border-border bg-card/95 backdrop-blur-sm flex-1">
                        {streamingMessage ? (
                          <div className="px-4 py-3">
                            <StreamingMarkdownRenderer 
                              content={streamingMessage} 
                              className="text-sm leading-relaxed text-foreground" 
                              isStreaming={true}
                            />
                            <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1 rounded-full"></span>
                          </div>
                        ) : (
                          <div className="px-4 py-3">
                            <TypingIndicator />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4 sm:p-6">
            <div className="w-full max-w-4xl mx-auto" style={{ minWidth: '320px' }}>
              <MessageInput
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                onSendMessage={onSendMessage}
                isStreaming={isStreaming}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Bot className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              New Chat Started
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Welcome to your new conversation! Your intelligent AI assistant is ready to help. Ask anything to get started.
            </p>
            <Button
              onClick={onCreateThread}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3 rounded-xl"
              size="lg"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Plus className="w-5 h-5 mr-2" />
              )}
              Start New Chat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};