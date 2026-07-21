import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';

export function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { loading, canManageUsers } = useAuth();
  const { t } = useTranslation();

  if (loading) return null;

  if (!canManageUsers) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
          <p className="text-sm text-amber-800">{t.users.ownerOnly}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** @deprecated Use OwnerRoute */
export const AdminRoute = OwnerRoute;
