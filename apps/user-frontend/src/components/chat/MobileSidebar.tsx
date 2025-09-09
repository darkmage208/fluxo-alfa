import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThreadList } from './ThreadList';
import { UserDropdown } from './UserDropdown';
import type { ChatThread } from '@shared/types';
import { 
  MessageCircle, 
  Plus, 
  X
} from 'lucide-react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ChatThread[];
  currentThread: ChatThread | null;
  isLoading: boolean;
  user: any;
  onCreateThread: () => void;
  onThreadClick: (thread: ChatThread) => void;
  onEditThread: (threadId: string, currentTitle: string) => void;
  onLogout: () => void;
  onOpenPasswordDialog: (threadId: string, threadTitle: string, mode: 'verify' | 'set' | 'update' | 'delete', hasPassword: boolean) => void;
  editingThreadId: string | null;
  editTitle: string;
  setEditTitle: (title: string) => void;
  onSaveTitle: (threadId: string) => void;
  onCancelEdit: () => void;
  showThreadMenu: string | null;
  setShowThreadMenu: (threadId: string | null) => void;
  setDeleteConfirmId: (threadId: string | null) => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  threads,
  currentThread,
  isLoading,
  user,
  onCreateThread,
  onThreadClick,
  onEditThread,
  onLogout,
  onOpenPasswordDialog,
  editingThreadId,
  editTitle,
  setEditTitle,
  onSaveTitle,
  onCancelEdit,
  showThreadMenu,
  setShowThreadMenu,
  setDeleteConfirmId,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleThreadClick = (thread: ChatThread) => {
    onThreadClick(thread);
    onClose();
  };

  const handleCreateThread = () => {
    onCreateThread();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/50 md:hidden" 
        onClick={onClose}
      />
      <div className="fixed left-0 top-0 z-50 w-80 h-full bg-card border-r border-border flex flex-col shadow-xl sm:hidden">
        {/* Mobile Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Fluxo Alfa</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button
            className="w-full"
            onClick={handleCreateThread}
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Mobile Threads List */}
        <ThreadList
          threads={threads}
          currentThread={currentThread}
          isLoading={isLoading}
          onThreadClick={handleThreadClick}
          onEditThread={onEditThread}
          editingThreadId={editingThreadId}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          onSaveTitle={onSaveTitle}
          onCancelEdit={onCancelEdit}
          showThreadMenu={showThreadMenu}
          setShowThreadMenu={setShowThreadMenu}
          onOpenPasswordDialog={onOpenPasswordDialog}
          setDeleteConfirmId={setDeleteConfirmId}
        />
        
        {/* Mobile User Dropdown */}
        <UserDropdown
          user={user}
          showUserDropdown={showUserDropdown}
          setShowUserDropdown={setShowUserDropdown}
          onLogout={onLogout}
        />
      </div>
    </>
  );
};