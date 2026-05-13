'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface AlertCardProps {
  title: string;
  description?: string;
  severity: 'critical' | 'warning' | 'info';
  action?: { label: string; onClick: () => void };
  loading?: boolean;
}

const severityStyles = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-destructive/10 border-destructive/20',
    iconColor: 'text-destructive',
    titleColor: 'text-destructive',
    descColor: 'text-destructive/90',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-700 dark:text-amber-300',
    descColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    bg: 'bg-primary/10 border-primary/20',
    iconColor: 'text-primary',
    titleColor: 'text-primary',
    descColor: 'text-primary/90',
  },
};

export function AlertCard({ title, description, severity, action, loading }: AlertCardProps) {
  const s = severityStyles[severity];
  const Icon = s.icon;

  if (loading) {
    return (
      <div className={cn('rounded-lg p-4 border animate-pulse', s.bg)}>
        <div className="h-5 w-48 bg-current opacity-20 rounded mb-2" />
        <div className="h-4 w-64 bg-current opacity-20 rounded" />
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg p-4 border', s.bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', s.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', s.titleColor)}>{title}</p>
          {description && <p className={cn('text-xs mt-1', s.descColor)}>{description}</p>}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-xs font-medium underline hover:no-underline"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
