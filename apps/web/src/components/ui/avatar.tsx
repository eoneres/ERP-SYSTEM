import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, initials, generateColor } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

const sizeMap = {
  xs: { container: 'h-6 w-6', text: 'text-[9px]', status: 'h-1.5 w-1.5' },
  sm: { container: 'h-7 w-7', text: 'text-[10px]', status: 'h-2 w-2' },
  md: { container: 'h-8 w-8', text: 'text-xs', status: 'h-2.5 w-2.5' },
  lg: { container: 'h-10 w-10', text: 'text-sm', status: 'h-3 w-3' },
  xl: { container: 'h-14 w-14', text: 'text-base', status: 'h-3.5 w-3.5' },
};

const statusColors = {
  online: 'bg-success',
  away: 'bg-warning',
  busy: 'bg-danger',
  offline: 'bg-[var(--text-subtle)]',
};

export function Avatar({ src, name = '', size = 'md', className, status }: AvatarProps) {
  const s = sizeMap[size];
  const color = generateColor(name);
  const abbr = initials(name) || '?';

  return (
    <div className={cn('relative inline-flex shrink-0', s.container, className)}>
      <AvatarPrimitive.Root className="flex h-full w-full">
        <AvatarPrimitive.Image
          src={src ?? undefined}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full font-semibold text-white select-none',
            s.text,
          )}
          style={{ backgroundColor: color }}
          delayMs={100}
        >
          {abbr}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--surface)]',
            s.status,
            statusColors[status],
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

export function AvatarGroup({
  users,
  max = 4,
  size = 'sm',
}: {
  users: { name: string; src?: string }[];
  max?: number;
  size?: AvatarProps['size'];
}) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <div key={i} className="ring-2 ring-[var(--surface)] rounded-full">
          <Avatar name={u.name} src={u.src} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full ring-2 ring-[var(--surface)]',
            'bg-[var(--surface-2)] text-[var(--text-muted)] font-medium',
            sizeMap[size].container,
            sizeMap[size].text,
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
