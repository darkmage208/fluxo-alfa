/**
 * @fileoverview Modal component for creating new chat threads with custom names
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, X } from 'lucide-react';

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateThread: (title: string) => Promise<void>;
  isLoading: boolean;
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({
  isOpen,
  onClose,
  onCreateThread,
  isLoading,
}) => {
  const [threadTitle, setThreadTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadTitle.trim()) return;

    try {
      await onCreateThread(threadTitle.trim());
      setThreadTitle('');
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    setThreadTitle('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Create New Chat</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 hover:bg-accent"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Give your new conversation a name to help you find it later.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="thread-title" className="text-sm font-medium text-foreground">
              Chat Name
            </label>
            <Input
              id="thread-title"
              type="text"
              placeholder="My destiny, my future, my past..."
              value={threadTitle}
              onChange={(e) => setThreadTitle(e.target.value)}
              disabled={isLoading}
              autoFocus
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {threadTitle.length}/100 characters
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!threadTitle.trim() || isLoading}
              className="px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Chat
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
