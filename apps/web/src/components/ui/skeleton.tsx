/**
 * Skeleton component for loading placeholder states.
 *
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-32" />
 * <Skeleton className="h-10 w-full" />
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
