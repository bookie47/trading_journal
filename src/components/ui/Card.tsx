import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ children, className, glass = false, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl border p-5 transition duration-150',
          glass
            ? 'glass-card'
            : 'bg-slate-900/80 border-slate-800/80 shadow-md',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
