'use client';

import { useAuth } from '@/lib/auth-provider';
import { usePermissions } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/i18n';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { NotificationDropdown } from './notification-dropdown';
import { ModeToggle } from './mode-toggle';
import { RealtimeBanner, ConnectionIndicator } from './realtime-banner';
import { useRealtimeTransfers } from '@/hooks/useRealtimeTransfers';
import { cn } from '@/lib/utils';
import { LogOut, RefreshCw, User, Menu, X, Clock } from 'lucide-react';
import dayjs from 'dayjs';

interface AppShellProps {
  children: React.ReactNode;
  hideRefresh?: boolean;
  onRefresh?: () => void;
  lastUpdated?: Date;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tablero',
  '/map': 'Mapa hospitalario',
  '/transfers': 'Traslados',
  '/transfers/new': 'Nuevo traslado',
  '/patients': 'Pacientes',
  '/oxygen': 'Oxígeno',
  '/shifts': 'Turnos',
  '/shifts/current': 'Turno actual',
  '/shifts/handoff': 'Entrega de turno',
  '/shifts/history': 'Historial de turnos',
  '/communication': 'Centro de comunicación',
  '/notifications': 'Notificaciones',
  '/operations-log': 'Bitácora de operaciones',
  '/reports': 'Reportes',
  '/audit': 'Auditoría',
  '/security-incidents': 'Incidentes de seguridad',
  '/admin/users': 'Empleados',
  '/settings': 'Configuración',
};

function pageTitleFromPath(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Match the longest known prefix (e.g. /transfers/abc → "Traslados")
  const prefix = Object.keys(PAGE_TITLES)
    .filter((p) => pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return PAGE_TITLES[prefix];
  const last = pathname.split('/').filter(Boolean).pop() || '';
  return last.replace(/-/g, ' ');
}

export function AppShell({ children, hideRefresh, onRefresh, lastUpdated }: AppShellProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useRealtimeTransfers();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push('/');
  };

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className={cn('transition-all duration-300', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {pageTitleFromPath(pathname)}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ConnectionIndicator />
              <NotificationDropdown />
              <ModeToggle />
              <div className="w-px h-6 bg-border mx-1" />
              {lastUpdated && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{dayjs(lastUpdated).format('HH:mm:ss')}</span>
                </div>
              )}

              {!hideRefresh && onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Actualizar datos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {user.firstName} {user.lastName}
                </span>
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium uppercase">
                  {ROLE_LABELS[user.role ?? ''] ?? user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{isLoggingOut ? 'Cerrando sesión…' : 'Salir'}</span>
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <MobileNav onClose={() => setMobileMenuOpen(false)} />
          )}
        </header>

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
      <RealtimeBanner />
    </div>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const { user } = useAuth();

  const items = [
    { label: 'Tablero', href: '/dashboard', permission: 'VIEW_DASHBOARD' },
    { label: 'Mapa', href: '/map', permission: 'VIEW_DASHBOARD' },
    { label: 'Traslados', href: '/transfers', permission: 'VIEW_TRANSFERS' },
    { label: 'Nuevo traslado', href: '/transfers/new', permission: 'CREATE_TRANSFER' },
    { label: 'Pacientes', href: '/patients', permission: 'VIEW_PATIENT_DATA' },
    { label: 'Oxígeno', href: '/oxygen', permission: 'MANAGE_OXYGEN' },
    { label: 'Turnos', href: '/shifts', permission: 'MANAGE_SHIFTS' },
    { label: 'Comunicación', href: '/communication', permission: 'VIEW_COMMENTS' },
    { label: 'Bitácora', href: '/operations-log', permission: 'VIEW_DASHBOARD' },
    { label: 'Reportes', href: '/reports', permission: 'EXPORT_REPORTS' },
    { label: 'Auditoría', href: '/audit', permission: 'VIEW_AUDIT' },
    { label: 'Seguridad', href: '/security-incidents', permission: 'VIEW_SECURITY_INCIDENTS' },
    { label: 'Empleados', href: '/admin/users', permission: 'MANAGE_USERS' },
  ];

  return (
    <div className="border-t border-border bg-card lg:hidden">
      <div className="px-4 py-3 space-y-1">
        {items
          .filter((item) => !item.permission || can(item.permission))
          .map((item) => (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                onClose();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {item.label}
            </button>
          ))}
      </div>
      {user && (
        <div className="px-4 py-3 border-t border-border">
          <div className="text-sm text-foreground">{user.firstName} {user.lastName}</div>
          <div className="text-xs text-muted-foreground">{ROLE_LABELS[user.role ?? ''] ?? user.role}</div>
        </div>
      )}
    </div>
  );
}
