import React from 'react';
import { Button } from '@/components/ui/button';
import type { ChatThread } from '@shared/types';
import { MessageCircle, Lock } from 'lucide-react';

interface CollapsedThreadListProps {
  threads: ChatThread[];
  currentThread: ChatThread | null;
  isLoading: boolean;
  onThreadClick: (thread: ChatThread) => void;
}

export const CollapsedThreadList: React.FC<CollapsedThreadListProps> = ({
  threads,
  currentThread,
  isLoading,
  onThreadClick,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-8 h-8 bg-muted/50 rounded-full flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {threads.slice(0, 10).map((thread) => (
        <div
          key={thread.id}
          className="relative flex justify-center"
        >
          <Button
            variant="ghost"
            size="sm"
            className={`w-8 h-8 p-0 rounded-md transition-all duration-200 ${
              currentThread?.id === thread.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-accent/50'
            }`}
            onClick={() => onThreadClick(thread)}
            title={thread.title || 'New Chat'}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          {thread.hasPassword && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center shadow-sm">
              <Lock className="w-2 h-2 text-primary-foreground" />
            </div>
          )}
        </div>
      ))}
      
      {threads.length > 10 && (
        <div className="flex justify-center py-2">
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            +{threads.length - 10}
          </div>
        </div>
      )}
    </div>
  );
};