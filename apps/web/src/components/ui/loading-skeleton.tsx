'use client';

import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export function LoadingSkeleton({ className, count = 1 }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('animate-pulse bg-muted rounded', className || 'h-4 w-full')}
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border animate-pulse">
      <div className="h-3 w-3 rounded-full bg-muted mb-3" />
      <div className="h-8 w-20 bg-muted rounded mb-2" />
      <div className="h-4 w-32 bg-muted rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-muted rounded-t-lg mb-2" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-muted/50 border-b border-border last:rounded-b-lg" />
      ))}
    </div>
  );
}
