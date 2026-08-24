import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'profit' | 'loss' | 'neutral' | 'brand' | 'warning' | 'info';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  className,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded-md',
    md: 'text-xs px-2.5 py-1 font-semibold rounded-lg',
  };

  const variantStyles = {
    profit: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    loss: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700/60',
    brand: 'bg-brand-500/10 text-brand-400 border border-brand-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    info: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 whitespace-nowrap',
          sizeStyles[size],
          variantStyles[variant],
          pulse && 'animate-pulse-subtle',
          className
        )
      )}
      {...props}
    >
      {pulse && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full animate-ping',
            variant === 'profit' && 'bg-emerald-400',
            variant === 'loss' && 'bg-rose-400',
            variant === 'brand' && 'bg-brand-400',
            variant === 'warning' && 'bg-amber-400',
            variant === 'info' && 'bg-sky-400',
            variant === 'neutral' && 'bg-slate-400'
          )}
        />
      )}
      {children}
    </span>
  );
}
