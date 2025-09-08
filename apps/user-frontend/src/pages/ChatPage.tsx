import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import StreamingMarkdownRenderer from '@/components/StreamingMarkdownRenderer';
import TypingIndicator from '@/components/TypingIndicator';
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
  X
} from 'lucide-react';

const ChatPage = () => {
  const [messageInput, setMessageInput] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
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
      await sendMessage(content);
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
      toast({
        title: "Thread deleted",
        description: "The conversation has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete thread",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
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
                  onClick={() => setCurrentThread(thread)}
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
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditThread(thread.id, thread.title || '');
                      }}
                    >
                      <Edit3 className="w-3 h-3 text-gray-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(thread.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
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
    </div>
  );
};

export default ChatPage;