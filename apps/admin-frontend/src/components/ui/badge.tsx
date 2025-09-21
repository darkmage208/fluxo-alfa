import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-blue-500 text-white',
      secondary: 'bg-gray-100 text-gray-800',
      destructive: 'bg-red-500 text-white',
      outline: 'border border-gray-300 text-gray-700 bg-white',
    };

    return (
      <div
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';