'use client';

import { cn } from '@/lib/utils';

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export function DashboardSection({ title, subtitle, action, children, className, loading }: DashboardSectionProps) {
  if (loading) {
    return (
      <div className={cn('bg-card rounded-xl p-6 border border-border animate-pulse', className)}>
        <div className="h-5 w-48 bg-muted rounded mb-1" />
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-xl border border-border', className)}>
      <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
