'use client';

import { useAuth } from '@/lib/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', permission: 'VIEW_DASHBOARD' },
  { label: 'Transfers', href: '/transfers', permission: 'VIEW_TRANSFERS' },
  { label: 'Oxygen', href: '/oxygen', permission: 'MANAGE_OXYGEN' },
  { label: 'Shifts', href: '/shifts', permission: 'MANAGE_SHIFTS' },
  { label: 'Communication', href: '/communication', permission: 'VIEW_COMMENTS' },
  { label: 'Users', href: '/users', permission: 'MANAGE_USERS' },
  { label: 'Roles', href: '/roles', permission: 'MANAGE_ROLES' },
  { label: 'Audit', href: '/audit', permission: 'VIEW_AUDIT' },
  { label: 'Security', href: '/security-incidents', permission: 'VIEW_SECURITY_INCIDENTS' },
  { label: 'Reports', href: '/reports', permission: 'EXPORT_REPORTS' },
];

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const userPermissions = user.permissions || [];
  const hasPermission = (perm?: string) => !perm || userPermissions.includes(perm);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-900">MediFlow</h1>
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.filter(item => hasPermission(item.permission)).map(item => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    pathname.startsWith(item.href)
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:block">
              {user.firstName} {user.lastName}
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {user.role}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}