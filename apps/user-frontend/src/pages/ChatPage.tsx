import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import type { ChatThread } from '@shared/types';
import { chatApi } from '@/lib/api';
import ThreadPasswordDialog from '@/components/ThreadPasswordDialog';
import { Sidebar, ChatArea, DeleteConfirmDialog, MobileSidebar } from '@/components/chat';

const ChatPage = () => {
  const [messageInput, setMessageInput] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [previousScrollHeight, setPreviousScrollHeight] = useState(0);
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
    loadMoreMessages,
  } = useChatStore();

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Get current thread's cache data for infinite scroll
  const currentThreadCache = currentThread ? messageCache.get(currentThread.id) : null;
  const hasMoreMessages = currentThreadCache?.hasMore || false;

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
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        threads={threads}
        currentThread={currentThread}
        isLoading={isLoading}
        user={user}
        onCreateThread={handleCreateThread}
        onThreadClick={handleThreadClick}
        onEditThread={handleEditThread}
        onLogout={handleLogout}
        onOpenPasswordDialog={openPasswordDialog}
        editingThreadId={editingThreadId}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        onSaveTitle={handleSaveTitle}
        onCancelEdit={handleCancelEdit}
        showThreadMenu={showThreadMenu}
        setShowThreadMenu={setShowThreadMenu}
        setDeleteConfirmId={setDeleteConfirmId}
      />
      
      {/* Desktop Sidebar */}
      <Sidebar
        threads={threads}
        currentThread={currentThread}
        isLoading={isLoading}
        user={user}
        onCreateThread={handleCreateThread}
        onThreadClick={handleThreadClick}
        onEditThread={handleEditThread}
        onDeleteThread={handleDeleteThread}
        onLogout={handleLogout}
        onOpenPasswordDialog={openPasswordDialog}
        editingThreadId={editingThreadId}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        onSaveTitle={handleSaveTitle}
        onCancelEdit={handleCancelEdit}
        showThreadMenu={showThreadMenu}
        setShowThreadMenu={setShowThreadMenu}
        setDeleteConfirmId={setDeleteConfirmId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <ChatArea
        currentThread={currentThread}
        messages={messages}
        isStreaming={isStreaming}
        streamingMessage={streamingMessage}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        onSendMessage={handleSendMessage}
        onCreateThread={handleCreateThread}
        isLoading={isLoading}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        hasMoreMessages={hasMoreMessages}
        isLoadingMoreMessages={isLoadingMoreMessages}
        onLoadMoreMessages={loadMoreMessages}
        messagesContainerRef={messagesContainerRef}
        previousScrollHeight={previousScrollHeight}
        setPreviousScrollHeight={setPreviousScrollHeight}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deleteConfirmId}
        onConfirm={() => deleteConfirmId && handleDeleteThread(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

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