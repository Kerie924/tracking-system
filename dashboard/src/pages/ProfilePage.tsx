import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  cancelRoleChangeRequest,
  cancelSiteChangeRequest,
  createRoleChangeRequest,
  createSiteChangeRequest,
  subscribeToMyRoleChangeRequests,
  subscribeToMySiteChangeRequests,
  subscribeToSites,
  updateUserAssignedSites,
  updateUserProfile,
} from '@/services/firestoreData';
import { getRoleLabel } from '@/i18n/translations';
import {
  REQUESTABLE_ROLES,
  canRequestSiteAssignment,
  siteDisplayName,
  type CatalogSite,
  type Language,
  type RoleChangeRequest,
  type SiteChangeRequest,
  type UserRole,
} from '@/types';
import { Check, Globe, MapPin, Shield } from 'lucide-react';

export function ProfilePage() {
  const {
    user,
    profile,
    role,
    isAdmin,
    assignedSiteIds,
    refreshProfile,
  } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const [name, setName] = useState('');
  const [selectedLang, setSelectedLang] = useState<Language>('es');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [requestedRole, setRequestedRole] = useState<UserRole>('supervisor');
  const [roleRequests, setRoleRequests] = useState<RoleChangeRequest[]>([]);
  const [siteRequests, setSiteRequests] = useState<SiteChangeRequest[]>([]);
  const [sites, setSites] = useState<CatalogSite[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [adminOverrideUserId, setAdminOverrideUserId] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSelectedLang(profile.language);
      setSelectedSiteIds(profile.assignedSiteIds ?? []);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const unsubRole = subscribeToMyRoleChangeRequests(user.uid, setRoleRequests);
    const unsubSite = subscribeToMySiteChangeRequests(user.uid, setSiteRequests);
    const unsubSites = subscribeToSites(setSites);
    return () => {
      unsubRole();
      unsubSite();
      unsubSites();
    };
  }, [user]);

  const pendingRole = useMemo(
    () => roleRequests.find((r) => r.status === 'pending') ?? null,
    [roleRequests]
  );
  const pendingSite = useMemo(
    () => siteRequests.find((r) => r.status === 'pending') ?? null,
    [siteRequests]
  );

  const canEditSiteAssignments =
    canRequestSiteAssignment(role) || isAdmin;

  if (!profile || !user) {
    return (
      <Layout title={t.profile.title} subtitle={t.profile.subtitle}>
        <LoadingSpinner />
      </Layout>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateUserProfile(profile!.id, { name: name.trim() });
      if (selectedLang !== language) {
        await setLanguage(selectedLang);
      } else {
        await refreshProfile();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function submitRoleRequest() {
    setRequestBusy(true);
    setError('');
    try {
      await createRoleChangeRequest({
        userId: user!.uid,
        userName: profile!.name,
        userEmail: profile!.email,
        currentRole: role,
        requestedRole,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.requests.error);
    } finally {
      setRequestBusy(false);
    }
  }

  async function cancelPendingRole() {
    if (!pendingRole) return;
    setRequestBusy(true);
    try {
      await cancelRoleChangeRequest(pendingRole.id, user!.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.requests.error);
    } finally {
      setRequestBusy(false);
    }
  }

  function toggleSite(id: string) {
    setSelectedSiteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submitSiteRequest() {
    setRequestBusy(true);
    setError('');
    try {
      if (isAdmin && adminOverrideUserId.trim()) {
        await updateUserAssignedSites(
          adminOverrideUserId.trim(),
          selectedSiteIds
        );
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else if (isAdmin && !canRequestSiteAssignment(role)) {
        // Admin overriding own sites directly
        await updateUserAssignedSites(user!.uid, selectedSiteIds);
        await refreshProfile();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        await createSiteChangeRequest({
          userId: user!.uid,
          userName: profile!.name,
          userEmail: profile!.email,
          currentSiteIds: assignedSiteIds,
          requestedSiteIds: selectedSiteIds,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.requests.error);
    } finally {
      setRequestBusy(false);
    }
  }

  async function cancelPendingSite() {
    if (!pendingSite) return;
    setRequestBusy(true);
    try {
      await cancelSiteChangeRequest(pendingSite.id, user!.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.requests.error);
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <Layout title={t.profile.title} subtitle={t.profile.subtitle}>
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {saved && (
                <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  <Check className="h-4 w-4" />
                  {t.profile.saved}
                </div>
              )}

              <Input
                label={t.profile.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label={t.profile.email}
                value={profile.email}
                disabled
                readOnly
              />

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-surface-800/70">
                  <Shield className="h-4 w-4" />
                  {t.profile.role}
                </label>
                <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-medium text-surface-900">
                  {getRoleLabel(profile.role, language)}
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-surface-800/70">
                  <Globe className="h-4 w-4" />
                  {t.profile.language}
                </label>
                <Select
                  label=""
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value as Language)}
                  options={[
                    { value: 'es', label: t.profile.spanish },
                    { value: 'en', label: t.profile.english },
                  ]}
                />
                <p className="mt-1 text-xs text-surface-500">{t.profile.languageHint}</p>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? t.profile.saving : t.profile.save}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>{t.requests.roleTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-surface-600">{t.requests.roleHint}</p>
              {pendingRole ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <p className="font-medium text-amber-900">
                    {t.requests.pending}:{' '}
                    {getRoleLabel(String(pendingRole.requestedRole), language)}
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-3"
                    disabled={requestBusy}
                    onClick={() => void cancelPendingRole()}
                  >
                    {t.requests.cancel}
                  </Button>
                </div>
              ) : (
                <>
                  <Select
                    label={t.requests.requestedRole}
                    value={requestedRole}
                    onChange={(e) =>
                      setRequestedRole(e.target.value as UserRole)
                    }
                    options={REQUESTABLE_ROLES.map((r) => ({
                      value: r,
                      label: getRoleLabel(r, language),
                    }))}
                  />
                  <Button
                    disabled={requestBusy || requestedRole === role}
                    onClick={() => void submitRoleRequest()}
                  >
                    {t.requests.submitRole}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Always show My Sites — request (supervisor/meli), override (admin), or read-only info */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t.requests.sitesTitle}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canEditSiteAssignments ? (
              <>
                <p className="text-sm text-surface-600">{t.requests.sitesRoleHint}</p>
                <p className="text-xs text-surface-500">
                  {t.requests.currentSites}:{' '}
                  {assignedSiteIds.length === 0
                    ? '—'
                    : assignedSiteIds
                        .map(
                          (id) =>
                            siteDisplayName(
                              sites.find((s) => s.id === id) ?? {
                                id,
                                code: id,
                                name: id,
                              },
                              language
                            )
                        )
                        .join(', ')}
                </p>
                <p className="text-xs text-surface-500">{t.requests.sitesRequestRole}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-surface-600">
                  {isAdmin ? t.requests.adminSitesHint : t.requests.sitesHint}
                </p>
                {assignedSiteIds.length > 0 && (
                  <p className="text-xs text-surface-500">
                    {t.requests.currentSites}:{' '}
                    {assignedSiteIds
                      .map(
                        (id) =>
                          siteDisplayName(
                            sites.find((s) => s.id === id) ?? {
                              id,
                              code: id,
                              name: id,
                            },
                            language
                          )
                      )
                      .join(', ')}
                  </p>
                )}

                {isAdmin && (
                  <Input
                    label={t.requests.overrideUserId}
                    value={adminOverrideUserId}
                    onChange={(e) => setAdminOverrideUserId(e.target.value)}
                    placeholder={user.uid}
                  />
                )}

                {pendingSite && !isAdmin ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                    <p className="font-medium text-amber-900">
                      {t.requests.pendingSites}:{' '}
                      {pendingSite.requestedSiteIds
                        .map(
                          (id) =>
                            siteDisplayName(
                              sites.find((s) => s.id === id) ?? {
                                id,
                                code: id,
                                name: id,
                              },
                              language
                            )
                        )
                        .join(', ')}
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-3"
                      disabled={requestBusy}
                      onClick={() => void cancelPendingSite()}
                    >
                      {t.requests.cancel}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-surface-200 p-3">
                      {sites.length === 0 ? (
                        <p className="text-sm text-surface-500">{t.requests.noSites}</p>
                      ) : (
                        sites.map((site) => (
                          <label
                            key={site.id}
                            className="flex items-center gap-2 text-sm text-surface-800"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSiteIds.includes(site.id)}
                              onChange={() => toggleSite(site.id)}
                            />
                            {siteDisplayName(site, language)}
                            <span className="text-xs text-surface-400">
                              ({site.code})
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    <Button
                      disabled={requestBusy || selectedSiteIds.length === 0}
                      onClick={() => void submitSiteRequest()}
                    >
                      {isAdmin ? t.requests.saveSites : t.requests.submitSites}
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
