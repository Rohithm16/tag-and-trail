import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', asChild, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variant === 'primary' && 'border-transparent bg-sky-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-sky-500',
          variant === 'outline' && 'border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50',
          variant === 'ghost' && 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950',
          variant === 'destructive' && 'border-transparent bg-rose-500 text-white hover:bg-rose-600',
          size === 'default' && 'h-10 px-4 py-2',
          size === 'sm' && 'h-9 rounded-lg px-3 text-xs',
          size === 'lg' && 'h-11 rounded-xl px-6 text-base',
          size === 'icon' && 'h-10 w-10 rounded-xl p-0',
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';