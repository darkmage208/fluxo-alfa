import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
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
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
  Edit3,
  Check,
  X,
  Lock,
  Shield,
  MoreVertical
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
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
    loadMessages,
    loadMoreMessages,
    clearStreamingMessage,
  } = useChatStore();

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Get current thread's cache data for infinite scroll
  const currentThreadCache = currentThread ? messageCache.get(currentThread.id) : null;
  const hasMoreMessages = currentThreadCache?.hasMore || false;

  // Infinite scroll hook for loading more messages
  const { loadMoreRef } = useInfiniteScroll({
    hasMore: hasMoreMessages,
    isLoading: isLoadingMoreMessages,
    onLoadMore: loadMoreMessages,
    rootMargin: '50px',
  });

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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Fluxo Alfa</h1>
            <Button
              size="sm"
              onClick={handleCreateThread}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`group flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    currentThread?.id === thread.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleThreadClick(thread)}
                >
                  <MessageCircle className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
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
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {thread.title || 'New Chat'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(thread.createdAt)}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {thread.hasPassword && (
                      <Lock className="w-3 h-3 text-blue-500" />
                    )}
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-1 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowThreadMenu(showThreadMenu === thread.id ? null : thread.id);
                        }}
                        title="Thread options"
                      >
                        <MoreVertical className="w-3 h-3 text-gray-500" />
                      </Button>

                      {/* Thread options dropdown */}
                      {showThreadMenu === thread.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowThreadMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border z-20">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowThreadMenu(null);
                                  handleEditThread(thread.id, thread.title || '');
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100"
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
                                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100"
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
                                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100"
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
                                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100"
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
                                className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
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
        <div className="p-4 border-t border-gray-200">
          <div className="relative">
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-2" />
                {user?.email}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </Button>
            
            {showUserDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-md shadow-lg border z-20">
                  <div className="py-1">
                    <Link 
                      to="/billing" 
                      className="flex items-center px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Billing & Subscription
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
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
        {currentThread ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Load more messages trigger */}
              {hasMoreMessages && (
                <div ref={loadMoreRef} className="flex justify-center py-2">
                  {isLoadingMoreMessages ? (
                    <div className="text-sm text-gray-500">Loading more messages...</div>
                  ) : (
                    <div className="text-sm text-gray-400">Scroll up for more messages</div>
                  )}
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-[70%] ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                          : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <Card
                      className={`${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-md'
                          : 'bg-white shadow-sm border-gray-200'
                      }`}
                    >
                      <div className="p-3">
                        {message.role === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <MarkdownRenderer 
                            content={message.content} 
                            className="text-sm"
                          />
                        )}
                      </div>
                      <div className={`px-3 pb-2 text-xs ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {formatDate(message.createdAt)}
                      </div>
                    </Card>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator or Streaming Message */}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2 max-w-[70%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <Card className="bg-white shadow-sm border-gray-200">
                      {streamingMessage ? (
                        <div className="p-3">
                          <StreamingMarkdownRenderer 
                            content={streamingMessage} 
                            className="text-sm" 
                            isStreaming={true}
                          />
                          <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-1"></span>
                        </div>
                      ) : (
                        <TypingIndicator />
                      )}
                    </Card>
                  </div>
                </div>
              )}
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isStreaming}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || isStreaming}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome to Fluxo Alfa
              </h2>
              <p className="text-gray-500 mb-4">
                Start a conversation or select an existing thread
              </p>
              <Button
                onClick={handleCreateThread} 
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-2">Delete Thread?</h2>
            <p className="text-gray-600 mb-4">
              This will permanently delete this conversation and all its messages. 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteThread(deleteConfirmId)}
                className="bg-red-600 hover:bg-red-700"
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