import React from 'react';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export const Toast = ({ title, description, variant = 'default' }: ToastProps) => {
  const variants = {
    default: 'bg-white border-gray-200',
    destructive: 'bg-red-50 border-red-200 text-red-900'
  };

  return (
    <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg ${variants[variant]}`}>
      <div className="p-4">
        {title && <div className="text-sm font-medium">{title}</div>}
        {description && <div className="mt-1 text-sm opacity-90">{description}</div>}
      </div>
    </div>
  );
};

export const ToastAction = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <button onClick={onClick} className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-transparent px-3 text-xs font-medium hover:bg-gray-50">
    {children}
  </button>
);

export const ToastClose = ({ onClick }: { onClick?: () => void }) => (
  <button onClick={onClick} className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100">
    <span className="sr-only">Close</span>
    ✕
  </button>
);

export const ToastTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm font-semibold">{children}</div>
);

export const ToastDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm opacity-90">{children}</div>
);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

export const ToastViewport = () => (
  <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
);