'use client';

import { AppShell } from '@/components/app-shell';
import { TransferTable } from '@/components/transfer-table';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/lib/permissions';

export default function TransfersPage() {
  const router = useRouter();
  const { can } = usePermissions();

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Traslados</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona las solicitudes de traslado de pacientes</p>
        </div>
        {can('CREATE_TRANSFER') && (
          <button
            onClick={() => router.push('/transfers/new')}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg text-sm transition-colors"
          >
            + Nuevo traslado
          </button>
        )}
      </div>
      <TransferTable />
    </AppShell>
  );
}