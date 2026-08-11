import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, EmptyState } from '@/components/ui/Modal';
import { useFirestoreUsers } from '@/hooks/useFirestoreData';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  reviewRoleChangeRequest,
  subscribeToRoleChangeRequests,
  updateUserRole,
} from '@/services/firestoreData';
import { getRoleLabel } from '@/i18n/translations';
import { USER_ROLES, type RoleChangeRequest, type UserRole } from '@/types';
import { Users, Mail, Shield } from 'lucide-react';

export function UsersPage() {
  const { t, language } = useTranslation();
  const { user, profile, canReviewRoleRequests } = useAuth();
  const { users, loading, error } = useFirestoreUsers();
  const [updating, setUpdating] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-purple-50 text-purple-700',
    supervisor: 'bg-sky-50 text-sky-700',
    elaboro: 'bg-surface-100 text-surface-600',
    cliente: 'bg-amber-50 text-amber-800',
    operador: 'bg-emerald-50 text-emerald-700',
    meli: 'bg-yellow-50 text-yellow-800',
  };

  useEffect(() => {
    if (!canReviewRoleRequests) {
      setRequests([]);
      setRequestsLoading(false);
      return;
    }
    setRequestsLoading(true);
    return subscribeToRoleChangeRequests(
      (data) => {
        setRequests(data);
        setRequestsLoading(false);
        setRequestsError(null);
      },
      (err) => {
        setRequestsError(err.message);
        setRequestsLoading(false);
      }
    );
  }, [canReviewRoleRequests]);

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

  async function handleReview(
    requestId: string,
    decision: 'approved' | 'rejected'
  ) {
    if (!user) return;
    setReviewingId(requestId);
    try {
      await reviewRoleChangeRequest(requestId, decision, {
        uid: user.uid,
        name: profile?.name,
      });
    } catch (err) {
      console.error('Failed to review role request:', err);
    } finally {
      setReviewingId(null);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <Layout title={t.users.title} subtitle={t.users.subtitle}>
      {canReviewRoleRequests && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t.users.roleRequests}</CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <LoadingSpinner />
            ) : requestsError ? (
              <p className="text-sm text-rose-600">{requestsError}</p>
            ) : pendingRequests.length === 0 ? (
              <p className="text-sm text-surface-500">{t.users.noRequests}</p>
            ) : (
              <div className="divide-y divide-surface-100">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-surface-900">
                        {req.userName || req.userEmail || req.userId}
                      </p>
                      <p className="text-xs text-surface-500">{req.userEmail}</p>
                      <p className="mt-1 text-sm text-surface-700">
                        {getRoleLabel(String(req.currentRole), language)} →{' '}
                        {getRoleLabel(String(req.requestedRole), language)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={reviewingId === req.id}
                        onClick={() => handleReview(req.id, 'rejected')}
                      >
                        {t.users.reject}
                      </Button>
                      <Button
                        disabled={reviewingId === req.id}
                        onClick={() => handleReview(req.id, 'approved')}
                      >
                        {t.users.approve}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-surface-100 transition-colors hover:bg-surface-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                            {u.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="font-medium text-surface-900">
                            {u.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-surface-800/70">
                          <Mail className="h-4 w-4 text-surface-400" />
                          {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[u.role]}`}
                          >
                            <Shield className="h-3 w-3" />
                            {getRoleLabel(u.role, language)}
                          </span>
                          <Select
                            label=""
                            value={u.role}
                            disabled={updating === u.id}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as UserRole)
                            }
                            options={USER_ROLES.map((r) => ({
                              value: r,
                              label: getRoleLabel(r, language),
                            }))}
                          />
                          {savedId === u.id && (
                            <span className="text-xs text-brand-600">
                              {t.users.saved}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-800/50">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(
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
