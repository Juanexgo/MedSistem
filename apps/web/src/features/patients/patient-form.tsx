'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { patientsApi } from './patients-api';
import type { Patient } from './types';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Nombre completo requerido').max(120),
  bedNumber: z.string().trim().min(1, 'Cama requerida').max(40),
  floor: z.string().trim().min(1, 'Piso requerido').max(20),
  medicalRecordNumber: z.string().trim().max(40).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface PatientFormProps {
  patient?: Patient | null;
  canEditClinical?: boolean;
  onSuccess: () => void;
}

export function PatientForm({ patient, canEditClinical = true, onSuccess }: PatientFormProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(patient);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: patient?.fullName ?? '',
      bedNumber: patient?.bedNumber ?? '',
      floor: patient?.floor ?? '',
      medicalRecordNumber: patient?.medicalRecordNumber ?? '',
      notes: patient?.notes ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        fullName: values.fullName,
        bedNumber: values.bedNumber,
        floor: values.floor,
        ...(values.medicalRecordNumber ? { medicalRecordNumber: values.medicalRecordNumber } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      };
      if (isEdit && patient) {
        return patientsApi.update(patient.id, payload);
      }
      return patientsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Paciente actualizado' : 'Paciente creado');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      onSuccess();
    },
    onError: (err) => {
      toast.error((err as Error).message || 'No se pudo guardar');
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="fullName">Nombre completo</Label>
        <Input id="fullName" autoComplete="off" {...register('fullName')} />
        {errors.fullName && (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="bedNumber">Cama</Label>
          <Input id="bedNumber" {...register('bedNumber')} />
          {errors.bedNumber && (
            <p className="text-xs text-destructive">{errors.bedNumber.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="floor">Piso</Label>
          <Input id="floor" {...register('floor')} />
          {errors.floor && (
            <p className="text-xs text-destructive">{errors.floor.message}</p>
          )}
        </div>
      </div>

      {canEditClinical ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="medicalRecordNumber">
              Número de expediente <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="medicalRecordNumber" {...register('medicalRecordNumber')} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">
              Notas clínicas <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>
        </>
      ) : (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Tu rol no tiene acceso al número de expediente ni a las notas clínicas. Contacta a la
          jefa de enfermería si necesitas editar esos campos.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear paciente'}
        </Button>
      </div>
    </form>
  );
}
