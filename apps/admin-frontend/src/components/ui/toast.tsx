import React from 'react';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export const Toast = ({ title, description, variant = 'default', children, ...props }: ToastProps & { children?: React.ReactNode; [key: string]: any }) => {
  const variants = {
    default: 'bg-white border-gray-200 text-gray-900 shadow-lg',
    destructive: 'bg-red-50 border-red-200 text-red-900 shadow-lg'
  };

  return (
    <div
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-lg border mb-2 transition-all duration-300 ${variants[variant]}`}
      {...props}
    >
      <div className="p-4 pr-10">
        {children}
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
  <button
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.();
    }}
    className="absolute right-1 top-1 rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer z-10"
    type="button"
    aria-label="Close notification"
  >
    <span className="sr-only">Close</span>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
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

export const ToastViewport = ({ children }: { children?: React.ReactNode }) => (
  <div className="fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col md:max-w-[420px]">
    {children}
  </div>
);