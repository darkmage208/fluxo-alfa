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
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex items-start space-x-3 max-w-[75%] ${
          message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
        }`}
      >
        <div
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm ring-2 ring-offset-2 ring-offset-background ${
            message.role === 'user'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-blue-200 dark:ring-blue-800'
              : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white ring-purple-200 dark:ring-purple-800'
          }`}
        >
          {message.role === 'user' ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>
        <div
          className={`rounded-2xl shadow-sm border backdrop-blur-sm ${
            message.role === 'user'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-200/50 shadow-blue-200/25'
              : 'bg-card/95 border-border shadow-md'
          }`}
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
          <div className={`px-4 pb-2 text-xs font-medium ${
            message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
          }`}>
            {formatDate(message.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
};