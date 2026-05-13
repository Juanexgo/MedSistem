import { cn } from '@/lib/utils';
import { TRANSFER_PRIORITY_LABELS } from '@/lib/i18n';

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: 'bg-destructive/15 text-destructive border-destructive/20',
  HIGH: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  NORMAL: 'bg-primary/15 text-primary border-primary/20',
  SCHEDULED: 'bg-muted text-foreground/80 border-border',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', PRIORITY_STYLES[priority] || 'bg-muted text-foreground/80 border-border')}>
      {TRANSFER_PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}