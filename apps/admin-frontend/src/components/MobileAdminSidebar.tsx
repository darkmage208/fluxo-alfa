import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Database,
  LogOut,
  Zap,
  X
} from 'lucide-react';

interface MobileAdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAdminSidebar: React.FC<MobileAdminSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
    { name: 'RAG Sources', href: '/sources', icon: Database },
    { name: 'Token Usage', href: '/usage', icon: Zap },
  ];

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleLinkClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />

      {/* Mobile Sidebar */}
      <div className="fixed left-0 top-0 z-50 w-80 h-full bg-white border-r border-gray-200 flex flex-col shadow-xl md:hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <img src="/logo.png" alt="Fluxo Alfa Logo" className="w-6 h-6" />
                <h1 className="text-xl font-bold text-gray-900">Fluxo Admin</h1>
              </div>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleLinkClick}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-700 hover:bg-gray-100"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign out
          </Button>
        </div>
      </div>
    </>
  );
};