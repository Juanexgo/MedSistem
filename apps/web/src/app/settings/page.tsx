'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor, ShieldCheck, KeyRound, UserCircle } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-provider';
import { ROLE_LABELS, PERMISSION_LABELS } from '@/lib/i18n';
import { api } from '@/lib/api';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordValues) => {
      if (!user) throw new Error('No autenticado');
      return api.put(`/users/${user.id}`, { password: values.password });
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      reset();
    },
    onError: (err) => {
      toast.error((err as Error).message || 'No se pudo actualizar la contraseña');
    },
  });

  const themes = [
    { value: 'light', label: 'Claro', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Oscuro', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'Sistema', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajustes de tu cuenta y preferencias.
        </p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" /> Mi cuenta
            </CardTitle>
            <CardDescription>Información de tu perfil.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Nombre</span>
              <span className="font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Correo</span>
              <span className="font-medium text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Rol</span>
              <Badge variant="secondary">
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </Badge>
            </div>
            {user?.department && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Departamento</span>
                <span className="font-medium text-foreground">{user.department}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" /> Apariencia
            </CardTitle>
            <CardDescription>Tema de la interfaz.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {themes.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={theme === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(opt.value)}
                  className="flex items-center gap-2"
                >
                  {opt.icon}
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Cambiar contraseña
            </CardTitle>
            <CardDescription>
              Usa una contraseña fuerte. Mínimo 8 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((v) => passwordMutation.mutate(v))}
              className="grid gap-4 max-w-md"
            >
              <div className="grid gap-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirm')}
                />
                {errors.confirm && (
                  <p className="text-xs text-destructive">{errors.confirm.message}</p>
                )}
              </div>
              <div>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? 'Guardando…' : 'Actualizar contraseña'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {user?.permissions && user.permissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Permisos
              </CardTitle>
              <CardDescription>
                Acciones que tu rol puede ejecutar en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="text-[10px] font-normal">
                    {PERMISSION_LABELS[perm] ?? perm}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
