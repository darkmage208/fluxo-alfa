import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Shield, Edit, Trash2, X } from 'lucide-react';

interface ThreadPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordSubmit: (password: string) => Promise<void>;
  onSetPassword?: (password: string) => Promise<void>;
  onUpdatePassword?: (currentPassword: string, newPassword: string) => Promise<void>;
  onDeletePassword?: (currentPassword: string) => Promise<void>;
  mode: 'verify' | 'set' | 'update' | 'delete';
  threadTitle?: string;
  hasPassword?: boolean;
}

const ThreadPasswordDialog: React.FC<ThreadPasswordDialogProps> = ({
  isOpen,
  onClose,
  onPasswordSubmit,
  onSetPassword,
  onUpdatePassword,
  onDeletePassword,
  mode,
  threadTitle,
  hasPassword
}) => {
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Clear state when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      // Dialog is closing - clear all state for next time
      setPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setError('');
      setShowPassword(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      switch (mode) {
        case 'verify':
          await onPasswordSubmit(password);
          break;
        case 'set':
          if (onSetPassword) await onSetPassword(password);
          break;
        case 'update':
          if (onUpdatePassword) await onUpdatePassword(currentPassword, newPassword);
          break;
        case 'delete':
          if (onDeletePassword) await onDeletePassword(currentPassword);
          break;
      }
      // Success! The parent component will handle closing the dialog
      // Don't call handleClose() here - let the parent control the dialog state
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Operation failed';
      setError(errorMessage);
      
      // Clear password fields on error for security and better UX
      if (mode === 'verify') {
        setPassword('');
        // Focus the password input after clearing for immediate retry
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 100);
      } else if (mode === 'update') {
        setCurrentPassword('');
        setNewPassword('');
      } else if (mode === 'delete') {
        setCurrentPassword('');
      }
      
      // Do NOT close dialog - let it stay open to show error
      return; // Important: don't call handleClose()
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setCurrentPassword('');
    setNewPassword('');
    setError('');
    setShowPassword(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (mode) {
      case 'verify': return 'Enter Thread Password';
      case 'set': return 'Set Thread Password';
      case 'update': return 'Update Thread Password';
      case 'delete': return 'Remove Thread Password';
      default: return 'Thread Password';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'verify': return <Lock className="w-5 h-5 text-blue-500" />;
      case 'set': return <Shield className="w-5 h-5 text-green-500" />;
      case 'update': return <Edit className="w-5 h-5 text-orange-500" />;
      case 'delete': return <Trash2 className="w-5 h-5 text-red-500" />;
      default: return <Lock className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <h2 className="text-lg font-semibold">{getTitle()}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {threadTitle && (
          <p className="text-sm text-gray-600 mb-4">
            Thread: <span className="font-medium">{threadTitle}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Authentication Failed</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'verify' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter thread password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {mode === 'set' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  maxLength={100}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">Max 100 characters</p>
            </div>
          )}

          {mode === 'update' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    maxLength={100}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          {mode === 'delete' && (
            <>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  This will remove the password protection from this thread. Anyone will be able to access it.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password to confirm"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={`${
                mode === 'delete' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : mode === 'set'
                    ? 'bg-green-600 hover:bg-green-700'
                    : mode === 'update'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : ''
              }`}
            >
              {isLoading ? 'Processing...' : 
                mode === 'verify' ? 'Unlock' :
                mode === 'set' ? 'Set Password' :
                mode === 'update' ? 'Update Password' :
                mode === 'delete' ? 'Remove Password' : 'Submit'
              }
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ThreadPasswordDialog;