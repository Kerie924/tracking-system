import { useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  ServiceSheetTable,
  ServiceSheetFormView,
} from '@/components/serviceSheets/ServiceSheetTable';
import {
  CreateModePicker,
  CreateServiceSheetWizard,
  createBlankWizardSheet,
} from '@/components/serviceSheets/CreateServiceSheetWizard';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal, LoadingSpinner } from '@/components/ui/Modal';
import { useServiceSheets } from '@/hooks/useFirestoreData';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { getStatusLabel } from '@/i18n/translations';
import {
  createServiceSheet,
  subscribeToSites,
  updateServiceSheet,
} from '@/services/firestoreData';
import {
  processServiceSheetOcr,
  uploadSheetScan,
} from '@/services/ocr';
import {
  canAccessLogisticsAccount,
  canAccessSheetSite,
  canAdvanceSheetStatus,
  canEditSheet,
  canManageSheetTickets,
  canRejectSheet,
  applyStatusTransition,
  getNextSheetStatus,
  getSheetStatus,
  LOGISTICS_ACCOUNTS,
  logisticsDisplayName,
  SERVICE_SHEET_STATUSES,
  siteDisplayName,
  validateSheetForStatus,
  type CatalogSite,
  type ServiceSheet,
} from '@/types';
import { LogisticsTicketsForm } from '@/components/serviceSheets/LogisticsTicketsForm';
import { Camera, Plus, Search } from 'lucide-react';

type CreatePhase = 'picker' | 'ocr' | 'wizard';

export function DeparturesPage() {
  const { t, language } = useTranslation();
  const { user, profile, role, assignedSiteIds, assignedLogisticsIds } =
    useAuth();
  // Always show create CTA when signed in — full wizard → Firestore create.
  const showCreateButton = !!user;
  const { sheets, loading, error } = useServiceSheets();
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [logisticsFilter, setLogisticsFilter] = useState('');
  const [sites, setSites] = useState<CatalogSite[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [historyFilter, setHistoryFilter] = useState<
    'all' | 'completed' | 'process1' | 'rejected' | 'toApprove' | 'process2'
  >('all');
  const [selected, setSelected] = useState<ServiceSheet | null>(null);
  const [draft, setDraft] = useState<ServiceSheet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [createPhase, setCreatePhase] = useState<CreatePhase | null>(null);
  const [createMode, setCreateMode] = useState<'manual' | 'ocr'>('manual');
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scanBlob, setScanBlob] = useState<Blob | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCreating = createPhase != null;

  useEffect(() => subscribeToSites(setSites), []);

  const operadorKpis = useMemo(() => {
    if (role !== 'operador') return null;
    let pending = 0;
    let completed = 0;
    for (const s of sheets) {
      if (
        !canAccessLogisticsAccount(
          role,
          s.logisticsAccountId,
          assignedLogisticsIds
        )
      ) {
        continue;
      }
      const status = getSheetStatus(s);
      if (status === 'pending_logistics') pending += 1;
      else if (status === 'completed') completed += 1;
    }
    return { pending, completed };
  }, [sheets, role, assignedLogisticsIds]);

  const filtered = useMemo(() => {
    return sheets.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        s.folio.toLowerCase().includes(q) ||
        (s.operatorName?.toLowerCase().includes(q) ?? false) ||
        s.codigo.toLowerCase().includes(q) ||
        (s.siteName?.toLowerCase().includes(q) ?? false) ||
        (s.userName?.toLowerCase().includes(q) ?? false);

      const matchesSite =
        !siteFilter ||
        s.siteId === siteFilter ||
        s.codigo === siteFilter ||
        s.siteName === siteFilter ||
        sites.some(
          (site) =>
            site.id === siteFilter &&
            (s.siteId === site.id ||
              s.codigo === site.code ||
              s.codigo === site.formCodigo ||
              s.siteName === site.code ||
              s.siteName === site.name)
        );

      const matchesLogistics =
        !logisticsFilter || s.logisticsAccountId === logisticsFilter;

      const status = getSheetStatus(s);
      const matchesStatus = !statusFilter || status === statusFilter;

      let matchesHistory = true;
      if (historyFilter === 'completed') {
        matchesHistory = status === 'completed';
      } else if (historyFilter === 'rejected') {
        matchesHistory = status === 'rejected';
      } else if (historyFilter === 'process1') {
        matchesHistory =
          status === 'pending_supervisor' || status === 'pending_meli';
      } else if (historyFilter === 'process2') {
        matchesHistory = status === 'pending_logistics';
      } else if (historyFilter === 'toApprove') {
        if (role === 'supervisor') {
          matchesHistory =
            status === 'pending_supervisor' &&
            canAccessSheetSite(role, s, assignedSiteIds, sites);
        } else if (role === 'meli') {
          matchesHistory =
            status === 'pending_meli' &&
            canAccessSheetSite(role, s, assignedSiteIds, sites);
        } else if (role === 'operador') {
          matchesHistory =
            status === 'pending_logistics' &&
            canAccessLogisticsAccount(
              role,
              s.logisticsAccountId,
              assignedLogisticsIds
            );
        } else if (role === 'admin') {
          matchesHistory = status === 'pending_logistics';
        } else matchesHistory = false;
      }

      return (
        matchesSearch &&
        matchesSite &&
        matchesLogistics &&
        matchesStatus &&
        matchesHistory
      );
    });
  }, [
    sheets,
    search,
    siteFilter,
    logisticsFilter,
    statusFilter,
    historyFilter,
    role,
    assignedSiteIds,
    assignedLogisticsIds,
    sites,
  ]);

  const modalOpen = isCreating || !!selected;
  const activeSheet = isEditing ? draft : selected;
  const editable = isEditing;

  const canEditSelected =
    !!selected && !!user && canEditSheet(role, selected, user.uid);

  const nextStatus =
    selected && !isCreating
      ? getNextSheetStatus(getSheetStatus(selected))
      : null;

  const canManageTicketsSelected =
    !!selected &&
    canManageSheetTickets(role, selected, assignedLogisticsIds);

  const canAdvanceSelected =
    (!!selected &&
      !!user &&
      !!nextStatus &&
      canAdvanceSheetStatus(
        role,
        selected,
        user.uid,
        nextStatus,
        assignedSiteIds,
        sites,
        assignedLogisticsIds
      )) ||
    canManageTicketsSelected;

  const canRejectSelected =
    !!selected &&
    !isCreating &&
    !isEditing &&
    canRejectSheet(role, selected, assignedSiteIds, sites);

  const closeModal = () => {
    if (scanPreviewUrl) URL.revokeObjectURL(scanPreviewUrl);
    setSelected(null);
    setDraft(null);
    setIsEditing(false);
    setCreatePhase(null);
    setCreateMode('manual');
    setScanPreviewUrl(null);
    setScanBlob(null);
    setSaveError(null);
    setShowReject(false);
    setRejectReason('');
    setOcrBusy(false);
    setTicketsOpen(false);
  };

  const openCreateModal = () => {
    if (!user) return;
    setSelected(null);
    setDraft(null);
    setIsEditing(false);
    setCreatePhase('picker');
    setSaveError(null);
  };

  const startManual = () => {
    if (!user) return;
    setCreateMode('manual');
    setDraft(
      createBlankWizardSheet(user.uid, profile?.name, user.email ?? profile?.email)
    );
    setScanBlob(null);
    setScanPreviewUrl(null);
    setCreatePhase('wizard');
  };

  const startOcr = () => {
    setCreateMode('ocr');
    setCreatePhase('ocr');
    setSaveError(null);
  };

  const handleOcrFile = async (file: File | undefined) => {
    if (!file || !user) return;
    setOcrBusy(true);
    setSaveError(null);
    try {
      const result = await processServiceSheetOcr(
        file,
        user.uid,
        profile?.name,
        user.email ?? profile?.email
      );
      setDraft(result.sheet);
      setScanBlob(result.imageBlob);
      setScanPreviewUrl(result.previewUrl);
      setCreatePhase('wizard');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.createSheet.ocrError
      );
    } finally {
      setOcrBusy(false);
    }
  };

  const openEditMode = () => {
    if (!selected || !canEditSelected) return;
    setDraft({ ...selected });
    setIsEditing(true);
    setSaveError(null);
  };

  const handleWizardSave = async (sheet: ServiceSheet, asDraft: boolean) => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (!asDraft && !scanBlob && !sheet.photoUri) {
        setSaveError(t.createSheet.photoRequired);
        return;
      }

      const sheetId =
        sheet.id?.startsWith('sheet-') ? sheet.id : `sheet-${Date.now()}`;
      const now = new Date().toISOString();
      let photoUri = sheet.photoUri;
      if (scanBlob) {
        try {
          photoUri = await uploadSheetScan(sheetId, scanBlob);
        } catch (uploadErr) {
          // Still save the sheet if Storage rules are not deployed yet.
          console.warn('Scan upload failed, saving sheet without photoUri', uploadErr);
        }
      }

      const status = asDraft
        ? 'draft'
        : sheet.status && sheet.status !== 'draft'
          ? sheet.status
          : createMode === 'ocr'
            ? sheet.status
            : 'pending_supervisor';

      await createServiceSheet({
        ...sheet,
        id: sheetId,
        createdBy: user.uid,
        createdByName: profile?.name || sheet.createdByName || user.email || '',
        userId: user.uid,
        userName: profile?.name || sheet.userName,
        userEmail: user.email ?? profile?.email ?? sheet.userEmail,
        photoUri,
        source: createMode,
        status,
        createdAt: sheet.createdAt || now,
        elaboroSignedAt:
          asDraft ? sheet.elaboroSignedAt : sheet.elaboroSignedAt || now,
        elaboro:
          sheet.elaboro ||
          profile?.name ||
          user.displayName ||
          user.email ||
          '',
      });
      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.serviceSheet.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!draft || !user || !draft.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateServiceSheet(draft.id, draft);
      setSelected(draft);
      setIsEditing(false);
      setDraft(null);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.serviceSheet.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = async () => {
    if (!selected || !user || !nextStatus) return;

    const currentStatus = getSheetStatus(selected);
    // Logistics tickets are required before completing pending_logistics sheets.
    if (
      nextStatus === 'completed' ||
      (currentStatus === 'pending_logistics' && role === 'operador')
    ) {
      setTicketsOpen(true);
      return;
    }

    const missing = validateSheetForStatus(selected, nextStatus);
    if (missing) {
      const hints = t.serviceSheet.validationHints as Record<string, string>;
      setSaveError(hints[missing] ?? t.serviceSheet.statusBlocked);
      return;
    }

    if (
      !canAdvanceSheetStatus(
        role,
        selected,
        user.uid,
        nextStatus,
        assignedSiteIds,
        sites,
        assignedLogisticsIds
      )
    ) {
      setSaveError(t.serviceSheet.statusBlocked);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const updated = applyStatusTransition(selected, nextStatus, {
        uid: user.uid,
        name: profile?.name,
        role,
      });
      await updateServiceSheet(selected.id, updated);
      setSelected(updated);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.serviceSheet.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTicketsComplete = async (sheet: ServiceSheet) => {
    if (!user || !selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = applyStatusTransition(sheet, 'completed', {
        uid: user.uid,
        name: profile?.name,
        role,
      });
      await updateServiceSheet(selected.id, updated);
      setSelected(updated);
      setTicketsOpen(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.serviceSheet.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated: ServiceSheet = {
        ...selected,
        status: 'rejected',
        rejectionReason: rejectReason.trim(),
      };
      await updateServiceSheet(selected.id, updated);
      setSelected(updated);
      setShowReject(false);
      setRejectReason('');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.serviceSheet.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  const advanceLabel =
    nextStatus === 'completed' ||
    getSheetStatus(selected ?? { status: 'draft' }) === 'pending_logistics'
      ? t.tickets.open
      : nextStatus
        ? `${t.serviceSheet.approve}: ${getStatusLabel(nextStatus, language)}`
        : '';

  const modalTitle = (() => {
    if (createPhase === 'picker') return t.serviceSheet.addSheet;
    if (createPhase === 'ocr') return t.createSheet.ocrTitle;
    if (createPhase === 'wizard') return t.createSheet.wizardTitle;
    return t.serviceSheetForm.title;
  })();

  return (
    <Layout
      title={t.nav.serviceSheets}
      subtitle={`${filtered.length} ${t.common.records}`}
    >
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-surface-600">
              {filtered.length} {t.common.records}
            </p>
            {showCreateButton ? (
              <Button onClick={openCreateModal} className="w-full shrink-0 sm:w-auto">
                <Plus className="h-4 w-4" />
                {t.serviceSheet.addSheet}
              </Button>
            ) : null}
          </div>
          {operadorKpis && (
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-2 text-sm">
                <span className="text-surface-500">{t.tickets.pending}: </span>
                <span className="font-semibold text-surface-900">
                  {operadorKpis.pending}
                </span>
              </div>
              <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-2 text-sm">
                <span className="text-surface-500">
                  {t.tickets.completedCount}:{' '}
                </span>
                <span className="font-semibold text-surface-900">
                  {operadorKpis.completed}
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  placeholder={t.common.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
            <Select
              label=""
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              options={[
                { value: '', label: t.common.allSites },
                ...sites.map((site) => ({
                  value: site.id,
                  label: `${siteDisplayName(site, language)} (${site.code})`,
                })),
              ]}
            />
            <Select
              label=""
              value={logisticsFilter}
              onChange={(e) => setLogisticsFilter(e.target.value)}
              options={[
                { value: '', label: t.common.allLogistics },
                ...LOGISTICS_ACCOUNTS.map((account) => ({
                  value: account.id,
                  label: logisticsDisplayName(account.id, language),
                })),
              ]}
            />
            <Select
              label=""
              value={historyFilter}
              onChange={(e) =>
                setHistoryFilter(
                  e.target.value as typeof historyFilter
                )
              }
              options={[
                { value: 'all', label: t.history.all },
                { value: 'toApprove', label: t.history.toApprove },
                { value: 'process1', label: t.history.process1 },
                { value: 'process2', label: t.history.process2 },
                { value: 'completed', label: t.history.completed },
                { value: 'rejected', label: t.history.rejected },
              ]}
            />
            <Select
              label=""
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: t.serviceSheet.status },
                ...SERVICE_SHEET_STATUSES.map((status) => ({
                  value: status,
                  label: getStatusLabel(status, language),
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 pb-0 pt-2">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="px-6 py-8 text-center text-sm text-rose-600">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="mb-4 text-sm text-surface-500">{t.serviceSheet.noData}</p>
              {showCreateButton && (
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4" />
                  {t.serviceSheet.addSheet}
                </Button>
              )}
              {saveError && !createPhase && (
                <p className="mt-3 text-sm text-rose-600">{saveError}</p>
              )}
            </div>
          ) : (
            <ServiceSheetTable sheets={filtered} onRowClick={setSelected} />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="xl"
        bare
        footer={
          createPhase === 'wizard' || createPhase === 'picker' || createPhase === 'ocr'
            ? undefined
            : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {activeSheet && (
                      <StatusBadge status={activeSheet.status} />
                    )}
                    {saveError && (
                      <p className="text-sm text-rose-600">{saveError}</p>
                    )}
                  </div>
                  {showReject && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder={t.serviceSheet.rejectionReason}
                        className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm sm:min-w-[16rem]"
                      />
                      <Button
                        variant="danger"
                        disabled={saving || !rejectReason.trim()}
                        onClick={() => void handleReject()}
                      >
                        {t.serviceSheet.confirmReject}
                      </Button>
                    </div>
                  )}
                  {selected?.rejectionReason &&
                    getSheetStatus(selected) === 'rejected' && (
                      <p className="text-sm text-rose-700">
                        {t.serviceSheet.rejectionReason}: {selected.rejectionReason}
                      </p>
                    )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" onClick={closeModal} disabled={saving}>
                    {t.common.cancel}
                  </Button>
                  {!isEditing && canEditSelected && (
                    <Button
                      variant="secondary"
                      onClick={openEditMode}
                      disabled={saving}
                    >
                      {t.serviceSheet.editSheet}
                    </Button>
                  )}
                  {!isEditing && canRejectSelected && !showReject && (
                    <Button
                      variant="danger"
                      onClick={() => setShowReject(true)}
                      disabled={saving}
                    >
                      {t.serviceSheet.reject}
                    </Button>
                  )}
                  {!isEditing && canAdvanceSelected && nextStatus && (
                    <Button onClick={() => void handleAdvance()} disabled={saving}>
                      {saving ? t.common.saving : advanceLabel}
                    </Button>
                  )}
                  {editable && (
                    <Button
                      onClick={() => void handleSaveEdit()}
                      disabled={saving || !draft}
                    >
                      {saving ? t.common.saving : t.common.save}
                    </Button>
                  )}
                </div>
              </div>
            )
        }
      >
        {createPhase === 'picker' && (
          <CreateModePicker
            onManual={startManual}
            onOcr={startOcr}
            onCancel={closeModal}
          />
        )}

        {createPhase === 'ocr' && (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-surface-600">{t.createSheet.ocrUploadHint}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => void handleOcrFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={ocrBusy}
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-surface-300 bg-surface-50 px-6 py-12 text-surface-600 transition hover:border-brand-400 hover:bg-brand-50/40"
            >
              <Camera className="h-8 w-8 text-brand-600" />
              <span className="text-sm font-medium">
                {ocrBusy ? t.createSheet.ocrProcessing : t.createSheet.ocrPickFile}
              </span>
            </button>
            {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal} disabled={ocrBusy}>
                {t.common.cancel}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCreatePhase('picker')}
                disabled={ocrBusy}
              >
                {t.createSheet.back}
              </Button>
            </div>
          </div>
        )}

        {createPhase === 'wizard' && draft && (
          <CreateServiceSheetWizard
            initialSheet={draft}
            mode={createMode}
            scanPreviewUrl={scanPreviewUrl}
            saving={saving}
            error={saveError}
            onCancel={closeModal}
            onSave={(sheet, asDraft) => void handleWizardSave(sheet, asDraft)}
          />
        )}

        {!isCreating && activeSheet && (
          <ServiceSheetFormView
            sheet={activeSheet}
            editable={editable}
            onChange={editable ? (sheet) => setDraft(sheet) : undefined}
          />
        )}
      </Modal>

      <Modal
        open={ticketsOpen && !!selected}
        onClose={() => setTicketsOpen(false)}
        title={t.tickets.title}
        size="lg"
        bare
      >
        {selected && (
          <div className="p-4 sm:p-6">
            <LogisticsTicketsForm
              sheet={selected}
              busy={saving}
              onChange={setSelected}
              onComplete={(sheet) => void handleTicketsComplete(sheet)}
            />
            {saveError && (
              <p className="mt-3 text-sm text-rose-600">{saveError}</p>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
