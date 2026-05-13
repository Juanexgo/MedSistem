'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: number; isUp: boolean };
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'slate' | 'indigo' | 'rose';
  subtitle?: string;
  loading?: boolean;
}

const colorVariants = {
  blue: { dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  amber: { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  red: { dot: 'bg-destructive', bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
  slate: { dot: 'bg-muted-foreground', bg: 'bg-muted', text: 'text-foreground/80', border: 'border-border' },
  indigo: { dot: 'bg-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
  rose: { dot: 'bg-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
};

export function MetricCard({ label, value, icon: Icon, trend, color = 'blue', subtitle, loading }: MetricCardProps) {
  const c = colorVariants[color];

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border animate-pulse">
        <div className="h-3 w-3 rounded-full bg-muted mb-3" />
        <div className="h-8 w-20 bg-muted rounded mb-2" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-xl p-6 border border-border hover:shadow-md transition-shadow')}>
      <div className="flex items-start justify-between">
        <div>
          <div className={cn('w-3 h-3 rounded-full mb-3', c.dot)} />
          <div className="text-3xl font-bold text-foreground">{value}</div>
          <div className="text-sm text-muted-foreground mt-1">{label}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
        {Icon && (
          <div className={cn('p-2 rounded-lg', c.bg)}>
            <Icon className={cn('w-5 h-5', c.text)} />
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3 text-xs">
          <span className={trend.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
            {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-muted-foreground">vs periodo anterior</span>
        </div>
      )}
    </div>
  );
}
