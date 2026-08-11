import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel } from '@/i18n/translations';
import {
  updateSheetMaterialKilograms,
  type MaterialType,
  type ServiceSheet,
} from '@/types';

const fieldClass =
  'w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

interface Process2FormProps {
  sheet: ServiceSheet;
  saving?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (sheet: ServiceSheet) => void;
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

export function Process2Form({
  sheet: initial,
  saving,
  error,
  onCancel,
  onSubmit,
}: Process2FormProps) {
  const { t, language } = useTranslation();
  const [sheet, setSheet] = useState<ServiceSheet>(initial);

  const materials = useMemo(
    () => sheet.materials.filter((m) => (m.quantity ?? 0) > 0 || m.materialType),
    [sheet.materials]
  );

  const totalKg = materials.reduce((sum, m) => sum + (m.kilograms ?? 0), 0);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <p className="text-sm text-surface-600">{t.process2.hint}</p>

      <div className="space-y-3">
        {materials.map((m) => {
          const type = String(m.materialType);
          return (
            <label
              key={type}
              className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 px-3 py-3 text-sm"
            >
              <span>{getMaterialLabel(type, language)}</span>
              <div className="relative w-36">
                <input
                  type="number"
                  min={0}
                  className={`${fieldClass} pr-10 text-right`}
                  value={m.kilograms ?? ''}
                  onChange={(e) =>
                    setSheet((s) =>
                      updateSheetMaterialKilograms(
                        s,
                        type as MaterialType,
                        Number(e.target.value) || 0
                      )
                    )
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-surface-500">
                  kg
                </span>
              </div>
            </label>
          );
        })}
      </div>

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
              setSheet((s) => ({
                ...s,
                warehouseEntryTime: localToIso(e.target.value) || undefined,
              }))
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
              setSheet((s) => ({
                ...s,
                warehouseExitTime: localToIso(e.target.value) || undefined,
              }))
            }
          />
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          {t.common.cancel}
        </Button>
        <Button
          disabled={saving}
          onClick={() => onSubmit(sheet)}
        >
          {saving ? t.common.saving : t.process2.submit}
        </Button>
      </div>
    </div>
  );
}
