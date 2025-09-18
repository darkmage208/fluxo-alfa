import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  User,
  CreditCard,
  LogOut,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Palette
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
  const { theme, setTheme, actualTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const getThemeIcon = () => {
    if (theme === 'light') return Sun;
    if (theme === 'dark') return Moon;
    return Monitor;
  };

  const ThemeIcon = getThemeIcon();
  return (
    <div className="p-4 border-t border-border/50">
      <div className="relative">
        <Button 
          variant="ghost" 
          className="w-full justify-between p-3 h-auto hover:bg-accent/50 transition-all duration-200"
          onClick={() => setShowUserDropdown(!showUserDropdown)}
        >
          <div className="flex items-center text-sm text-foreground">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3 shadow-sm">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="truncate font-medium">{user?.email}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200" />
        </Button>
        
        {showUserDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowUserDropdown(false)}
            />
            <div className="absolute left-0 bottom-full mb-2 w-56 bg-popover/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 z-30 overflow-hidden">
              <div className="py-1">
                <Link 
                  to="/billing" 
                  className="flex items-center px-4 py-3 text-sm hover:bg-accent/50 text-popover-foreground transition-colors"
                  onClick={() => setShowUserDropdown(false)}
                >
                  <CreditCard className="w-4 h-4 mr-3" />
                  Billing & Subscription
                </Link>
                
                {/* Theme Selection with Sub-dropdown */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setShowThemeMenu(true)}
                  onMouseLeave={() => setShowThemeMenu(false)}
                >
                  <div className="flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-accent/50 text-popover-foreground transition-colors cursor-pointer">
                    <div className="flex items-center">
                      <Palette className="w-4 h-4 mr-3" />
                      Theme
                    </div>
                    <div className="flex items-center space-x-2">
                      <ThemeIcon className="w-4 h-4" />
                      <ChevronRight className="w-3 h-3 transition-transform duration-200" />
                    </div>
                  </div>
                  
                  {showThemeMenu && (
                    <div className="absolute left-full top-0 ml-1 w-40 bg-popover/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 z-[60] overflow-hidden">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setTheme('light');
                              setShowUserDropdown(false);
                            }}
                            className={`flex items-center w-full px-3 py-2 text-sm hover:bg-accent/50 transition-colors ${
                              theme === 'light' ? 'bg-accent/50 text-accent-foreground' : 'text-popover-foreground'
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
                            className={`flex items-center w-full px-3 py-2 text-sm hover:bg-accent/50 transition-colors ${
                              theme === 'dark' ? 'bg-accent/50 text-accent-foreground' : 'text-popover-foreground'
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
                            className={`flex items-center w-full px-3 py-2 text-sm hover:bg-accent/50 transition-colors ${
                              theme === 'system' ? 'bg-accent/50 text-accent-foreground' : 'text-popover-foreground'
                            }`}
                          >
                            <Monitor className="w-4 h-4 mr-3" />
                            System
                          </button>
                        </div>
                      </div>
                  )}
                </div>
                
                <div className="h-px bg-border/50 mx-2 my-1"></div>
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