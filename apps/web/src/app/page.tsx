'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hospital } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('NetworkError') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        setError('No se pudo conectar al servidor. Verifica que el API esté corriendo en el puerto 4000.');
      } else if (/Invalid email or password|Unauthorized/i.test(msg)) {
        setError('Correo o contraseña incorrectos.');
      } else if (/Too Many|throttle/i.test(msg)) {
        setError('Demasiados intentos. Vuelve a intentar en unos minutos.');
      } else {
        setError(msg || 'No se pudo iniciar sesión.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-2xl border border-border">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3">
            <Hospital className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">MediFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de logística hospitalaria
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Correo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none"
              placeholder="usuario@hospital.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          MediFlow v1.0 · Sistema interno hospitalario
        </div>
      </div>
    </div>
  );
}
