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
    <form onSubmit={onSendMessage} className="w-full">
      <div className="relative flex rounded-2xl border border-border bg-background/80 backdrop-blur-sm shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
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
          className="w-full p-3 sm:p-4 pr-12 sm:pr-14 bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground text-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-sm sm:text-base"
          style={{ minHeight: '40px', maxHeight: '150px' }}
          rows={1}
        />
        <Button
          type="submit"
          disabled={!messageInput.trim() || isStreaming}
          className="absolute right-2 bottom-2 h-8 w-8 sm:h-9 sm:w-9 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground"
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
};