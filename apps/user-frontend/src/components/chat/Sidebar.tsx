import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatThread } from '@shared/types';
import { formatDate } from '@/lib/utils';
import { 
  MessageCircle, 
  Plus, 
  User,
  CreditCard,
  LogOut,
  ChevronDown,
  Edit3,
  Lock,
  Shield,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { ThreadList } from './ThreadList';
import { UserDropdown } from './UserDropdown';
import { SidebarToggle } from './SidebarToggle';

interface SidebarProps {
  threads: ChatThread[];
  currentThread: ChatThread | null;
  isLoading: boolean;
  user: any;
  onCreateThread: () => void;
  onThreadClick: (thread: ChatThread) => void;
  onEditThread: (threadId: string, currentTitle: string) => void;
  onDeleteThread: (threadId: string) => void;
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  currentThread,
  isLoading,
  user,
  onCreateThread,
  onThreadClick,
  onEditThread,
  onDeleteThread,
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
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <div 
      className={`bg-card border-r border-border flex flex-col shadow-sm hidden sm:flex transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <h1 className="text-xl font-semibold text-foreground">Fluxo Alfa</h1>
            )}
          </div>
          {onToggleCollapse && (
            <SidebarToggle
              isCollapsed={isCollapsed}
              onToggle={onToggleCollapse}
            />
          )}
        </div>
        <Button
          className="w-full"
          onClick={onCreateThread}
          disabled={isLoading}
          title={isCollapsed ? 'New Chat' : undefined}
        >
          <Plus className="w-4 h-4 mr-2" />
          {!isCollapsed && 'New Chat'}
        </Button>
      </div>

      {/* Threads List */}
      {!isCollapsed && (
        <ThreadList
          threads={threads}
          currentThread={currentThread}
          isLoading={isLoading}
          onThreadClick={onThreadClick}
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
      )}

      {/* User Dropdown */}
      {!isCollapsed ? (
        <UserDropdown
          user={user}
          showUserDropdown={showUserDropdown}
          setShowUserDropdown={setShowUserDropdown}
          onLogout={onLogout}
        />
      ) : (
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="w-8 h-8 p-0 mx-auto"
            title="User menu"
          >
            <User className="w-4 h-4" />
          </Button>
          {showUserDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowUserDropdown(false)}
              />
              <div className="absolute left-16 bottom-4 w-56 bg-popover rounded-lg shadow-lg border border-border z-20 overflow-hidden">
                <div className="py-1">
                  <Link 
                    to="/billing" 
                    className="flex items-center px-4 py-3 text-sm hover:bg-accent text-popover-foreground transition-colors"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <CreditCard className="w-4 h-4 mr-3" />
                    Billing & Subscription
                  </Link>
                  <div className="h-px bg-border mx-2 my-1"></div>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};