import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  ServiceSheetTable,
  ServiceSheetFormView,
} from '@/components/serviceSheets/ServiceSheetTable';
import { Modal, LoadingSpinner } from '@/components/ui/Modal';
import { useServiceSheets } from '@/hooks/useFirestoreData';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel } from '@/i18n/translations';
import { createServiceSheet } from '@/services/firestoreData';
import { createEmptyServiceSheet, MATERIAL_TYPES } from '@/types';
import type { ServiceSheet } from '@/types';
import { Plus, Search } from 'lucide-react';

export function DeparturesPage() {
  const { t, language } = useTranslation();
  const { user, profile, isAdmin } = useAuth();
  const { sheets, loading, error } = useServiceSheets();
  const [search, setSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [selected, setSelected] = useState<ServiceSheet | null>(null);
  const [draft, setDraft] = useState<ServiceSheet | null>(null);
  const [isCreating, setIsCreating] = useState(false);
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

      return matchesSearch && matchesMaterial;
    });
  }, [sheets, search, materialFilter]);

  const modalOpen = isCreating || !!selected;
  const editable = isCreating;
  const activeSheet = isCreating ? draft : selected;

  const closeModal = () => {
    setSelected(null);
    setDraft(null);
    setIsCreating(false);
    setSaveError(null);
  };

  const openCreateModal = () => {
    if (!user) return;
    setSelected(null);
    setDraft(
      createEmptyServiceSheet(user.uid, profile?.name, user.email ?? profile?.email)
    );
    setIsCreating(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!draft || !user) return;

    setSaving(true);
    setSaveError(null);
    try {
      await createServiceSheet(user.uid, draft);
      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.serviceSheet.saveError
      );
    } finally {
      setSaving(false);
    }
  };

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
            {isAdmin && (
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
          editable ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {saveError && (
                <p className="mr-auto text-sm text-rose-600">{saveError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={closeModal} disabled={saving}>
                  {t.common.cancel}
                </Button>
                <Button onClick={handleSave} disabled={saving || !draft}>
                  {saving ? t.common.saving : t.common.save}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {activeSheet && (
          <ServiceSheetFormView
            sheet={activeSheet}
            editable={editable}
            onChange={editable ? setDraft : undefined}
          />
        )}
      </Modal>
    </Layout>
  );
}
