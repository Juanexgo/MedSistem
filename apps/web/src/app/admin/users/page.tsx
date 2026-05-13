'use client';

import { AppShell } from '@/components/app-shell';
import { UsersTable } from '@/features/users/users-table';
import { usePermissions } from '@/lib/permissions';

export default function AdminUsersPage() {
  const { can } = usePermissions();

  if (!can('MANAGE_USERS')) {
    return (
      <AppShell>
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No tienes permiso para gestionar empleados.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empleados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las cuentas del personal: alta, edición, cambio de rol, baja y reactivación.
          </p>
        </div>
      </div>
      <UsersTable />
    </AppShell>
  );
}
