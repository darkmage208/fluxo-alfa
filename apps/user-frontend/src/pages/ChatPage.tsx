import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { ChatThread } from '@shared/types';
import { formatDate } from '@/lib/utils';
import { chatApi } from '@/lib/api';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import StreamingMarkdownRenderer from '@/components/StreamingMarkdownRenderer';
import TypingIndicator from '@/components/TypingIndicator';
import ThreadPasswordDialog from '@/components/ThreadPasswordDialog';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { 
  MessageCircle, 
  Plus, 
  Send, 
  Trash2, 
  User, 
  Bot,
  CreditCard,
  LogOut,
  ChevronDown,
  Edit3,
  Lock,
  Shield,
  MoreVertical,
  Menu
} from 'lucide-react';

const ChatPage = () => {
  const [messageInput, setMessageInput] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<{
    isOpen: boolean;
    threadId: string;
    threadTitle: string;
    mode: 'verify' | 'set' | 'update' | 'delete';
    hasPassword: boolean;
  }>({
    isOpen: false,
    threadId: '',
    threadTitle: '',
    mode: 'verify',
    hasPassword: false,
  });
  const [threadPasswords, setThreadPasswords] = useState<Map<string, string>>(new Map());
  const [showThreadMenu, setShowThreadMenu] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [previousScrollHeight, setPreviousScrollHeight] = useState(0);
  const { toast } = useToast();

  // Auto-resize textarea function
  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'; // Max 200px height
    }
  };

  // Handle textarea key press
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (new line)
      if (!isStreaming && messageInput.trim()) {
        handleSendMessage(e as any);
      }
    }
  };
  const { user, logout } = useAuthStore();
  const {
    threads,
    currentThread,
    messages,
    messageCache,
    isLoading,
    isLoadingMoreMessages,
    isStreaming,
    streamingMessage,
    loadThreads,
    createThread,
    setCurrentThread,
    deleteThread,
    renameThread,
    sendMessage,
    loadMoreMessages,
  } = useChatStore();

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Auto-resize textarea when messageInput changes
  useEffect(() => {
    autoResizeTextarea();
  }, [messageInput]);

  // Get current thread's cache data for infinite scroll
  const currentThreadCache = currentThread ? messageCache.get(currentThread.id) : null;
  const hasMoreMessages = currentThreadCache?.hasMore || false;

  // Custom infinite scroll with scroll position preservation
  const { loadMoreRef } = useInfiniteScroll({
    hasMore: hasMoreMessages,
    isLoading: isLoadingMoreMessages,
    onLoadMore: () => {
      const container = messagesContainerRef.current;
      if (container) {
        setPreviousScrollHeight(container.scrollHeight);
      }
      loadMoreMessages();
    },
    rootMargin: '50px',
  });

  // Restore scroll position after loading more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && previousScrollHeight > 0 && !isLoadingMoreMessages) {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeight;
      container.scrollTop = container.scrollTop + scrollDiff;
      setPreviousScrollHeight(0);
    }
  }, [messages.length, isLoadingMoreMessages, previousScrollHeight]);

  const handleCreateThread = async () => {
    try {
      await createThread();
    } catch (error: any) {
      toast({
        title: "Failed to create thread",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isStreaming) return;

    let thread = currentThread;
    if (!thread) {
      thread = await createThread();
    }

    const content = messageInput;
    setMessageInput('');
    
    // Reset textarea height after clearing
    setTimeout(() => {
      autoResizeTextarea();
    }, 0);

    try {
      // Get password for current thread if it exists
      const password = thread?.hasPassword ? threadPasswords.get(thread.id) : undefined;
      await sendMessage(content, password);
    } catch (error: any) {
      if (error.message.includes('Daily chat limit')) {
        toast({
          title: "Daily limit reached",
          description: "You've reached your daily message limit. Upgrade to Pro for unlimited conversations!",
          variant: "destructive",
          duration: 10000,
          action: (
            <Link to="/billing">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                View Billing
              </Button>
            </Link>
          ),
        });
      } else if (error.message.includes('Thread is password protected') || error.message.includes('Invalid password')) {
        // Password issue - prompt for password immediately
        if (thread) {
          // Remove invalid password
          setThreadPasswords(prev => {
            const newMap = new Map(prev);
            newMap.delete(thread.id);
            return newMap;
          });
          
          // Restore the message content to the input
          setMessageInput(content);
          
          // Auto-resize textarea after restoring content
          setTimeout(() => {
            autoResizeTextarea();
          }, 0);
          
          // Immediately show password dialog with warning
          openPasswordDialog(
            thread.id,
            thread.title || 'New Chat',
            'verify',
            true
          );
          
          toast({
            title: "Authentication required",
            description: "Invalid or missing password. Please authenticate to send messages.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } else {
        toast({
          title: "Failed to send message",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleEditThread = (threadId: string, currentTitle: string) => {
    setEditingThreadId(threadId);
    setEditTitle(currentTitle || 'New Chat');
  };

  const handleSaveTitle = async (threadId: string) => {
    if (editTitle.trim()) {
      try {
        await renameThread(threadId, editTitle.trim());
        setEditingThreadId(null);
        toast({
          title: "Thread renamed",
          description: "Your conversation title has been updated.",
        });
      } catch (error: any) {
        toast({
          title: "Failed to rename thread",
          description: error.response?.data?.error || "Something went wrong",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditTitle('');
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await deleteThread(threadId);
      setDeleteConfirmId(null);
      // Remove password from local storage
      setThreadPasswords(prev => {
        const newMap = new Map(prev);
        newMap.delete(threadId);
        return newMap;
      });
      toast({
        title: "Thread deleted",
        description: "The conversation have been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete thread",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  // Password handling functions
  const handleThreadPasswordVerify = async (password: string) => {
    try {
      const { threadId } = passwordDialog;
      const result = await chatApi.verifyThreadPassword(threadId, password);
      
      // Check if password verification failed
      if (!result.data?.isValid) {
        throw new Error('Invalid password');
      }
      
      // Store password for this session
      setThreadPasswords(prev => new Map(prev).set(threadId, password));
      
      // Find and set the thread as current with the password
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        await setCurrentThread(thread, password);
      }
      
      toast({
        title: "Access granted",
        description: "Thread unlocked successfully.",
      });
      
      // Close the dialog on success
      closePasswordDialog();
    } catch (error: any) {
      // Don't close the dialog, just show the error
      const errorMessage = error.response?.data?.error || error.message || "Invalid password";
      
      // Show error notification
      toast({
        title: "Authentication failed", 
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });
      
      // Re-throw the error to keep the dialog open and show the error in the dialog
      throw new Error(errorMessage);
    }
  };

  const handleSetPassword = async (password: string) => {
    try {
      const { threadId } = passwordDialog;
      await chatApi.setThreadPassword(threadId, password);
      
      // Update threads list to reflect password status
      await loadThreads();
      
      toast({
        title: "Password set",
        description: "Thread is now password protected.",
      });
      
      // Close the dialog on success
      closePasswordDialog();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to set password");
    }
  };

  const handleUpdatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { threadId } = passwordDialog;
      await chatApi.updateThreadPassword(threadId, currentPassword, newPassword);
      
      // Update stored password
      setThreadPasswords(prev => new Map(prev).set(threadId, newPassword));
      
      // Clear cached messages for this thread since password changed
      const { messageCache } = useChatStore.getState();
      if (messageCache.has(threadId)) {
        messageCache.delete(threadId);
      }
      
      toast({
        title: "Password updated",
        description: "Thread password has been changed.",
      });
      
      // Close the dialog on success
      closePasswordDialog();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to update password");
    }
  };

  const handleDeletePassword = async (currentPassword: string) => {
    try {
      const { threadId } = passwordDialog;
      await chatApi.deleteThreadPassword(threadId, currentPassword);
      
      // Remove password from local storage
      setThreadPasswords(prev => {
        const newMap = new Map(prev);
        newMap.delete(threadId);
        return newMap;
      });
      
      // Clear cached messages for this thread since password was removed
      const { messageCache } = useChatStore.getState();
      if (messageCache.has(threadId)) {
        messageCache.delete(threadId);
      }
      
      // Update threads list to reflect password status
      await loadThreads();
      
      toast({
        title: "Password removed",
        description: "Thread is no longer password protected.",
      });
      
      // Close the dialog on success
      closePasswordDialog();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to remove password");
    }
  };

  const openPasswordDialog = (
    threadId: string, 
    threadTitle: string, 
    mode: 'verify' | 'set' | 'update' | 'delete',
    hasPassword: boolean
  ) => {
    setPasswordDialog({
      isOpen: true,
      threadId,
      threadTitle,
      mode,
      hasPassword,
    });
  };

  const closePasswordDialog = () => {
    setPasswordDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleThreadClick = async (thread: ChatThread) => {
    // If thread has password and we don't have it stored, prompt for password
    if (thread.hasPassword && !threadPasswords.has(thread.id)) {
      openPasswordDialog(
        thread.id,
        thread.title || 'New Chat',
        'verify',
        true
      );
      return;
    }
    
    try {
      // Set current thread with password if available
      const password = threadPasswords.get(thread.id);
      await setCurrentThread(thread, password);
    } catch (error: any) {
      // If 403, prompt for password
      if (error.response?.status === 403) {
        // Remove stored password if it's invalid
        setThreadPasswords(prev => {
          const newMap = new Map(prev);
          newMap.delete(thread.id);
          return newMap;
        });
        
        openPasswordDialog(
          thread.id,
          thread.title || 'New Chat',
          'verify',
          true
        );
      } else {
        toast({
          title: "Failed to load thread",
          description: error.response?.data?.error || "Something went wrong",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50 sm:hidden" 
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 w-80 h-full bg-card border-r border-border flex flex-col shadow-xl sm:hidden">
            {/* Mobile Sidebar Content - Same as desktop */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-xl font-semibold text-foreground">Fluxo Alfa</h1>
                </div>
                <div className="flex items-center space-x-2">
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="w-4 h-4 rotate-90" />
                  </Button>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  handleCreateThread();
                  setIsMobileSidebarOpen(false);
                }}
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
            {/* Mobile Threads List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading conversations...</span>
                  </div>
                </div>
              ) : threads.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No conversations yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Start a new chat to begin!</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`group flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        currentThread?.id === thread.id
                          ? 'bg-primary/10 border border-primary/20 shadow-sm'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => {
                        handleThreadClick(thread);
                        setIsMobileSidebarOpen(false);
                      }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ${
                        currentThread?.id === thread.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {thread.title || 'New Chat'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(thread.createdAt)}
                        </p>
                      </div>
                      {thread.hasPassword && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30">
                          <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Mobile User Dropdown */}
            <div className="p-4 border-t border-border">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-3 h-auto hover:bg-accent"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  <div className="flex items-center text-sm text-foreground">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="truncate">{user?.email}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Desktop Sidebar */}
      <div className="w-80 lg:w-80 md:w-72 sm:w-64 bg-card border-r border-border flex flex-col shadow-sm hidden sm:flex">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Fluxo Alfa</h1>
            </div>
            <ThemeToggle />
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

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Loading conversations...</span>
              </div>
            </div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No conversations yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start a new chat to begin!</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`group flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    currentThread?.id === thread.id
                      ? 'bg-primary/10 border border-primary/20 shadow-sm'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleThreadClick(thread)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ${
                    currentThread?.id === thread.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
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
                            if (e.key === 'Enter') handleSaveTitle(thread.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          onBlur={() => handleSaveTitle(thread.id)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground truncate">
                          {thread.title || 'New Chat'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(thread.createdAt)}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    {thread.hasPassword && (
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30">
                        <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowThreadMenu(showThreadMenu === thread.id ? null : thread.id);
                        }}
                        title="Thread options"
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
                          <div className="absolute right-0 top-full mt-1 w-48 bg-popover rounded-lg shadow-lg border border-border z-20 overflow-hidden">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowThreadMenu(null);
                                  handleEditThread(thread.id, thread.title || '');
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-popover-foreground transition-colors"
                              >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Rename Thread
                              </button>
                              
                              {thread.hasPassword ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowThreadMenu(null);
                                      openPasswordDialog(
                                        thread.id, 
                                        thread.title || 'New Chat', 
                                        'update', 
                                        true
                                      );
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-popover-foreground transition-colors"
                                  >
                                    <Lock className="w-4 h-4 mr-2" />
                                    Update Password
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowThreadMenu(null);
                                      openPasswordDialog(
                                        thread.id, 
                                        thread.title || 'New Chat', 
                                        'delete', 
                                        true
                                      );
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-popover-foreground transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove Password
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowThreadMenu(null);
                                    openPasswordDialog(
                                      thread.id, 
                                      thread.title || 'New Chat', 
                                      'set', 
                                      false
                                    );
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-popover-foreground transition-colors"
                                >
                                  <Shield className="w-4 h-4 mr-2" />
                                  Set Password
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
                                Delete Thread
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

        {/* User Dropdown - At Bottom */}
        <div className="p-4 border-t border-border">
          <div className="relative">
            <Button 
              variant="ghost" 
              className="w-full justify-between p-3 h-auto hover:bg-accent"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <div className="flex items-center text-sm text-foreground">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="truncate">{user?.email}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
            
            {showUserDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute left-0 bottom-full mb-2 w-56 bg-popover rounded-lg shadow-lg border border-border z-20 overflow-hidden">
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
                        handleLogout();
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
        </div>

      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="sm:hidden p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-md flex items-center justify-center">
                <MessageCircle className="w-3 h-3 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">Fluxo Alfa</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
        {currentThread ? (
          <>
            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Load more messages trigger */}
                {hasMoreMessages && (
                <div ref={loadMoreRef} className="flex justify-center py-3">
                  {isLoadingMoreMessages ? (
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading more messages...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground/70">Scroll up for more messages</div>
                  )}
                  </div>
                )}
                
                {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
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
                ))}
                
                {/* Typing Indicator or Streaming Message */}
                {isStreaming && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3 max-w-[75%]">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center shadow-sm ring-2 ring-purple-200 dark:ring-purple-800 ring-offset-2 ring-offset-background">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="rounded-2xl shadow-md border border-border bg-card/95 backdrop-blur-sm">
                      {streamingMessage ? (
                        <div className="px-4 py-3">
                          <StreamingMarkdownRenderer 
                            content={streamingMessage} 
                            className="text-sm leading-relaxed text-foreground" 
                            isStreaming={true}
                          />
                          <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1 rounded-full"></span>
                        </div>
                      ) : (
                        <div className="px-4 py-3">
                          <TypingIndicator />
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                )}
                
                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-border bg-card/50 backdrop-blur-sm p-6">
              <div className="max-w-6xl mx-auto">
                <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
                <div className="flex-1 relative">
                  <div className="relative rounded-2xl border border-border bg-background/80 backdrop-blur-sm shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
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
                      className="w-full p-4 bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground text-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl"
                      style={{ minHeight: '52px', maxHeight: '200px' }}
                      rows={1}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || isStreaming}
className="h-12 w-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
                  size="icon"
                >
                  <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Welcome to Fluxo Alfa
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your intelligent AI assistant is ready to help. Start a conversation to unlock the power of advanced AI reasoning and knowledge.
              </p>
              <Button
                onClick={handleCreateThread} 
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3 rounded-xl"
                size="lg"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Plus className="w-5 h-5 mr-2" />
                )}
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Delete Thread?</h2>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              This will permanently delete this conversation and all its messages. 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirmId(null)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteThread(deleteConfirmId)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-6"
              >
                Delete Thread
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Thread Password Dialog */}
      <ThreadPasswordDialog
        isOpen={passwordDialog.isOpen}
        onClose={closePasswordDialog}
        onPasswordSubmit={handleThreadPasswordVerify}
        onSetPassword={handleSetPassword}
        onUpdatePassword={handleUpdatePassword}
        onDeletePassword={handleDeletePassword}
        mode={passwordDialog.mode}
        threadTitle={passwordDialog.threadTitle}
        hasPassword={passwordDialog.hasPassword}
      />
    </div>
  );
};

export default ChatPage;