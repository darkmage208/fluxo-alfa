import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isStreaming: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  messageInput,
  setMessageInput,
  onSendMessage,
  isStreaming,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && messageInput.trim()) {
        onSendMessage(e as any);
      }
    }
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [messageInput]);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm p-6">
      <div className="max-w-6xl mx-auto">
        <form onSubmit={onSendMessage} className="flex items-end space-x-4">
          <div className="flex-1 relative">
            <div className="relative rounded-2xl border border-border bg-background/80 backdrop-blur-sm shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
              <textarea
                ref={textareaRef}
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  autoResizeTextarea();
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Type your message..."
                disabled={isStreaming}
                className="w-full p-4 bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground text-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl"
                style={{ minHeight: '52px', maxHeight: '200px' }}
                rows={1}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={!messageInput.trim() || isStreaming}
            className="h-12 w-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};