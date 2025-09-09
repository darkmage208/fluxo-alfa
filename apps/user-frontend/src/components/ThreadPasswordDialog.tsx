import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      case 'delete': return <Trash2 className="w-5 h-5 text-destructive" />;
      default: return <Lock className="w-5 h-5" />;
    }
  };

  const getIconBackground = () => {
    switch (mode) {
      case 'verify': return 'bg-blue-100 dark:bg-blue-900/20';
      case 'set': return 'bg-green-100 dark:bg-green-900/20';
      case 'update': return 'bg-orange-100 dark:bg-orange-900/20';
      case 'delete': return 'bg-destructive/10';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-card rounded-2xl border border-border shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconBackground()}`}>
                {getIcon()}
              </div>
              <h2 className="text-lg font-semibold text-foreground">{getTitle()}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {threadTitle && (
            <div className="mb-6 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Thread: <span className="font-medium text-foreground">{threadTitle}</span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive">Authentication Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {mode === 'verify' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter thread password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {mode === 'set' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                    maxLength={100}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Max 100 characters</p>
              </div>
            )}

          {mode === 'update' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                    maxLength={100}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Max 100 characters</p>
              </div>
            </>
          )}

          {mode === 'delete' && (
            <>
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trash2 className="w-3 h-3 text-destructive-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will remove the password protection from this thread. Anyone will be able to access it.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password to confirm"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

            <div className="flex justify-end space-x-3 pt-6">
              <Button type="button" variant="outline" onClick={handleClose} className="px-6">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className={`px-6 ${
                  mode === 'delete' 
                    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                    : mode === 'set'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : mode === 'update'
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  mode === 'verify' ? 'Unlock' :
                  mode === 'set' ? 'Set Password' :
                  mode === 'update' ? 'Update Password' :
                  mode === 'delete' ? 'Remove Password' : 'Submit'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ThreadPasswordDialog;