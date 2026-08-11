import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel, getUnitLabel, getUnitOfMeasureLabel } from '@/i18n/translations';
import { cn } from '@/lib/utils';
import { subscribeToSites } from '@/services/firestoreData';
import {
  MATERIAL_TYPES,
  SERVICE_SHEET_MATERIAL_ROWS,
  SERVICE_SHEET_UNIT_OPTIONS,
  createEmptyServiceSheet,
  getMaterialDetailsMap,
  matchCatalogSite,
  resolvePackagingOption,
  resolveUnitOfMeasureOption,
  resolveStatusFromFirmas,
  siteDisplayName,
  toggleSheetMaterial,
  updateSheetMaterialKilograms,
  updateSheetMaterialQuantity,
  updateSheetMaterialUnitOfMeasure,
  updateSheetPackagingType,
  type CatalogSite,
  type MaterialType,
  type ServiceSheet,
} from '@/types';
import { Camera, Check, ChevronLeft, ChevronRight, FileEdit, Scale, Trash2 } from 'lucide-react';

type WizardStep = 'basic' | 'materials' | 'transport' | 'weigh' | 'review';

interface CreateServiceSheetWizardProps {
  initialSheet: ServiceSheet;
  mode: 'manual' | 'ocr';
  scanPreviewUrl?: string | null;
  saving?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: (sheet: ServiceSheet, asDraft: boolean) => void;
}

export function CreateModePicker({
  onManual,
  onOcr,
  onCancel,
}: {
  onManual: () => void;
  onOcr: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <p className="text-sm text-surface-600">{t.createSheet.chooseMode}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onManual}
          className="flex flex-col items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:bg-brand-50/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <FileEdit className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold text-surface-900">
            {t.createSheet.manualTitle}
          </span>
          <span className="text-sm text-surface-600">{t.createSheet.manualDesc}</span>
        </button>
        <button
          type="button"
          onClick={onOcr}
          className="flex flex-col items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:bg-brand-50/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Camera className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold text-surface-900">
            {t.createSheet.ocrTitle}
          </span>
          <span className="text-sm text-surface-600">{t.createSheet.ocrDesc}</span>
        </button>
      </div>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}

function Stepper({
  steps,
  current,
}: {
  steps: { id: WizardStep; label: string }[];
  current: WizardStep;
}) {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = step.id === current;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                active && 'bg-brand-600 text-white',
                done && 'bg-brand-100 text-brand-700',
                !active && !done && 'bg-surface-100 text-surface-500'
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-xs font-medium sm:text-sm',
                active ? 'text-brand-700' : 'text-surface-500'
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-1 hidden h-px w-6 bg-surface-200 sm:inline-block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

const fieldClass =
  'w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

export function CreateServiceSheetWizard({
  initialSheet,
  mode,
  scanPreviewUrl,
  saving,
  error,
  onCancel,
  onSave,
}: CreateServiceSheetWizardProps) {
  const { t, language } = useTranslation();
  const [sheet, setSheet] = useState<ServiceSheet>(initialSheet);
  const [sites, setSites] = useState<CatalogSite[]>([]);
  const details = getMaterialDetailsMap(sheet);

  useEffect(() => subscribeToSites(setSites), []);

  // Keep wizard in sync when OCR prefills a new sheet
  useEffect(() => {
    setSheet(initialSheet);
  }, [initialSheet]);

  // Bind OCR site code (e.g. MXCD-13) to catalog site id once sites load
  useEffect(() => {
    if (sites.length === 0) return;
    setSheet((current) => {
      const alreadyBound =
        current.siteId && sites.some((s) => s.id === current.siteId);
      if (alreadyBound) return current;
      const match = matchCatalogSite(
        sites,
        current.codigo || current.siteName || current.siteId
      );
      if (!match) return current;
      return {
        ...current,
        siteId: match.id,
        siteName: siteDisplayName(match, language),
        codigo: match.formCodigo || match.code || current.codigo,
      };
    });
  }, [sites, language, initialSheet]);

  const steps = useMemo(() => {
    const base: { id: WizardStep; label: string }[] = [
      { id: 'basic', label: t.createSheet.stepBasic },
      { id: 'materials', label: t.createSheet.stepMaterials },
      { id: 'transport', label: t.createSheet.stepTransport },
      { id: 'weigh', label: t.createSheet.stepWeigh },
      { id: 'review', label: t.createSheet.stepReview },
    ];
    return base;
  }, [t]);

  const [step, setStep] = useState<WizardStep>('basic');

  const stepIndex = steps.findIndex((s) => s.id === step);

  const goNext = () => {
    const next = steps[stepIndex + 1];
    if (next) setStep(next.id);
  };
  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const updateField = (field: keyof ServiceSheet, value: string) => {
    setSheet((s) => ({ ...s, [field]: value || undefined }));
  };

  const totalKg = sheet.materials.reduce((sum, m) => sum + (m.kilograms ?? 0), 0);

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="border-b border-surface-100 px-4 pt-4 sm:px-6">
        <Stepper steps={steps} current={step} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {step === 'basic' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {scanPreviewUrl && (
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                  {t.createSheet.scanPreview}
                </p>
                <img
                  src={scanPreviewUrl}
                  alt="OCR scan"
                  className="max-h-48 rounded-lg border border-surface-200 object-contain"
                />
              </div>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">{t.createSheet.site}</span>
              <select
                className={fieldClass}
                value={sheet.siteId ?? ''}
                onChange={(e) => {
                  const site = sites.find((s) => s.id === e.target.value);
                  setSheet((s) => ({
                    ...s,
                    siteId: site?.id,
                    siteName: site ? siteDisplayName(site, language) : undefined,
                    codigo: site?.formCodigo || site?.code || s.codigo,
                  }));
                }}
              >
                <option value="">{t.createSheet.selectSite}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {siteDisplayName(site, language)} ({site.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">{t.serviceSheet.folio}</span>
              <input
                className={fieldClass}
                value={sheet.folio}
                onChange={(e) => updateField('folio', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">{t.serviceSheet.date}</span>
              <input
                type="date"
                className={fieldClass}
                value={sheet.fecha}
                onChange={(e) => updateField('fecha', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">{t.serviceSheetForm.code}</span>
              <input
                className={fieldClass}
                value={sheet.codigo}
                onChange={(e) => updateField('codigo', e.target.value)}
              />
            </label>
          </div>
        )}

        {step === 'materials' && (
          <div className="space-y-3">
            {SERVICE_SHEET_MATERIAL_ROWS.map((row) => {
              const entry = details[row.id];
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-200 px-3 py-3"
                >
                  <label className="flex min-w-[9rem] flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={entry.matched}
                      onChange={(e) =>
                        setSheet((s) => toggleSheetMaterial(s, row.id, e.target.checked))
                      }
                    />
                    <span>{getMaterialLabel(row.id, language)}</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={!entry.matched}
                    value={entry.matched ? entry.quantity : ''}
                    onChange={(e) =>
                      setSheet((s) =>
                        updateSheetMaterialQuantity(s, row.id, Number(e.target.value) || 0)
                      )
                    }
                    className={cn(fieldClass, 'w-24')}
                    placeholder={t.serviceSheetForm.quantityCol}
                  />
                  <select
                    disabled={!entry.matched}
                    value={resolveUnitOfMeasureOption(
                      entry.unitOfMeasure,
                      row.units
                    )}
                    onChange={(e) =>
                      setSheet((s) =>
                        updateSheetMaterialUnitOfMeasure(s, row.id, e.target.value)
                      )
                    }
                    className={cn(fieldClass, 'min-w-[8rem] flex-1')}
                  >
                    <option value="">{t.serviceSheetForm.unitOfMeasureCol}</option>
                    {row.units.map((u) => (
                      <option key={u} value={u}>
                        {getUnitOfMeasureLabel(u, language)}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-28">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      disabled={!entry.matched}
                      value={entry.matched ? entry.kilograms ?? '' : ''}
                      onChange={(e) =>
                        setSheet((s) =>
                          updateSheetMaterialKilograms(
                            s,
                            row.id,
                            Number(e.target.value) || 0
                          )
                        )
                      }
                      className={cn(fieldClass, 'pr-9 text-right')}
                      placeholder={t.serviceSheetForm.kilogramsCol}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-surface-500">
                      kg
                    </span>
                  </div>
                  {entry.matched && (
                    <button
                      type="button"
                      className="text-rose-500 hover:text-rose-700"
                      onClick={() =>
                        setSheet((s) => toggleSheetMaterial(s, row.id, false))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
            <div className="mt-4 rounded-xl border border-surface-200 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-700">
                <Scale className="h-4 w-4" />
                {t.serviceSheetForm.unitCol}
              </p>
              <p className="mb-2 text-xs text-surface-500">{t.createSheet.unitHint}</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {SERVICE_SHEET_UNIT_OPTIONS.map((opt) => {
                  const selected = resolvePackagingOption(sheet.packagingType) === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setSheet((s) => updateSheetPackagingType(s, opt))
                      }
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition',
                        selected
                          ? 'border-brand-600 bg-brand-50 text-brand-800'
                          : 'border-surface-200 bg-white text-surface-700 hover:border-brand-300'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-5 w-5 items-center justify-center rounded-full border-2',
                          selected
                            ? 'border-brand-700 bg-brand-600'
                            : 'border-surface-400 bg-white'
                        )}
                      >
                        {selected && (
                          <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                        )}
                      </span>
                      {getUnitLabel(opt, language)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'transport' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">
                {t.serviceSheetForm.operatorName}
              </span>
              <input
                className={fieldClass}
                value={sheet.operatorName ?? ''}
                onChange={(e) => updateField('operatorName', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">
                {t.serviceSheetForm.operatorId}
              </span>
              <input
                className={fieldClass}
                value={sheet.operatorId ?? ''}
                onChange={(e) => updateField('operatorId', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">{t.serviceSheet.vehicle}</span>
              <input
                className={fieldClass}
                value={sheet.vehiclePlates ?? ''}
                onChange={(e) => updateField('vehiclePlates', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">{t.serviceSheet.trailer}</span>
              <input
                className={fieldClass}
                value={sheet.trailerPlates ?? ''}
                onChange={(e) => updateField('trailerPlates', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">{t.serviceSheet.seal}</span>
              <input
                className={fieldClass}
                value={sheet.sealNumber ?? ''}
                onChange={(e) => updateField('sealNumber', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">
                {t.serviceSheetForm.siteEntryLabel}
              </span>
              <input
                type="datetime-local"
                className={fieldClass}
                value={isoToLocal(sheet.siteEntryTime)}
                onChange={(e) =>
                  updateField('siteEntryTime', localToIso(e.target.value))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-surface-600">
                {t.serviceSheetForm.siteExitLabel}
              </span>
              <input
                type="datetime-local"
                className={fieldClass}
                value={isoToLocal(sheet.siteExitTime)}
                onChange={(e) =>
                  updateField('siteExitTime', localToIso(e.target.value))
                }
              />
            </label>
          </div>
        )}

        {step === 'weigh' && (
          <div className="space-y-4">
            <p className="text-sm text-surface-600">{t.createSheet.weighHint}</p>
            {(MATERIAL_TYPES.filter((m) => details[m.id].matched).length > 0
              ? MATERIAL_TYPES.filter((m) => details[m.id].matched)
              : MATERIAL_TYPES
            ).map((m) => (
              <label
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 px-3 py-3 text-sm"
              >
                <span>{getMaterialLabel(m.id, language)}</span>
                <div className="relative w-36">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className={cn(fieldClass, 'pr-10 text-right')}
                    value={details[m.id].kilograms ?? ''}
                    onChange={(e) =>
                      setSheet((s) => {
                        let next = s;
                        if (!details[m.id].matched) {
                          next = toggleSheetMaterial(next, m.id as MaterialType, true);
                        }
                        return updateSheetMaterialKilograms(
                          next,
                          m.id as MaterialType,
                          Number(e.target.value) || 0
                        );
                      })
                    }
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-surface-500">
                    kg
                  </span>
                </div>
              </label>
            ))}
            <p className="text-sm font-semibold text-surface-800">
              {t.createSheet.totalWeight}:{' '}
              {totalKg.toLocaleString(language === 'en' ? 'en-US' : 'es-MX')} kg
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-surface-600">
                  {t.serviceSheetForm.warehouseEntryLabel}
                </span>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={isoToLocal(sheet.warehouseEntryTime)}
                  onChange={(e) =>
                    updateField('warehouseEntryTime', localToIso(e.target.value))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-surface-600">
                  {t.serviceSheetForm.warehouseExitLabel}
                </span>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={isoToLocal(sheet.warehouseExitTime)}
                  onChange={(e) =>
                    updateField('warehouseExitTime', localToIso(e.target.value))
                  }
                />
              </label>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 text-sm">
            <ReviewBlock
              title={t.createSheet.stepBasic}
              onEdit={() => setStep('basic')}
              editLabel={t.createSheet.edit}
            >
              <p>
                {t.serviceSheet.folio}: <strong>{sheet.folio || '—'}</strong>
              </p>
              <p>
                {t.createSheet.site}:{' '}
                <strong>{sheet.siteName || sheet.codigo || '—'}</strong>
              </p>
              <p>
                {t.serviceSheet.date}: <strong>{sheet.fecha || '—'}</strong>
              </p>
            </ReviewBlock>
            <ReviewBlock
              title={t.createSheet.stepMaterials}
              onEdit={() => setStep('materials')}
              editLabel={t.createSheet.edit}
            >
              {sheet.materials.length === 0 && <p>—</p>}
              {sheet.materials.map((m) => (
                <p key={String(m.materialType)}>
                  {getMaterialLabel(String(m.materialType), language)} — {m.quantity}{' '}
                  {m.unitOfMeasure || m.unit || ''}
                  {m.kilograms != null ? ` / ${m.kilograms} kg` : ''}
                </p>
              ))}
              <p>
                {t.serviceSheetForm.unitCol}:{' '}
                <strong>
                  {sheet.packagingType
                    ? getUnitLabel(
                        resolvePackagingOption(sheet.packagingType) ||
                          sheet.packagingType,
                        language
                      )
                    : '—'}
                </strong>
              </p>
            </ReviewBlock>
            <ReviewBlock
              title={t.createSheet.stepTransport}
              onEdit={() => setStep('transport')}
              editLabel={t.createSheet.edit}
            >
              <p>
                {t.serviceSheetForm.operatorName}:{' '}
                <strong>{sheet.operatorName || '—'}</strong>
              </p>
              <p>
                {t.serviceSheet.vehicle}: <strong>{sheet.vehiclePlates || '—'}</strong>
              </p>
              <p>
                {t.serviceSheet.seal}: <strong>{sheet.sealNumber || '—'}</strong>
              </p>
            </ReviewBlock>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-surface-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>{error && <p className="text-sm text-rose-600">{error}</p>}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            {t.common.cancel}
          </Button>
          {stepIndex > 0 && (
            <Button variant="secondary" onClick={goBack} disabled={saving}>
              <ChevronLeft className="h-4 w-4" />
              {t.createSheet.back}
            </Button>
          )}
          {step !== 'review' ? (
            <Button onClick={goNext} disabled={saving}>
              {t.createSheet.next}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => onSave({ ...sheet, status: 'draft', source: mode }, true)}
              >
                {t.createSheet.saveDraft}
              </Button>
              <Button
                disabled={saving}
                onClick={() => {
                  const status =
                    mode === 'ocr'
                      ? resolveStatusFromFirmas(sheet.firmas)
                      : 'pending_supervisor';
                  onSave(
                    {
                      ...sheet,
                      status,
                      source: mode,
                      elaboroSignedAt:
                        sheet.elaboroSignedAt ?? new Date().toISOString(),
                    },
                    false
                  );
                }}
              >
                {saving ? t.common.saving : t.createSheet.submit}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewBlock({
  title,
  children,
  onEdit,
  editLabel,
}: {
  title: string;
  children: ReactNode;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <div className="rounded-xl border border-surface-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-surface-900">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-brand-600 hover:text-brand-800"
        >
          {editLabel}
        </button>
      </div>
      <div className="space-y-1 text-surface-700">{children}</div>
    </div>
  );
}

function isoToLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function createBlankWizardSheet(
  userId: string,
  userName?: string,
  userEmail?: string
): ServiceSheet {
  return createEmptyServiceSheet(userId, userName, userEmail);
}
