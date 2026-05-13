'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-provider';
import { PatientForm } from './patient-form';
import { patientsApi } from './patients-api';
import type { Patient } from './types';

const SANITIZED_VIEW_ROLES = new Set(['TRANSPORTER']);

export function PatientsTable() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);

  const canEditClinical = !SANITIZED_VIEW_ROLES.has(user?.role ?? '');

  const { data: patients, isLoading, isError, error } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsApi.list(),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientsApi.remove(id),
    onSuccess: () => {
      toast.success('Paciente archivado');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setConfirmDelete(null);
    },
    onError: (err) => toast.error((err as Error).message || 'No se pudo archivar'),
  });

  if (isLoading) {
    return (
      <div className="grid gap-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {(error as Error)?.message || 'No se pudieron cargar los pacientes'}
      </div>
    );
  }

  if (!patients || patients.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          title="Aún no hay pacientes"
          description={
            can('VIEW_PATIENT_DATA')
              ? 'Da de alta al primer paciente para comenzar.'
              : 'Los registros de pacientes aparecerán aquí.'
          }
          icon={<UserRound className="h-12 w-12" />}
          action={
            can('VIEW_PATIENT_DATA')
              ? { label: 'Nuevo paciente', onClick: () => setCreateOpen(true) }
              : undefined
          }
        />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo paciente</DialogTitle>
              <DialogDescription>Agrega un paciente al registro.</DialogDescription>
            </DialogHeader>
            <PatientForm
              canEditClinical={canEditClinical}
              onSuccess={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {can('VIEW_PATIENT_DATA') && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Nuevo paciente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo paciente</DialogTitle>
                <DialogDescription>Agrega un paciente al registro.</DialogDescription>
              </DialogHeader>
              <PatientForm
                canEditClinical={canEditClinical}
                onSuccess={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre completo</TableHead>
              <TableHead>Cama</TableHead>
              <TableHead>Piso</TableHead>
              <TableHead>Expediente</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.fullName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{p.bedNumber}</Badge>
                </TableCell>
                <TableCell>{p.floor}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.medicalRecordNumber ?? (
                    <span className="text-xs italic">
                      {canEditClinical ? '—' : 'Restringido'}
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                  {p.notes ?? (
                    <span className="text-xs italic">
                      {canEditClinical ? '—' : 'Restringido'}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(p)}
                      aria-label="Editar paciente"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete(p)}
                      aria-label="Archivar paciente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
            <DialogDescription>Actualiza los datos del paciente.</DialogDescription>
          </DialogHeader>
          {editing && (
            <PatientForm
              patient={editing}
              canEditClinical={canEditClinical}
              onSuccess={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar paciente</DialogTitle>
            <DialogDescription>
              Esto archivará a <strong>{confirmDelete?.fullName}</strong>. Un administrador puede
              restaurarlo después.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Archivando…' : 'Archivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
