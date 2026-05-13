'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Wind } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { OXYGEN_STATUS_LABELS } from '@/lib/i18n';

const schema = z.object({
  code: z.string().trim().min(1, 'Código requerido').max(40),
  location: z.string().trim().min(1, 'Ubicación requerida').max(120),
  level: z.coerce.number().int().min(0, 'Mínimo 0').max(100, 'Máximo 100'),
  capacity: z.coerce.number().int().min(1, 'Mínimo 1'),
  psi: z.coerce.number().int().min(0, 'Mínimo 0'),
  status: z.enum(['FULL', 'MEDIUM', 'LOW', 'CRITICAL']),
  isAvailable: z.enum(['true', 'false']),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

function deriveStatus(level: number): 'FULL' | 'MEDIUM' | 'LOW' | 'CRITICAL' {
  if (level >= 75) return 'FULL';
  if (level >= 40) return 'MEDIUM';
  if (level >= 15) return 'LOW';
  return 'CRITICAL';
}

export default function NewOxygenTankPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      location: '',
      level: 100,
      capacity: 2500,
      psi: 2200,
      status: 'FULL',
      isAvailable: 'true',
      notes: '',
    },
  });

  const levelValue = watch('level');
  const statusValue = watch('status');
  const availableValue = watch('isAvailable');

  // Suggest status when level changes (user can still override).
  const suggestedStatus = typeof levelValue === 'number' ? deriveStatus(levelValue) : null;

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.post('/oxygen', {
        code: values.code,
        location: values.location,
        level: values.level,
        capacity: values.capacity,
        psi: values.psi,
        status: values.status,
        isAvailable: values.isAvailable === 'true',
        ...(values.notes ? { notes: values.notes } : {}),
      }),
    onSuccess: () => {
      toast.success('Tanque registrado');
      queryClient.invalidateQueries({ queryKey: ['oxygen-tanks'] });
      queryClient.invalidateQueries({ queryKey: ['oxygen-alerts'] });
      router.push('/oxygen');
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo crear el tanque'),
  });

  if (!can('MANAGE_OXYGEN')) {
    return (
      <AppShell>
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No tienes permiso para gestionar tanques de oxígeno.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button
        onClick={() => router.push('/oxygen')}
        className="text-sm text-primary hover:text-primary/80 mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a oxígeno
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wind className="w-6 h-6 text-primary" /> Nuevo tanque de oxígeno
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registra un tanque físico con su código, ubicación y nivel inicial.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="max-w-2xl space-y-5 bg-card rounded-xl border border-border p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="code">Código del tanque</Label>
            <Input id="code" placeholder="OXY-001" autoComplete="off" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input id="location" placeholder="Urgencias - Estación A" {...register('location')} />
            {errors.location && (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="level">Nivel actual (%)</Label>
            <Input id="level" type="number" min={0} max={100} {...register('level')} />
            {errors.level && <p className="text-xs text-destructive">{errors.level.message}</p>}
            {suggestedStatus && suggestedStatus !== statusValue && (
              <button
                type="button"
                onClick={() => setValue('status', suggestedStatus, { shouldValidate: true })}
                className="text-[11px] text-primary text-left hover:underline"
              >
                Sugerido: {OXYGEN_STATUS_LABELS[suggestedStatus]}
              </button>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capacity">Capacidad (L)</Label>
            <Input id="capacity" type="number" min={1} {...register('capacity')} />
            {errors.capacity && (
              <p className="text-xs text-destructive">{errors.capacity.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="psi">PSI (manómetro)</Label>
            <Input id="psi" type="number" min={0} {...register('psi')} />
            {errors.psi && <p className="text-xs text-destructive">{errors.psi.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={statusValue}
              onValueChange={(v) =>
                setValue('status', v as FormValues['status'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['FULL', 'MEDIUM', 'LOW', 'CRITICAL'] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {OXYGEN_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="isAvailable">Disponibilidad</Label>
            <Select
              value={availableValue}
              onValueChange={(v) =>
                setValue('isAvailable', v as FormValues['isAvailable'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="isAvailable">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Disponible</SelectItem>
                <SelectItem value="false">No disponible (en uso o mantenimiento)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">
            Notas <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Observaciones, fecha de última inspección, etc."
            {...register('notes')}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/oxygen')}
            disabled={isSubmitting || mutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? 'Registrando…' : 'Registrar tanque'}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
