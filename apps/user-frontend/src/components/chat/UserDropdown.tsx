import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  User,
  CreditCard,
  LogOut,
  ChevronDown
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
                  Cobrança e Assinatura
                </Link>
                
                <div className="h-px bg-border/50 mx-2 my-1"></div>
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sair
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};