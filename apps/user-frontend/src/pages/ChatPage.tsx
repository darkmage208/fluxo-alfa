import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { 
  MessageCircle, 
  Plus, 
  Send, 
  Trash2, 
  User, 
  Bot,
  Settings,
  CreditCard,
  LogOut
} from 'lucide-react';

const ChatPage = () => {
  const [messageInput, setMessageInput] = useState('');
  const { toast } = useToast();
  const { user, logout } = useAuthStore();
  const {
    threads,
    currentThread,
    messages,
    isLoading,
    isStreaming,
    streamingMessage,
    loadThreads,
    createThread,
    setCurrentThread,
    deleteThread,
    sendMessage,
    clearStreamingMessage,
  } = useChatStore();

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

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
          description: "Upgrade to Pro for unlimited chats",
          action: (
            <Link to="/billing">
              <Button size="sm">Upgrade</Button>
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

  const handleDeleteThread = async (threadId: string) => {
    try {
      await deleteThread(threadId);
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

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
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
          
          {/* User Info */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              {user?.email}
            </div>
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
                  <MessageCircle className="w-4 h-4 mr-3 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {thread.title || 'New Chat'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(thread.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 p-1 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(thread.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link to="/billing">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <CreditCard className="w-4 h-4 mr-2" />
              Billing
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentThread ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <Card
                      className={`p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <MarkdownRenderer 
                          content={message.content} 
                          className={`text-sm ${message.role === 'user' ? 'prose-invert' : ''}`}
                        />
                      )}
                      <p className="text-xs mt-2 opacity-70">
                        {formatDate(message.createdAt)}
                      </p>
                    </Card>
                  </div>
                </div>
              ))}
              
              {/* Streaming Message */}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2 max-w-[70%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <Card className="p-3 bg-white">
                      <div className="text-sm">
                        <MarkdownRenderer content={streamingMessage} className="text-sm" />
                        <span className="animate-pulse">|</span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
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
              <Button onClick={handleCreateThread} disabled={isLoading}>
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;