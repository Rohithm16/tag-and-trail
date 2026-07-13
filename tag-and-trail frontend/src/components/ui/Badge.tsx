import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variant === 'primary' && 'border-transparent bg-slate-950 text-white',
        variant === 'secondary' && 'border-transparent bg-slate-100 text-slate-900',
        variant === 'destructive' && 'border-transparent bg-rose-500 text-white',
        variant === 'outline' && 'border-slate-200 bg-transparent text-slate-700',
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';