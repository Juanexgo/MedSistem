import { cn } from '@/lib/utils';
import { TRANSFER_STATUS_LABELS } from '@/lib/i18n';

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'bg-muted text-foreground/80',
  ASSIGNED: 'bg-primary/15 text-primary',
  ON_THE_WAY: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  PATIENT_PICKED_UP: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  IN_TRANSFER: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  ARRIVED: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  IN_STUDY: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  RETURN_REQUESTED: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  CANCELLED: 'bg-destructive/15 text-destructive',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_STYLES[status] || 'bg-muted text-foreground/80')}>
      {TRANSFER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export function getNextValidStatuses(status: string): string[] {
  const transitions: Record<string, string[]> = {
    REQUESTED: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['ON_THE_WAY', 'CANCELLED'],
    ON_THE_WAY: ['PATIENT_PICKED_UP', 'CANCELLED'],
    PATIENT_PICKED_UP: ['IN_TRANSFER', 'CANCELLED'],
    IN_TRANSFER: ['ARRIVED', 'CANCELLED'],
    ARRIVED: ['IN_STUDY', 'CANCELLED'],
    IN_STUDY: ['RETURN_REQUESTED', 'CANCELLED'],
    RETURN_REQUESTED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };
  return transitions[status] || [];
}