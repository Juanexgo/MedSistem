'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ZONE_LABELS, OXYGEN_STATUS_LABELS } from '@/lib/i18n';

const STATUS_STYLES: Record<string, string> = {
  FULL: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  MEDIUM: 'bg-primary/15 text-primary',
  LOW: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  CRITICAL: 'bg-destructive/15 text-destructive',
};

const transferSchema = z.object({
  patientId: z.string().uuid('Selecciona un paciente'),
  bedNumber: z.string().min(1, 'El número de cama es requerido'),
  floor: z.string().min(1, 'El piso es requerido'),
  origin: z.string().min(1, 'El origen es requerido'),
  destination: z.string().min(1, 'El destino es requerido'),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'SCHEDULED']),
  transportType: z.enum(['STRETCHER', 'WHEELCHAIR', 'WALKING']),
  requestedStudy: z.string().optional(),
  notes: z.string().optional(),
  requiresOxygen: z.boolean().optional(),
  oxygenLiters: z.coerce.number().min(0).optional(),
  assignedTankId: z.string().uuid().optional().or(z.literal('')),
  tankLevel: z.coerce.number().min(0).optional(),
  manometer: z.coerce.number().min(0).optional(),
  requiresDoctorCompanion: z.boolean().optional(),
  doctorCompanionName: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

export function TransferForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const { data: patients } = useQuery<any[]>({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients'),
  });

  const { data: zones } = useQuery<any[]>({
    queryKey: ['zones'],
    queryFn: () => api.get('/zones'),
  });

  const { data: tanks } = useQuery<any[]>({
    queryKey: ['oxygen-tanks'],
    queryFn: () => api.get('/oxygen?isAvailable=true'),
  });

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      priority: 'NORMAL',
      transportType: 'WHEELCHAIR',
      requiresOxygen: false,
      requiresDoctorCompanion: false,
    },
  });

  const requiresOxygen = watch('requiresOxygen');
  const selectedTankId = watch('assignedTankId');
  const selectedTank = tanks?.find((t: any) => t.id === selectedTankId);

  const onSubmit = async (data: TransferFormData) => {
    setSubmitting(true);
    try {
      const payload: any = { ...data };
      payload.requiresOxygen = data.requiresOxygen || false;
      if (payload.requiresOxygen) {
        payload.requiresDoctorCompanion = true;
        if (!payload.doctorCompanionName) throw new Error('El nombre del médico acompañante es requerido para traslados con oxígeno');
        if (!payload.assignedTankId) throw new Error('El tanque de oxígeno es requerido');
        if (!payload.oxygenLiters || payload.oxygenLiters <= 0) throw new Error('Los litros/min de oxígeno son requeridos');
        if (payload.tankLevel === undefined || payload.tankLevel === null) throw new Error('El nivel del tanque es requerido');
        if (payload.manometer === undefined || payload.manometer === null) throw new Error('La lectura del manómetro (PSI) es requerida');
      }
      payload.assignedTankId = data.assignedTankId || undefined;
      payload.oxygenLiters = data.oxygenLiters || undefined;
      payload.tankLevel = data.tankLevel || undefined;
      payload.manometer = data.manometer || undefined;
      const result = await api.post<any>('/transfers', payload);
      toast.success('Traslado creado');
      router.push(`/transfers/${result.id}`);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo crear el traslado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Información del paciente</h2>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Paciente</label>
          <select {...register('patientId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
            <option value="">Selecciona un paciente…</option>
            {patients?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.fullName} (Cama {p.bedNumber})</option>
            ))}
          </select>
          {errors.patientId && <p className="text-destructive text-xs mt-1">{errors.patientId.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Número de cama</label>
            <input {...register('bedNumber')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder="101-A" />
            {errors.bedNumber && <p className="text-destructive text-xs mt-1">{errors.bedNumber.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Piso</label>
            <input {...register('floor')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder="3" />
            {errors.floor && <p className="text-destructive text-xs mt-1">{errors.floor.message}</p>}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Detalles de la ruta</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Origen</label>
            <select {...register('origin')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecciona origen…</option>
              {zones?.map((z: any) => (
                <option key={z.id} value={z.name}>{ZONE_LABELS[z.name] ?? z.name}</option>
              ))}
            </select>
            {errors.origin && <p className="text-destructive text-xs mt-1">{errors.origin.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Destino</label>
            <select {...register('destination')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecciona destino…</option>
              {zones?.map((z: any) => (
                <option key={z.id} value={z.name}>{ZONE_LABELS[z.name] ?? z.name}</option>
              ))}
            </select>
            {errors.destination && <p className="text-destructive text-xs mt-1">{errors.destination.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Prioridad</label>
            <select {...register('priority')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgente</option>
              <option value="HIGH">Alta</option>
              <option value="SCHEDULED">Programada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tipo de transporte</label>
            <select {...register('transportType')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="WHEELCHAIR">Silla de ruedas</option>
              <option value="STRETCHER">Camilla</option>
              <option value="WALKING">Caminando</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Estudio solicitado</label>
          <input {...register('requestedStudy')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder="Rayos X de tórax, Tomografía, etc." />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Notas</label>
          <textarea {...register('notes')} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder="Instrucciones adicionales…" />
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Oxígeno y datos clínicos</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('requiresOxygen')} className="w-4 h-4 rounded border-border text-primary" />
          <span className="text-sm text-foreground">Requiere soporte de oxígeno</span>
        </label>

        {requiresOxygen && (
          <div className="pl-6 space-y-4 border-l-2 border-primary/30">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tanque de oxígeno</label>
              <select {...register('assignedTankId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecciona un tanque…</option>
                {tanks?.filter((t: any) => t.isAvailable)?.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.code} ({t.level}% - {t.psi} PSI - {t.location})
                  </option>
                ))}
              </select>
              {selectedTank && (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[selectedTank.status] || 'bg-muted text-muted-foreground'}`}>
                    {OXYGEN_STATUS_LABELS[selectedTank.status] ?? selectedTank.status}
                  </span>
                  {selectedTank.status === 'LOW' && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">⚠ Este tanque está bajo — considera uno con más carga</span>
                  )}
                  {selectedTank.status === 'CRITICAL' && (
                    <span className="text-xs text-destructive">🚫 Tanque en estado crítico — NO usar para traslado de pacientes</span>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Litros/min *</label>
                <input type="number" {...register('oxygenLiters')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nivel del tanque % *</label>
                <input type="number" {...register('tankLevel')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Manómetro (psi) *</label>
                <input type="number" {...register('manometer')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nombre del médico acompañante *</label>
              <input {...register('doctorCompanionName')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder="Dr./Dra. (requerido para soporte de oxígeno)" />
              <p className="text-xs text-muted-foreground mt-1">Es obligatorio un médico acompañante cuando se requiere soporte de oxígeno</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium rounded-lg transition-colors"
        >
          {submitting ? 'Creando…' : 'Crear traslado'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
