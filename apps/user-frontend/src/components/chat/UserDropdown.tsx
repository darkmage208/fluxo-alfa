import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  User,
  CreditCard,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

interface UserDropdownProps {
  user: any;
  showUserDropdown: boolean;
  setShowUserDropdown: (show: boolean) => void;
  onLogout: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  showUserDropdown,
  setShowUserDropdown,
  onLogout,
}) => {
  const { theme, setTheme } = useTheme();
  return (
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
                
                {/* Theme Selection */}
                <div className="px-2 py-1">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1">Theme</div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setTheme('light');
                        setShowUserDropdown(false);
                      }}
                      className={`flex items-center w-full px-2 py-2 text-sm hover:bg-accent rounded-md transition-colors ${
                        theme === 'light' ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                      }`}
                    >
                      <Sun className="w-4 h-4 mr-3" />
                      Light
                    </button>
                    <button
                      onClick={() => {
                        setTheme('dark');
                        setShowUserDropdown(false);
                      }}
                      className={`flex items-center w-full px-2 py-2 text-sm hover:bg-accent rounded-md transition-colors ${
                        theme === 'dark' ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                      }`}
                    >
                      <Moon className="w-4 h-4 mr-3" />
                      Dark
                    </button>
                    <button
                      onClick={() => {
                        setTheme('system');
                        setShowUserDropdown(false);
                      }}
                      className={`flex items-center w-full px-2 py-2 text-sm hover:bg-accent rounded-md transition-colors ${
                        theme === 'system' ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                      }`}
                    >
                      <Monitor className="w-4 h-4 mr-3" />
                      System
                    </button>
                  </div>
                </div>
                
                <div className="h-px bg-border mx-2 my-1"></div>
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
    </div>
  );
};