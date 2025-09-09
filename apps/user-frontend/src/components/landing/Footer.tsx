import React from 'react';
import { Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-12 px-4 bg-gray-900 text-white">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Sparkles className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold">Fluxo Alfa</span>
          </div>
          <p className="text-gray-400 mb-6">
            Empowering conversations through intelligent AI technology
          </p>
          <div className="text-sm text-gray-500">
            © 2024 Fluxo Alfa. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};