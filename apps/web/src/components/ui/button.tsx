import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none cursor-pointer relative overflow-hidden',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-600 text-white',
          'hover:bg-primary-700 active:bg-primary-800',
          'focus-visible:ring-primary-500',
          'shadow-sm hover:shadow-md',
        ].join(' '),
        secondary: [
          'bg-secondary-600 text-white',
          'hover:bg-secondary-700 active:bg-secondary-800',
          'focus-visible:ring-secondary-500',
          'shadow-sm hover:shadow-md',
        ].join(' '),
        outline: [
          'border border-[var(--border)] bg-transparent text-[var(--text)]',
          'hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]',
          'focus-visible:ring-primary-500',
        ].join(' '),
        ghost: [
          'bg-transparent text-[var(--text-muted)]',
          'hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
          'focus-visible:ring-primary-500',
        ].join(' '),
        danger: [
          'bg-danger text-white',
          'hover:bg-danger-600 active:bg-red-700',
          'focus-visible:ring-danger',
          'shadow-sm hover:shadow-md',
        ].join(' '),
        success: [
          'bg-success text-white',
          'hover:bg-success-600',
          'focus-visible:ring-success',
          'shadow-sm hover:shadow-md',
        ].join(' '),
        link: [
          'bg-transparent text-primary-600 underline-offset-4',
          'hover:underline hover:text-primary-700',
          'focus-visible:ring-primary-500',
          'p-0 h-auto',
        ].join(' '),
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded',
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-9 px-4 text-sm rounded-md',
        lg: 'h-10 px-5 text-sm rounded-md',
        xl: 'h-12 px-6 text-base rounded-lg',
        icon: 'h-9 w-9 rounded-md',
        'icon-sm': 'h-7 w-7 rounded',
        'icon-lg': 'h-11 w-11 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && 'w-full',
          className,
        )}
        disabled={isDisabled}
        whileTap={{ scale: isDisabled ? 1 : 0.97 }}
        {...(props as any)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
