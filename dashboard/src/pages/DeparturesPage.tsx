import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  ServiceSheetTable,
  ServiceSheetFormView,
} from '@/components/serviceSheets/ServiceSheetTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal, LoadingSpinner } from '@/components/ui/Modal';
import { useServiceSheets } from '@/hooks/useFirestoreData';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel, getStatusLabel } from '@/i18n/translations';
import {
  createServiceSheet,
  updateServiceSheet,
} from '@/services/firestoreData';
import {
  canAdvanceSheetStatus,
  canCreateServiceSheet,
  canEditSheet,
  createEmptyServiceSheet,
  getNextSheetStatus,
  getSheetStatus,
  MATERIAL_TYPES,
  SERVICE_SHEET_STATUSES,
  validateSheetForStatus,
  type ServiceSheet,
} from '@/types';
import { Plus, Search } from 'lucide-react';

export function DeparturesPage() {
  const { t, language } = useTranslation();
  const { user, profile, role, canCreateSheets } = useAuth();
  const { sheets, loading, error } = useServiceSheets();
  const [search, setSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<ServiceSheet | null>(null);
  const [draft, setDraft] = useState<ServiceSheet | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

      const matchesMaterial =
        !materialFilter ||
        s.materials?.some((m) => m.materialType === materialFilter);

      const matchesStatus =
        !statusFilter || getSheetStatus(s) === statusFilter;

      return matchesSearch && matchesMaterial && matchesStatus;
    });
  }, [sheets, search, materialFilter, statusFilter]);

  const modalOpen = isCreating || !!selected;
  const activeSheet = isCreating || isEditing ? draft : selected;
  const editable = isCreating || isEditing;

  const canEditSelected =
    !!selected &&
    !!user &&
    canEditSheet(role, selected, user.uid);

  const nextStatus =
    selected && !isCreating
      ? getNextSheetStatus(getSheetStatus(selected))
      : null;

  const canAdvanceSelected =
    !!selected &&
    !!user &&
    !!nextStatus &&
    canAdvanceSheetStatus(role, selected, user.uid, nextStatus);

  const closeModal = () => {
    setSelected(null);
    setDraft(null);
    setIsCreating(false);
    setIsEditing(false);
    setSaveError(null);
  };

  const openCreateModal = () => {
    if (!user || !canCreateServiceSheet(role)) return;
    setSelected(null);
    setDraft(
      createEmptyServiceSheet(user.uid, profile?.name, user.email ?? profile?.email)
    );
    setIsCreating(true);
    setIsEditing(false);
    setSaveError(null);
  };

  const openEditMode = () => {
    if (!selected || !canEditSelected) return;
    setDraft({ ...selected });
    setIsEditing(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!draft || !user) return;

    setSaving(true);
    setSaveError(null);
    try {
      if (isCreating) {
        await createServiceSheet(user.uid, {
          ...draft,
          status: draft.status ?? 'draft',
        });
      } else if (isEditing && draft.id) {
        await updateServiceSheet(draft.userId, draft.id, draft);
        setSelected(draft);
        setIsEditing(false);
        setDraft(null);
        setSaving(false);
        return;
      }
      closeModal();
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

    const missing = validateSheetForStatus(selected, nextStatus);
    if (missing) {
      const hints = t.serviceSheet.validationHints as Record<string, string>;
      setSaveError(hints[missing] ?? t.serviceSheet.statusBlocked);
      return;
    }

    if (!canAdvanceSheetStatus(role, selected, user.uid, nextStatus)) {
      setSaveError(t.serviceSheet.statusBlocked);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const updated: ServiceSheet = { ...selected, status: nextStatus };
      await updateServiceSheet(selected.userId, selected.id, updated);
      setSelected(updated);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.serviceSheet.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  const advanceLabel =
    nextStatus === 'completed'
      ? t.serviceSheet.completeSheet
      : nextStatus
        ? `${t.serviceSheet.advanceStatus}: ${getStatusLabel(nextStatus, language)}`
        : '';

  return (
    <Layout
      title={t.nav.serviceSheets}
      subtitle={`${filtered.length} ${t.common.records}`}
    >
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
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
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              options={[
                { value: '', label: t.common.allMaterials },
                ...MATERIAL_TYPES.map((m) => ({
                  value: m.id,
                  label: getMaterialLabel(m.id, language),
                })),
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
            {canCreateSheets && (
              <Button onClick={openCreateModal} className="w-full lg:w-auto">
                <Plus className="h-4 w-4" />
                {t.serviceSheet.addSheet}
              </Button>
            )}
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
          ) : (
            <ServiceSheetTable sheets={filtered} onRowClick={setSelected} />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          isCreating ? t.serviceSheet.addSheet : t.serviceSheetForm.title
        }
        size="xl"
        bare
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {activeSheet && !isCreating && (
                <StatusBadge status={activeSheet.status} />
              )}
              {saveError && (
                <p className="text-sm text-rose-600">{saveError}</p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={closeModal} disabled={saving}>
                {t.common.cancel}
              </Button>
              {!isCreating && !isEditing && canEditSelected && (
                <Button variant="secondary" onClick={openEditMode} disabled={saving}>
                  {t.serviceSheet.editSheet}
                </Button>
              )}
              {!isCreating && !isEditing && canAdvanceSelected && nextStatus && (
                <Button onClick={handleAdvance} disabled={saving}>
                  {saving ? t.common.saving : advanceLabel}
                </Button>
              )}
              {editable && (
                <Button onClick={handleSave} disabled={saving || !draft}>
                  {saving ? t.common.saving : t.common.save}
                </Button>
              )}
            </div>
          </div>
        }
      >
        {activeSheet && (
          <ServiceSheetFormView
            sheet={activeSheet}
            editable={editable}
            onChange={
              editable
                ? (sheet) => setDraft(sheet)
                : undefined
            }
          />
        )}
      </Modal>
    </Layout>
  );
}
