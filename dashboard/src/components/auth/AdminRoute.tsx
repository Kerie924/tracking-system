import { useAuth } from '@/contexts/AuthContext';
import { DEV_ALL_ADMIN } from '@/lib/config';
import { LoadingSpinner } from '@/components/ui/Modal';
import { useTranslation } from '@/contexts/LanguageContext';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin && !DEV_ALL_ADMIN) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-sm text-amber-800">{t.users.adminOnly}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
