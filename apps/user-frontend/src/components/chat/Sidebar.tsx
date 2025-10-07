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
  Trash2,
  ChevronRight
} from 'lucide-react';
import { ThreadList } from './ThreadList';
import { CollapsedThreadList } from './CollapsedThreadList';
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
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  return (
    <div 
      className={`bg-background/95 backdrop-blur-sm border-r border-border/50 flex-col shadow-sm hidden md:flex transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div 
            className={`flex items-center space-x-3 transition-all duration-200 ${
              isCollapsed ? 'cursor-pointer hover:bg-accent/50 rounded-lg p-1 -m-1' : ''
            }`}
            onClick={isCollapsed && onToggleCollapse ? onToggleCollapse : undefined}
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
            title={isCollapsed ? 'Expand sidebar' : undefined}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm">
              {isCollapsed && isLogoHovered ? (
                <ChevronRight className="w-8 h-8 text-foreground" />
              ) : (
                <img src="/logo.png" alt="Fluxo Alfa Logo" className="w-8 h-8" />
              )}
            </div>
            {!isCollapsed && (
              <h1 className="text-xl font-semibold text-foreground tracking-tight">Fluxo Alfa</h1>
            )}
          </div>
          {!isCollapsed && onToggleCollapse && (
            <SidebarToggle
              isCollapsed={isCollapsed}
              onToggle={onToggleCollapse}
            />
          )}
        </div>
        <Button
          variant="outline"
          className={`${isCollapsed ? "w-8 h-8 p-0 mx-auto" : "w-full"} border-border/50 hover:bg-accent hover:text-accent-foreground transition-all duration-200`}
          onClick={onCreateThread}
          disabled={isLoading}
          title={isCollapsed ? 'New Chat' : undefined}
        >
          <Plus className={`w-4 h-4 ${!isCollapsed ? 'mr-2' : ''}`} />
          {!isCollapsed && 'New Chat'}
        </Button>
      </div>

      {/* Threads List */}
      {isCollapsed ? (
        <CollapsedThreadList
          threads={threads}
          currentThread={currentThread}
          isLoading={isLoading}
          onThreadClick={onThreadClick}
        />
      ) : (
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
      <div className="mt-auto">
        {!isCollapsed ? (
          <UserDropdown
            user={user}
            showUserDropdown={showUserDropdown}
            setShowUserDropdown={setShowUserDropdown}
            onLogout={onLogout}
          />
        ) : (
          <div className="p-4 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="w-8 h-8 p-0 mx-auto relative hover:bg-accent/50 transition-all duration-200"
              title="User menu"
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
                <User className="w-3 h-3 text-primary-foreground" />
              </div>
            </Button>
            {showUserDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute left-16 bottom-4 w-56 bg-popover/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 z-20 overflow-hidden">
                  <div className="py-1">
                    <Link 
                      to="/billing" 
                      className="flex items-center px-4 py-3 text-sm hover:bg-accent/50 text-popover-foreground transition-colors"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <CreditCard className="w-4 h-4 mr-3" />
                      Billing & Subscription
                    </Link>
                    <div className="h-px bg-border/50 mx-2 my-1"></div>
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
    </div>
  );
};