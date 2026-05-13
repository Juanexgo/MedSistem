'use client';

import { cn } from '@/lib/utils';

interface StatusItem {
  label: string;
  value: number;
  color: string;
}

interface StatusSummaryCardProps {
  title: string;
  items: StatusItem[];
  total?: number;
  loading?: boolean;
}

export function StatusSummaryCard({ title, items, total, loading }: StatusSummaryCardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border animate-pulse">
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {total !== undefined && (
          <span className="text-xs text-muted-foreground">{total} en total</span>
        )}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', item.color)} />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
      )}
    </div>
  );
}
