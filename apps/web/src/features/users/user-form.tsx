'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_LABELS, ROLE_OPTIONS } from '@/lib/i18n';
import { usersApi } from './users-api';
import type { ManagedUser, UserRole } from './types';

const baseSchema = {
  firstName: z.string().trim().min(1, 'Nombre requerido').max(60),
  lastName: z.string().trim().min(1, 'Apellido requerido').max(60),
  email: z.string().trim().email('Correo inválido'),
  role: z.string().min(1, 'Rol requerido'),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  department: z.string().trim().max(60).optional().or(z.literal('')),
};

const createSchema = z.object({
  ...baseSchema,
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres'),
});

const editSchema = z.object({
  ...baseSchema,
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres')
    .optional()
    .or(z.literal('')),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

interface UserFormProps {
  user?: ManagedUser | null;
  onSuccess: () => void;
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const isEdit = Boolean(user);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues | EditValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema) as any,
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'TRANSPORTER',
      phone: user?.phone ?? '',
      department: user?.department ?? '',
      password: '',
    } as any,
  });

  const roleValue = watch('role') as string | undefined;

  const mutation = useMutation({
    mutationFn: async (values: CreateValues | EditValues) => {
      const payload: any = {
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role as UserRole,
      };
      if (values.phone) payload.phone = values.phone;
      if (values.department) payload.department = values.department;
      if (values.password) payload.password = values.password;

      if (isEdit && user) {
        return usersApi.update(user.id, payload);
      }
      return usersApi.create({ ...payload, email: values.email });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Empleado actualizado' : 'Empleado creado');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onSuccess();
    },
    onError: (err) => {
      toast.error((err as Error).message || 'No se pudo guardar');
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" autoComplete="off" {...register('firstName')} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message as string}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" autoComplete="off" {...register('lastName')} />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message as string}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          type="email"
          autoComplete="off"
          disabled={isEdit}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message as string}</p>
        )}
        {isEdit && (
          <p className="text-xs text-muted-foreground">
            El correo no se puede cambiar después de creado.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="role">Rol</Label>
          <Select
            value={roleValue}
            onValueChange={(val) => setValue('role', val, { shouldValidate: true })}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((key) => (
                <SelectItem key={key} value={key}>
                  {ROLE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-xs text-destructive">{errors.role.message as string}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="department">Departamento</Label>
          <Input id="department" {...register('department')} placeholder="Ej. Enfermería" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone">
          Teléfono <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input id="phone" {...register('phone')} placeholder="+52 ..." />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">
          {isEdit ? 'Nueva contraseña' : 'Contraseña'}{' '}
          {isEdit && <span className="text-muted-foreground">(dejar vacío para no cambiar)</span>}
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message as string}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear empleado'}
        </Button>
      </div>
    </form>
  );
}
