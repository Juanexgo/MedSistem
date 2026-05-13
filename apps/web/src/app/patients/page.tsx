'use client';

import { AppShell } from '@/components/app-shell';
import { PatientsTable } from '@/features/patients/patients-table';
import { usePermissions } from '@/lib/permissions';

export default function PatientsPage() {
  const { can } = usePermissions();

  if (!can('VIEW_PATIENT_DATA')) {
    return (
      <AppShell>
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No tienes permiso para ver pacientes.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro de pacientes admitidos. El personal de transporte ve una versión sin
            número de expediente ni notas clínicas.
          </p>
        </div>
      </div>
      <PatientsTable />
    </AppShell>
  );
}
