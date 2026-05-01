import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
}

function Card({
  className,
  hover = false,
  padding = 'md',
  border = true,
  children,
  ...props
}: CardProps) {
  const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'rounded-xl bg-[var(--surface)]',
        border && 'border border-[var(--border)]',
        hover && 'transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-surface cursor-pointer',
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 mb-4', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold text-[var(--text)]', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[var(--text-muted)]', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]',
        className,
      )}
      {...props}
    />
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  loading?: boolean;
}

function StatCard({ title, value, change, changeLabel, icon, iconColor = 'text-primary-500', loading }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  if (loading) {
    return (
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-8 w-32 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-10 w-10 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-muted)] truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)] tabular-nums">
            {value}
          </p>
          {change !== undefined && (
            <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium', isPositive ? 'text-success' : 'text-danger')}>
              <span>{isPositive ? '↑' : '↓'} {Math.abs(change)}%</span>
              {changeLabel && <span className="text-[var(--text-muted)] font-normal">{changeLabel}</span>}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2.5 rounded-lg bg-[var(--surface-2)] shrink-0', iconColor)}>
            {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}
          </div>
        )}
      </div>
    </Card>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard };
