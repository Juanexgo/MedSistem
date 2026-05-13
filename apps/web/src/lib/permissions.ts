import { useAuth } from './auth-provider';

export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions || [];

  return {
    can: (permission: string) => permissions.includes(permission),
    canAny: (...perms: string[]) => perms.some(p => permissions.includes(p)),
    canAll: (...perms: string[]) => perms.every(p => permissions.includes(p)),
    permissions,
    role: user?.role || null,
  };
}