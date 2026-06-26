import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { LoadingSpinner, EmptyState } from '@/components/ui/Modal';
import { useFirestoreUsers } from '@/hooks/useFirestoreData';
import { useTranslation } from '@/contexts/LanguageContext';
import { updateUserRole } from '@/services/firestoreData';
import { getRoleLabel } from '@/i18n/translations';
import { USER_ROLES, type UserRole } from '@/types';
import { Users, Mail, Shield } from 'lucide-react';

export function UsersPage() {
  const { t, language } = useTranslation();
  const { users, loading, error } = useFirestoreUsers();
  const [updating, setUpdating] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-purple-50 text-purple-700',
    user: 'bg-surface-100 text-surface-600',
  };

  async function handleRoleChange(userId: string, role: UserRole) {
    setUpdating(userId);
    try {
      await updateUserRole(userId, role);
      setSavedId(userId);
      setTimeout(() => setSavedId(null), 2000);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <Layout title={t.users.title} subtitle={t.users.subtitle}>
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t.users.title}
          description={t.serviceSheet.noData}
        />
      ) : (
        <Card>
          <CardContent className="px-0 pb-0 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200 text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                      {t.users.name}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                      {t.users.email}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                      {t.users.role}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                      {t.users.created}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-surface-100 transition-colors hover:bg-surface-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="font-medium text-surface-900">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-surface-800/70">
                          <Mail className="h-4 w-4 text-surface-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role]}`}
                          >
                            <Shield className="h-3 w-3" />
                            {getRoleLabel(user.role, language)}
                          </span>
                          <Select
                            label=""
                            value={user.role}
                            disabled={updating === user.id}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value as UserRole)
                            }
                            options={USER_ROLES.map((r) => ({
                              value: r,
                              label: getRoleLabel(r, language),
                            }))}
                          />
                          {savedId === user.id && (
                            <span className="text-xs text-brand-600">
                              {t.users.saved}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-800/50">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              language === 'en' ? 'en-US' : 'es-MX'
                            )
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
