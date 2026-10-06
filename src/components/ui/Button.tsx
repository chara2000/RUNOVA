'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-zenith',
  secondary: 'btn-zenith-secondary',
  outline: 'btn-zenith-outline',
  ghost:
    'bg-transparent text-[var(--texto-secundario)] hover:text-[var(--texto-primario)] hover:bg-[var(--bg-overlay)] border border-transparent font-display font-bold uppercase tracking-wider rounded-2xl',
  danger: 'btn-zenith-danger',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: '!min-h-11 !px-4 !text-[11px] !gap-2 !py-0',
  md: '!min-h-12 !px-6 !text-xs !gap-2 !py-0',
  lg: '!min-h-14 !px-8 !text-sm !gap-3 !py-0',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
