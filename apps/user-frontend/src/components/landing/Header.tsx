import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Header: React.FC = () => {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Fluxo Alfa Logo" className="w-8 h-8" />
          <img src="/fluxoalfa.png" alt="Fluxo Alfa" className="h-6 w-auto" />
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link to="/register">
            <Button>Começar</Button>
          </Link>
        </div>
      </div>
    </header>
  );
};