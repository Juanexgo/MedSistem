'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, Users, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

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
import { ROLE_LABELS, EMPLOYEE_STATUS_LABELS } from '@/lib/i18n';
import { UserForm } from './user-form';
import { usersApi } from './users-api';
import type { ManagedUser } from './types';

export function UsersTable() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    { type: 'delete' | 'restore'; user: ManagedUser } | null
  >(null);

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    staleTime: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('Empleado dado de baja');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: (err) => toast.error((err as Error).message || 'No se pudo dar de baja'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => usersApi.restore(id),
    onSuccess: () => {
      toast.success('Empleado reactivado');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: (err) => toast.error((err as Error).message || 'No se pudo reactivar'),
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
        {(error as Error)?.message || 'No se pudo cargar la lista de empleados'}
      </div>
    );
  }

  const list = users ?? [];

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          title="Aún no hay empleados"
          description="Da de alta al primer empleado para comenzar."
          icon={<Users className="h-12 w-12" />}
          action={{ label: 'Nuevo empleado', onClick: () => setCreateOpen(true) }}
        />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo empleado</DialogTitle>
              <DialogDescription>
                Crea una cuenta para un miembro del personal.
              </DialogDescription>
            </DialogHeader>
            <UserForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Nuevo empleado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo empleado</DialogTitle>
              <DialogDescription>
                Crea una cuenta para un miembro del personal.
              </DialogDescription>
            </DialogHeader>
            <UserForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Última sesión</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((u) => {
              const isInactive = !u.isActive || !!u.deletedAt;
              return (
                <TableRow key={u.id} className={isInactive ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    {u.firstName} {u.lastName}
                    {isInactive && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.employeeStatus ? (
                      <span className="text-xs text-muted-foreground">
                        {EMPLOYEE_STATUS_LABELS[u.employeeStatus] ?? u.employeeStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.department ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.lastLoginAt
                      ? dayjs(u.lastLoginAt).format('DD/MM/YYYY HH:mm')
                      : 'Nunca'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(u)}
                        aria-label="Editar empleado"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isInactive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmAction({ type: 'restore', user: u })}
                          aria-label="Reactivar empleado"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmAction({ type: 'delete', user: u })}
                          aria-label="Dar de baja"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar empleado</DialogTitle>
            <DialogDescription>Actualiza datos, rol o contraseña.</DialogDescription>
          </DialogHeader>
          {editing && <UserForm user={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'delete' ? 'Dar de baja empleado' : 'Reactivar empleado'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'delete'
                ? <>Esto desactivará la cuenta de <strong>{confirmAction.user.firstName} {confirmAction.user.lastName}</strong> y cerrará sus sesiones activas. Se puede reactivar después.</>
                : <>Esto reactivará a <strong>{confirmAction?.user.firstName} {confirmAction?.user.lastName}</strong> y le permitirá iniciar sesión nuevamente.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'delete') deleteMutation.mutate(confirmAction.user.id);
                else restoreMutation.mutate(confirmAction.user.id);
              }}
              disabled={deleteMutation.isPending || restoreMutation.isPending}
            >
              {confirmAction?.type === 'delete'
                ? (deleteMutation.isPending ? 'Dando de baja…' : 'Dar de baja')
                : (restoreMutation.isPending ? 'Reactivando…' : 'Reactivar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
