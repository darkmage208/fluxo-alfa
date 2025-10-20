import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatThread } from '@shared/types';
import { formatDate } from '@/lib/utils';
import { 
  MessageCircle, 
  Edit3,
  Lock,
  Shield,
  MoreVertical,
  Trash2
} from 'lucide-react';

interface ThreadListProps {
  threads: ChatThread[];
  currentThread: ChatThread | null;
  isLoading: boolean;
  onThreadClick: (thread: ChatThread) => void;
  onEditThread: (threadId: string, currentTitle: string) => void;
  editingThreadId: string | null;
  editTitle: string;
  setEditTitle: (title: string) => void;
  onSaveTitle: (threadId: string) => void;
  onCancelEdit: () => void;
  showThreadMenu: string | null;
  setShowThreadMenu: (threadId: string | null) => void;
  onOpenPasswordDialog: (threadId: string, threadTitle: string, mode: 'verify' | 'set' | 'update' | 'delete', hasPassword: boolean) => void;
  setDeleteConfirmId: (threadId: string | null) => void;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  currentThread,
  isLoading,
  onThreadClick,
  onEditThread,
  editingThreadId,
  editTitle,
  setEditTitle,
  onSaveTitle,
  onCancelEdit,
  showThreadMenu,
  setShowThreadMenu,
  onOpenPasswordDialog,
  setDeleteConfirmId,
}) => {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar">
      {isLoading ? (
        <div className="p-6 text-center text-muted-foreground">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Loading conversations...</span>
          </div>
        </div>
      ) : threads.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">No conversations yet</p>
          <p className="text-sm text-muted-foreground">Start a new chat to begin!</p>
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`group flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                currentThread?.id === thread.id
                  ? 'bg-primary/10 border border-primary/20 shadow-sm'
                  : 'hover:bg-accent/50 border border-transparent'
              }`}
              onClick={() => onThreadClick(thread)}
            >
              <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 flex-shrink-0 transition-all duration-200 ${
                currentThread?.id === thread.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-muted/80 text-muted-foreground group-hover:bg-muted'
              }`}>
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                {editingThreadId === thread.id ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-sm h-7"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveTitle(thread.id);
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      onBlur={() => onSaveTitle(thread.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground truncate">
                      {thread.title || 'Nova Conversa'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(thread.createdAt)}
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                {thread.hasPassword && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                    <Lock className="w-3 h-3 text-primary" />
                  </div>
                )}
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-accent/50 transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowThreadMenu(showThreadMenu === thread.id ? null : thread.id);
                    }}
                    title="Opções da conversa"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </Button>

                  {/* Thread options dropdown */}
                  {showThreadMenu === thread.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowThreadMenu(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-popover/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 z-20 overflow-hidden">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowThreadMenu(null);
                              onEditThread(thread.id, thread.title || '');
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent/50 text-popover-foreground transition-colors"
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Renomear
                          </button>
                          
                          {thread.hasPassword ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowThreadMenu(null);
                                  onOpenPasswordDialog(
                                    thread.id, 
                                    thread.title || 'Nova Conversa', 
                                    'update', 
                                    true
                                  );
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent/50 text-popover-foreground transition-colors"
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Alterar Senha
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowThreadMenu(null);
                                  onOpenPasswordDialog(
                                    thread.id, 
                                    thread.title || 'Nova Conversa', 
                                    'delete', 
                                    true
                                  );
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent/50 text-popover-foreground transition-colors"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover Proteção
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowThreadMenu(null);
                                onOpenPasswordDialog(
                                  thread.id, 
                                  thread.title || 'Nova Conversa', 
                                  'set', 
                                  false
                                );
                              }}
                              className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-popover-foreground transition-colors"
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Adicionar Proteção
                            </button>
                          )}
                          
                          <hr className="my-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowThreadMenu(null);
                              setDeleteConfirmId(thread.id);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};