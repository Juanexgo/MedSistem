'use client';

import { useSocketStore } from '@/stores/socket-store';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw } from 'lucide-react';

export function RealtimeBanner() {
  const status = useSocketStore((s) => s.status);

  if (status === 'connected') return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all',
        status === 'connecting' || status === 'reconnecting'
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
          : 'bg-destructive/10 text-destructive border border-destructive/20',
      )}
    >
      {status === 'connecting' || status === 'reconnecting' ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Reconectando…
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          Desconectado
        </>
      )}
    </div>
  );
}

export function ConnectionIndicator() {
  const status = useSocketStore((s) => s.status);

  return (
    <div className="flex items-center gap-1.5" title={`Socket: ${status}`}>
      <span
        className={cn(
          'w-2 h-2 rounded-full transition-colors',
          status === 'connected' ? 'bg-emerald-500' : 'bg-muted-foreground/40',
        )}
      />
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {status === 'connected' ? 'En vivo' : status === 'connecting' ? 'Conectando…' : 'Sin conexión'}
      </span>
    </div>
  );
}
