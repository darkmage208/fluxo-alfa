import React from 'react';
import { formatDate } from '@/lib/utils';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { User, Bot } from 'lucide-react';
import type { Message as MessageType } from '@shared/types';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  return (
    <div className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex items-start space-x-3 max-w-[90%] sm:max-w-[75%] ${
          message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
        }`}
      >
        <div
          className={
            'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm ring-2 ring-offset-2 ring-offset-background bg-accent text-accent-foreground ring-border'
          }
        >
          {message.role === 'user' ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>
        <div
          className={'rounded-2xl shadow-sm border backdrop-blur-sm flex-1 bg-card/95 text-foreground border-border shadow-md'}
        >
          <div className="px-4 py-3">
            {message.role === 'user' ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownRenderer 
                content={message.content} 
                className="text-sm leading-relaxed text-foreground"
              />
            )}
          </div>
          <div className={'px-4 pb-2 text-xs font-medium text-muted-foreground'}>
            {formatDate(message.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
};