import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { getRoleLabel } from '@/i18n/translations';
import {
  reviewRoleChangeRequest,
  reviewSiteChangeRequest,
  subscribeToRoleChangeRequests,
  subscribeToSiteChangeRequests,
  subscribeToSites,
} from '@/services/firestoreData';
import {
  siteDisplayName,
  type CatalogSite,
  type RoleChangeRequest,
  type SiteChangeRequest,
} from '@/types';
import { LoadingSpinner } from '@/components/ui/Modal';

export function AdminRequestQueues() {
  const { t, language } = useTranslation();
  const { user, profile, canReviewRoleRequests, isAdmin } = useAuth();
  const [roleRequests, setRoleRequests] = useState<RoleChangeRequest[]>([]);
  const [siteRequests, setSiteRequests] = useState<SiteChangeRequest[]>([]);
  const [sites, setSites] = useState<CatalogSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReview = canReviewRoleRequests || isAdmin;

  useEffect(() => {
    if (!canReview) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubRole = subscribeToRoleChangeRequests(
      (data) => {
        setRoleRequests(data.filter((r) => r.status === 'pending'));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    const unsubSite = subscribeToSiteChangeRequests(
      (data) => setSiteRequests(data.filter((r) => r.status === 'pending')),
      (err) => setError(err.message)
    );
    const unsubSites = subscribeToSites(setSites);
    return () => {
      unsubRole();
      unsubSite();
      unsubSites();
    };
  }, [canReview]);

  const siteNameById = useMemo(() => {
    const map = new Map(sites.map((s) => [s.id, siteDisplayName(s, language)]));
    return map;
  }, [sites, language]);

  if (!canReview) return null;

  async function reviewRole(id: string, decision: 'approved' | 'rejected') {
    if (!user) return;
    setBusyId(id);
    setError(null);
    try {
      await reviewRoleChangeRequest(id, decision, {
        uid: user.uid,
        name: profile?.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.dashboard.error);
    } finally {
      setBusyId(null);
    }
  }

  async function reviewSite(id: string, decision: 'approved' | 'rejected') {
    if (!user) return;
    setBusyId(id);
    setError(null);
    try {
      await reviewSiteChangeRequest(id, decision, {
        uid: user.uid,
        name: profile?.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.dashboard.error);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t.requests.roleQueue}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : roleRequests.length === 0 ? (
            <p className="text-sm text-surface-500">{t.requests.noRolePending}</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {roleRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-surface-900">
                      {req.userName || req.userEmail || req.userId}
                    </p>
                    <p className="text-sm text-surface-700">
                      {getRoleLabel(String(req.currentRole), language)} →{' '}
                      {getRoleLabel(String(req.requestedRole), language)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={busyId === req.id}
                      onClick={() => void reviewRole(req.id, 'rejected')}
                    >
                      {t.users.reject}
                    </Button>
                    <Button
                      disabled={busyId === req.id}
                      onClick={() => void reviewRole(req.id, 'approved')}
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

      <Card>
        <CardHeader>
          <CardTitle>{t.requests.siteQueue}</CardTitle>
        </CardHeader>
        <CardContent>
          {siteRequests.length === 0 ? (
            <p className="text-sm text-surface-500">{t.requests.noSitePending}</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {siteRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-surface-900">
                      {req.userName || req.userEmail || req.userId}
                    </p>
                    <p className="text-sm text-surface-700">
                      {req.requestedSiteIds
                        .map((id) => siteNameById.get(id) ?? id)
                        .join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={busyId === req.id}
                      onClick={() => void reviewSite(req.id, 'rejected')}
                    >
                      {t.users.reject}
                    </Button>
                    <Button
                      disabled={busyId === req.id}
                      onClick={() => void reviewSite(req.id, 'approved')}
                    >
                      {t.users.approve}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
