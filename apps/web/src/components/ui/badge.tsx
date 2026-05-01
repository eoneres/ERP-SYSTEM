import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium border transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]',
        primary: 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-800',
        secondary: 'bg-secondary-100 text-secondary-700 border-secondary-200 dark:bg-secondary-950/40 dark:text-secondary-300 dark:border-secondary-800',
        success: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800',
        warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        danger: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
        outline: 'bg-transparent text-[var(--text-muted)] border-[var(--border)]',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5 rounded',
        md: 'text-xs px-2 py-0.5 rounded-md',
        lg: 'text-sm px-2.5 py-1 rounded-md',
      },
      dot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

const dotColorMap: Record<string, string> = {
  default: 'bg-[var(--text-muted)]',
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  outline: 'bg-[var(--text-muted)]',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant = 'default', size, dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, dot }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'inline-block rounded-full shrink-0',
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
            dotColorMap[variant ?? 'default'],
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
