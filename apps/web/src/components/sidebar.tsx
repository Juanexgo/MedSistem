'use client';

import { useRouter, usePathname } from 'next/navigation';
import { usePermissions } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowRightLeft,
  PlusCircle,
  Users,
  Wind,
  Clock,
  MessageSquare,
  Bell,
  ScrollText,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  Hospital,
  Activity,
  FileText,
  Map,
  UserCog,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tablero', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, permission: 'VIEW_DASHBOARD' },
  { label: 'Mapa', href: '/map', icon: <Map className="w-4 h-4" />, permission: 'VIEW_DASHBOARD' },
  { label: 'Traslados', href: '/transfers', icon: <ArrowRightLeft className="w-4 h-4" />, permission: 'VIEW_TRANSFERS' },
  { label: 'Nuevo traslado', href: '/transfers/new', icon: <PlusCircle className="w-4 h-4" />, permission: 'CREATE_TRANSFER' },
  { label: 'Pacientes', href: '/patients', icon: <Users className="w-4 h-4" />, permission: 'VIEW_PATIENT_DATA' },
  { label: 'Oxígeno', href: '/oxygen', icon: <Wind className="w-4 h-4" />, permission: 'MANAGE_OXYGEN' },
  { label: 'Turnos', href: '/shifts', icon: <Clock className="w-4 h-4" />, permission: 'MANAGE_SHIFTS' },
  { label: 'Comunicación', href: '/communication', icon: <MessageSquare className="w-4 h-4" />, permission: 'VIEW_COMMENTS' },
  { label: 'Notificaciones', href: '/notifications', icon: <Bell className="w-4 h-4" /> },
  { label: 'Bitácora', href: '/operations-log', icon: <Activity className="w-4 h-4" />, permission: 'VIEW_DASHBOARD' },
  { label: 'Reportes', href: '/reports', icon: <FileText className="w-4 h-4" />, permission: 'EXPORT_REPORTS' },
  { label: 'Auditoría', href: '/audit', icon: <ScrollText className="w-4 h-4" />, permission: 'VIEW_AUDIT' },
  { label: 'Seguridad', href: '/security-incidents', icon: <ShieldAlert className="w-4 h-4" />, permission: 'VIEW_SECURITY_INCIDENTS' },
  { label: 'Empleados', href: '/admin/users', icon: <UserCog className="w-4 h-4" />, permission: 'MANAGE_USERS' },
  { label: 'Configuración', href: '/settings', icon: <Settings className="w-4 h-4" />, permission: 'MANAGE_SETTINGS' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { can, role } = usePermissions();

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-card border-r border-border z-40 flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-border">
        <Hospital className="w-6 h-6 text-primary flex-shrink-0" />
        {!collapsed && (
          <span className="ml-3 text-lg font-bold text-foreground whitespace-nowrap">MediFlow</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border">
        {!collapsed && role && (
          <div className="px-3 py-2 mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Rol</span>
            <div className="text-xs font-medium text-foreground mt-0.5">{ROLE_LABELS[role] ?? role}</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
