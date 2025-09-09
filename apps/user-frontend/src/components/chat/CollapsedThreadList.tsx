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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <MessageCircle className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {threads.slice(0, 10).map((thread) => (
        <div
          key={thread.id}
          className="relative flex justify-center"
        >
          <Button
            variant="ghost"
            size="sm"
            className={`w-8 h-8 p-0 rounded-lg transition-all duration-200 ${
              currentThread?.id === thread.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            }`}
            onClick={() => onThreadClick(thread)}
            title={thread.title || 'New Chat'}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          {thread.hasPassword && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
              <Lock className="w-2 h-2 text-white" />
            </div>
          )}
        </div>
      ))}
      
      {threads.length > 10 && (
        <div className="flex justify-center py-1">
          <div className="text-xs text-muted-foreground">
            +{threads.length - 10}
          </div>
        </div>
      )}
    </div>
  );
};