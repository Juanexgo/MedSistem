'use client';

import { AppShell } from '@/components/app-shell';
import { TransferForm } from '@/components/transfer-form';
import { usePermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewTransferPage() {
  const { can } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!can('CREATE_TRANSFER')) router.push('/transfers');
  }, []);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Nuevo traslado</h1>
        <p className="text-sm text-muted-foreground mt-1">Crea una solicitud de traslado de paciente</p>
      </div>
      <TransferForm />
    </AppShell>
  );
}