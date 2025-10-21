import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import type { ChatThread } from '@shared/types';
import { chatApi } from '@/lib/api';
import ThreadPasswordDialog from '@/components/ThreadPasswordDialog';
import { Sidebar, ChatArea, DeleteConfirmDialog, MobileSidebar, CreateThreadModal } from '@/components/chat';

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
  const [isCreateThreadModalOpen, setIsCreateThreadModalOpen] = useState(false);
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
    isLoadingThreads,
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

  const handleCreateThread = async (title: string) => {
    try {
      await createThread(title);
      toast({
        title: "Conversa criada",
        description: `"${title}" foi criada com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Falha ao criar conversa",
        description: error.response?.data?.error || "Algo deu errado",
        variant: "destructive",
      });
    }
  };

  const handleOpenCreateThreadModal = () => {
    setIsCreateThreadModalOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isStreaming) return;

    // Don't auto-create threads - user must create one first
    if (!currentThread) {
      toast({
        title: "Nenhuma conversa ativa",
        description: "Por favor, crie uma nova conversa primeiro para começar",
        variant: "destructive",
      });
      return;
    }

    const content = messageInput;
    setMessageInput('');

    try {
      // Get password for current thread if it exists
      const password = currentThread?.hasPassword ? threadPasswords.get(currentThread.id) : undefined;
      await sendMessage(content, password);
    } catch (error: any) {
      if (error.message.includes('Daily chat limit')) {
        toast({
          title: "Limite diário atingido",
          description: "Você atingiu seu limite diário de mensagens. Faça upgrade para Pro para conversas ilimitadas!",
          variant: "destructive",
          duration: 10000,
          action: (
            <Link to="/billing">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Ver Cobrança
              </Button>
            </Link>
          ),
        });
      } else if (error.message.includes('Thread is password protected') || error.message.includes('Invalid password')) {
        // Password issue - prompt for password immediately
        if (currentThread) {
          // Remove invalid password
          setThreadPasswords(prev => {
            const newMap = new Map(prev);
            newMap.delete(currentThread.id);
            return newMap;
          });
          
          // Restore the message content to the input
          setMessageInput(content);
          
          // Immediately show password dialog with warning
          openPasswordDialog(
            currentThread.id,
            currentThread.title || 'Nova Conversa',
            'verify',
            true
          );
          
          toast({
            title: "Autenticação necessária",
            description: "Senha inválida ou ausente. Por favor, autentique-se para enviar mensagens.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } else {
        toast({
          title: "Falha ao enviar mensagem",
          description: error.message || "Algo deu errado",
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
    setEditTitle(currentTitle || 'Nova Conversa');
  };

  const handleSaveTitle = async (threadId: string) => {
    if (editTitle.trim()) {
      try {
        await renameThread(threadId, editTitle.trim());
        setEditingThreadId(null);
        toast({
          title: "Conversa renomeada",
          description: "O título da sua conversa foi atualizado.",
        });
      } catch (error: any) {
        toast({
          title: "Falha ao renomear conversa",
          description: error.response?.data?.error || "Algo deu errado",
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
        title: "Conversa excluída",
        description: "A conversa foi removida.",
      });
    } catch (error: any) {
      toast({
        title: "Falha ao excluir conversa",
        description: error.response?.data?.error || "Algo deu errado",
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
        throw new Error('Senha inválida');
      }
      
      // Store password for this session
      setThreadPasswords(prev => new Map(prev).set(threadId, password));
      
      // Find and set the thread as current with the password
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        await setCurrentThread(thread, password);
      }
      
      toast({
        title: "Acesso concedido",
        description: "Conversa desbloqueada com sucesso.",
      });
      
      // Close the dialog on success
      closePasswordDialog();
    } catch (error: any) {
      // Don't close the dialog, just show the error
      const errorMessage = error.response?.data?.error || error.message || "Senha inválida";
      
      // Show error notification
      toast({
        title: "Falha na autenticação", 
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
      
      // Store the password locally to avoid immediate re-prompt
      setThreadPasswords(prev => new Map(prev).set(threadId, password));
      
      // Update threads list to reflect password status
      await loadThreads();
      
      toast({
        title: "Senha definida",
        description: "A conversa agora está protegida por senha.",
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
        title: "Senha atualizada",
        description: "A senha da conversa foi alterada.",
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
        title: "Senha removida",
        description: "A conversa não está mais protegida por senha.",
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
          thread.title || 'Nova Conversa',
          'verify',
          true
        );
      } else {
        toast({
          title: "Falha ao carregar conversa",
          description: error.response?.data?.error || "Algo deu errado",
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
        isLoading={isLoadingThreads}
        user={user}
        onCreateThread={handleOpenCreateThreadModal}
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
        isLoading={isLoadingThreads}
        user={user}
        onCreateThread={handleOpenCreateThreadModal}
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
        onCreateThread={handleOpenCreateThreadModal}
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

      {/* Create Thread Modal */}
      <CreateThreadModal
        isOpen={isCreateThreadModalOpen}
        onClose={() => setIsCreateThreadModalOpen(false)}
        onCreateThread={handleCreateThread}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatPage;