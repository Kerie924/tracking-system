import { Check } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel, getUnitLabel, getUnitOfMeasureLabel } from '@/i18n/translations';
import { cn, datetimeLocalToIso, formatDateTime, isoToDatetimeLocal } from '@/lib/utils';
import appIcon from '@/assets/app-icon-1024.png';
import { MercadoLibreLogo } from '@/components/serviceSheets/MercadoLibreLogo';
import {
  formatNumber,
  getMaterialDetailsMap,
  matchesUnitOption,
  OTHER_ROW_UNIT_OF_MEASURE,
  SERVICE_SHEET_MATERIAL_ROWS,
  SERVICE_SHEET_UNIT_OPTIONS,
  toggleSheetMaterial,
  updateSheetMaterialKilograms,
  updateSheetMaterialQuantity,
  updateSheetMaterialUnit,
  updateSheetMaterialUnitOfMeasure,
  type MaterialType,
  type ServiceSheet,
} from '@/types';

const fieldInputClass =
  'w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs font-semibold text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30';

function FieldValue({ value }: { value?: string | number | null }) {
  const display =
    value === undefined || value === null || value === ''
      ? '—'
      : String(value);
  return <span className="block text-xs font-semibold text-surface-900">{display}</span>;
}

function FormField({
  value,
  editable,
  onChange,
  type = 'text',
  className,
}: {
  value?: string | number | null;
  editable?: boolean;
  onChange?: (value: string) => void;
  type?: string;
  className?: string;
}) {
  if (!editable) return <FieldValue value={value} />;
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(fieldInputClass, className)}
    />
  );
}

function FormCheckbox({
  checked,
  interactive,
  onToggle,
}: {
  checked: boolean;
  interactive?: boolean;
  onToggle?: () => void;
}) {
  const box = (
    <span
      className={cn(
        'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border bg-white shadow-sm transition-all',
        checked
          ? 'border-brand-600 bg-brand-600'
          : 'border-surface-300 bg-white',
        interactive && !checked && 'group-hover:border-brand-400 group-hover:bg-brand-50/40'
      )}
      aria-hidden
    >
      {checked && <Check className="h-3.5 w-3.5 stroke-[2.5] text-white" />}
    </span>
  );

  if (interactive && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-checked={checked}
        role="checkbox"
        className={cn(
          'group inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1'
        )}
      >
        {box}
      </button>
    );
  }

  return box;
}

function materialUnitMatches(
  entry: { unitOfMeasure?: string; unit?: string; units: string[] },
  option: string
): boolean {
  if (entry.unitOfMeasure) {
    return matchesUnitOption(entry.unitOfMeasure, option);
  }
  // Legacy sheets may still store measure values in unit/units
  if (entry.units.some((unit) => matchesUnitOption(unit, option))) return true;
  if (
    entry.unit &&
    !SERVICE_SHEET_UNIT_OPTIONS.some((unitOption) =>
      matchesUnitOption(entry.unit, unitOption)
    )
  ) {
    return matchesUnitOption(entry.unit, option);
  }
  return false;
}

function resolveSelectedUnitOption(storedUnit?: string): string {
  if (!storedUnit) return '';
  const match = SERVICE_SHEET_UNIT_OPTIONS.find((option) =>
    matchesUnitOption(storedUnit, option)
  );
  return match ?? '';
}

function MetaBox({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-surface-200 bg-surface-50/60',
        className
      )}
    >
      <div className="border-b border-surface-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-surface-500">
        {label}
      </div>
      <div className="flex flex-1 items-center px-2.5 py-2 text-sm">{children}</div>
    </div>
  );
}

function SectionCell({
  children,
  className = '',
  header,
}: {
  children?: React.ReactNode;
  className?: string;
  header?: boolean;
}) {
  return (
    <div
      className={cn(
        'border border-surface-200 px-2 py-1.5 text-[11px] leading-tight sm:text-xs',
        header
          ? 'bg-surface-100 font-semibold text-surface-600'
          : 'bg-white text-surface-900',
        className
      )}
    >
      {children}
    </div>
  );
}

function FormSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

function formatSheetDateTime(iso?: string) {
  if (!iso) return '';
  try {
    return formatDateTime(new Date(iso).getTime());
  } catch {
    return iso;
  }
}

function TimeBlock({
  title,
  rows,
  editable,
  onTimeChange,
}: {
  title: string;
  rows: { label: string; field: keyof ServiceSheet; value?: string }[];
  editable?: boolean;
  onTimeChange?: (field: keyof ServiceSheet, value: string) => void;
}) {
  return (
    <div className="border-b border-surface-200 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <SectionCell header className="border-x-0 border-t-0 text-center">
        {title}
      </SectionCell>
      <div className="divide-y divide-surface-100">
        {rows.map(({ label, field, value }) => (
          <div key={label} className="px-2 py-2">
            <p className="text-[10px] leading-snug text-surface-600 sm:text-[11px]">{label}</p>
            <div className="mt-1">
              {editable ? (
                <input
                  type="datetime-local"
                  value={isoToDatetimeLocal(value)}
                  onChange={(e) => onTimeChange?.(field, datetimeLocalToIso(e.target.value))}
                  className={cn(fieldInputClass, 'max-w-full')}
                />
              ) : (
                <FieldValue value={formatSheetDateTime(value) || undefined} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface ServiceSheetFormViewProps {
  sheet: ServiceSheet;
  editable?: boolean;
  onChange?: (sheet: ServiceSheet) => void;
}

export function ServiceSheetFormView({
  sheet,
  editable = false,
  onChange,
}: ServiceSheetFormViewProps) {
  const { t, language, locale } = useTranslation();
  const materialDetails = getMaterialDetailsMap(sheet);

  const updateField = (field: keyof ServiceSheet, value: string) => {
    onChange?.({ ...sheet, [field]: value || undefined });
  };

  const handleMaterialToggle = (materialType: MaterialType) => {
    if (!editable || !onChange) return;
    const enabled = !materialDetails[materialType].matched;
    onChange(toggleSheetMaterial(sheet, materialType, enabled));
  };

  const handleQuantityChange = (materialType: MaterialType, raw: string) => {
    if (!editable || !onChange) return;
    const quantity = Number(raw);
    onChange(
      updateSheetMaterialQuantity(
        sheet,
        materialType,
        Number.isFinite(quantity) ? quantity : 0
      )
    );
  };

  const handleUnitOfMeasureSelect = (materialType: MaterialType, unitOption: string) => {
    if (!editable || !onChange) return;
    onChange(updateSheetMaterialUnitOfMeasure(sheet, materialType, unitOption));
  };

  const handleUnitSelect = (materialType: MaterialType, unitOption: string) => {
    if (!editable || !onChange) return;
    onChange(updateSheetMaterialUnit(sheet, materialType, unitOption));
  };

  const handleKilogramsChange = (materialType: MaterialType, raw: string) => {
    if (!editable || !onChange) return;
    const kilograms = Number(raw);
    onChange(
      updateSheetMaterialKilograms(
        sheet,
        materialType,
        Number.isFinite(kilograms) ? kilograms : 0
      )
    );
  };

  const materialsGridClass =
    'grid grid-cols-[36px_minmax(7rem,1.1fr)_4.5rem_minmax(8rem,1.4fr)_minmax(7rem,0.9fr)_5.5rem]';

  return (
    <div className="mx-auto max-w-6xl space-y-4 font-sans text-surface-900">
      <FormSection>
        <div className="border-b border-surface-200 bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-3 text-center">
          <p className="text-sm font-bold tracking-[0.2em] text-white sm:text-base">
            {t.serviceSheetForm.title}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="border-b border-surface-200 p-4 lg:col-span-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <img
                src={appIcon}
                alt="Plastic Trade"
                className="h-14 w-14 shrink-0 object-contain"
              />
              <p className="text-base font-bold italic tracking-wide text-surface-800">
                PLASTIC TRADE
              </p>
            </div>
            <div className="mt-2 rounded-md border border-surface-200 bg-surface-100 px-3 py-1.5 text-center text-[11px] font-bold tracking-wide text-surface-700">
              {t.serviceSheetForm.companyName}
            </div>
            <div className="mt-3 space-y-1 text-[10px] leading-relaxed text-surface-600 sm:text-[11px]">
              <p>
                <span className="font-semibold text-surface-700">Dirección:</span>{' '}
                {t.serviceSheetForm.companyAddress}
              </p>
              <p>{t.serviceSheetForm.companyMunicipality}</p>
              <p>{t.serviceSheetForm.companyContact}</p>
            </div>
          </div>

          <div className="flex items-center justify-center border-b border-surface-200 bg-surface-50/50 px-4 py-6 lg:col-span-3 lg:border-b-0 lg:border-r">
            <MercadoLibreLogo className="h-20 w-auto" />
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-[1fr_auto] lg:gap-2">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-2">
              <MetaBox label={t.serviceSheetForm.code}>
                <FormField
                  value={sheet.codigo}
                  editable={editable}
                  onChange={(v) => updateField('codigo', v)}
                />
              </MetaBox>
              <MetaBox label={t.serviceSheet.folio}>
                <FormField
                  value={sheet.folio}
                  editable={editable}
                  onChange={(v) => updateField('folio', v)}
                />
              </MetaBox>
            </div>
            <MetaBox label={`${t.serviceSheet.date}:`} className="col-span-2 lg:col-span-1">
              <FormField
                value={sheet.fecha}
                editable={editable}
                type="date"
                onChange={(v) => updateField('fecha', v)}
              />
            </MetaBox>
          </div>
        </div>
      </FormSection>

      <FormSection>
        <div className="overflow-x-auto">
        <div className="min-w-[720px]">
        <div
          className={cn(
            materialsGridClass,
            'border-b border-surface-200 bg-surface-100/90 text-[10px] font-semibold uppercase tracking-wide text-surface-600 sm:text-[11px]'
          )}
        >
          <div className="border-r border-surface-200 px-1 py-2.5 text-center">✓</div>
          <div className="border-r border-surface-200 px-2 py-2.5">
            {t.serviceSheetForm.materialCol}
          </div>
          <div className="border-r border-surface-200 px-2 py-2.5 text-center">
            {t.serviceSheetForm.quantityCol}
          </div>
          <div className="border-r border-surface-200 px-2 py-2.5">
            {t.serviceSheetForm.unitOfMeasureCol}
          </div>
          <div className="border-r border-surface-200 px-2 py-2.5">
            {t.serviceSheetForm.unitCol}
          </div>
          <div className="px-2 py-2.5 text-center">{t.serviceSheetForm.kilogramsCol}</div>
        </div>

        {SERVICE_SHEET_MATERIAL_ROWS.map((row, index) => {
          const entry = materialDetails[row.id];
          const selectedUnit = resolveSelectedUnitOption(entry.unit);
          return (
            <div
              key={row.id}
              className={cn(
                materialsGridClass,
                index % 2 === 1 && 'bg-surface-50/40',
                'border-b border-surface-100 last:border-b-0'
              )}
            >
              <div className="flex items-center justify-center border-r border-surface-100 px-1 py-2">
                <FormCheckbox
                  checked={entry.matched}
                  interactive={editable}
                  onToggle={() => handleMaterialToggle(row.id)}
                />
              </div>
              <div className="flex items-start border-r border-surface-100 px-2 py-2 text-[11px] sm:text-xs">
                <span className="mr-1 shrink-0 font-semibold text-brand-700">{row.index}.-</span>
                <span>{getMaterialLabel(row.id, language)}</span>
              </div>
              <div className="flex items-center justify-center border-r border-surface-100 px-2 py-2 text-center">
                {editable ? (
                  <input
                    type="number"
                    min={0}
                    value={entry.quantity}
                    onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                    className={cn(fieldInputClass, 'w-14 text-center')}
                  />
                ) : (
                  <span className="text-sm font-semibold">
                    {formatNumber(entry.quantity, locale)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-r border-surface-100 px-2 py-2">
                {row.units.map((unit) => {
                  const unitChecked = materialUnitMatches(entry, unit);
                  const unitLabel = getUnitOfMeasureLabel(unit, language);
                  const content = (
                    <>
                      <FormCheckbox checked={unitChecked} />
                      <span className={cn(unitChecked && 'font-medium text-surface-900')}>
                        {unitLabel}
                      </span>
                    </>
                  );

                  if (editable && entry.matched) {
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => handleUnitOfMeasureSelect(row.id, unit)}
                        className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] transition-colors hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:text-[11px]"
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <span
                      key={unit}
                      className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px]"
                    >
                      {content}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center border-r border-surface-100 px-2 py-2">
                {editable ? (
                  <select
                    value={selectedUnit}
                    onChange={(e) => handleUnitSelect(row.id, e.target.value)}
                    className={cn(fieldInputClass, 'cursor-pointer py-1.5')}
                  >
                    <option value="">{t.serviceSheetForm.selectUnit}</option>
                    {SERVICE_SHEET_UNIT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {getUnitLabel(option, language)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[11px] text-surface-800/70 sm:text-xs">
                    {selectedUnit ? getUnitLabel(selectedUnit, language) : '—'}
                  </span>
                )}
              </div>
              <div className="flex items-center px-2 py-2">
                {editable ? (
                  <div className="relative w-full">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={entry.kilograms ?? ''}
                      onChange={(e) => handleKilogramsChange(row.id, e.target.value)}
                      className={cn(fieldInputClass, 'w-full bg-surface-50 pr-8 text-right')}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-surface-500">
                      {t.serviceSheetForm.kg}
                    </span>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <div
                      className={cn(
                        fieldInputClass,
                        'min-h-[1.75rem] bg-surface-50 pr-8 text-right'
                      )}
                    >
                      {entry.kilograms != null
                        ? formatNumber(entry.kilograms, locale)
                        : ''}
                    </div>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-surface-500">
                      {t.serviceSheetForm.kg}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div
          className={cn(
            materialsGridClass,
            'border-t border-surface-200 bg-surface-50/30'
          )}
        >
          <div className="border-r border-surface-100 px-1 py-2" />
          <div className="border-r border-surface-100 px-2 py-2 text-[11px] sm:text-xs">
            {t.serviceSheetForm.other}:
          </div>
          <div className="border-r border-surface-100 px-2 py-2" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-r border-surface-100 px-2 py-2">
            {OTHER_ROW_UNIT_OF_MEASURE.map((unit) => (
              <span
                key={unit}
                className="inline-flex items-center gap-1.5 text-[10px] text-surface-500 sm:text-[11px]"
              >
                <FormCheckbox checked={false} />
                <span>{getUnitOfMeasureLabel(unit, language)}</span>
              </span>
            ))}
          </div>
          <div className="border-r border-surface-100 px-2 py-2" />
          <div className="px-2 py-2" />
        </div>
        </div>
        </div>
      </FormSection>

      <FormSection>
        <div className="grid grid-cols-2 sm:grid-cols-5">
          {[
            { label: t.serviceSheetForm.operatorName, field: 'operatorName' as const, value: sheet.operatorName },
            { label: t.serviceSheetForm.operatorId, field: 'siteId' as const, value: sheet.siteId },
            { label: t.serviceSheet.vehicle, field: 'vehiclePlates' as const, value: sheet.vehiclePlates },
            { label: t.serviceSheet.trailer, field: 'trailerPlates' as const, value: sheet.trailerPlates },
            { label: t.serviceSheet.seal, field: 'sealNumber' as const, value: sheet.sealNumber },
          ].map(({ label, field, value }) => (
            <div key={label} className="border-r border-surface-200 last:border-r-0">
              <SectionCell header className="border-x-0 border-t-0 text-center text-[10px] sm:text-[11px]">
                {label}
              </SectionCell>
              <SectionCell className="min-h-[2.5rem] border-x-0 border-t-0 text-center">
                <FormField
                  value={value}
                  editable={editable}
                  onChange={(v) => updateField(field, v)}
                />
              </SectionCell>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <TimeBlock
            title={t.serviceSheetForm.serviceClient}
            editable={editable}
            onTimeChange={updateField}
            rows={[
              { label: t.serviceSheetForm.siteEntryLabel, field: 'siteEntryTime', value: sheet.siteEntryTime },
              { label: t.serviceSheetForm.siteExitLabel, field: 'siteExitTime', value: sheet.siteExitTime },
            ]}
          />
          <TimeBlock
            title={t.serviceSheetForm.warehouseSection}
            editable={editable}
            onTimeChange={updateField}
            rows={[
              { label: t.serviceSheetForm.warehouseEntryLabel, field: 'warehouseEntryTime', value: sheet.warehouseEntryTime },
              { label: t.serviceSheetForm.warehouseExitLabel, field: 'warehouseExitTime', value: sheet.warehouseExitTime },
            ]}
          />
        </div>
      </FormSection>

      <FormSection>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: t.serviceSheet.preparedBy, field: 'elaboro' as const, value: sheet.elaboro },
            { label: t.serviceSheet.supervisor, field: 'responsableSup' as const, value: sheet.responsableSup },
            { label: t.serviceSheet.authorizedBy, field: 'autoriza' as const, value: sheet.autoriza },
            { label: t.serviceSheet.receivedBy, field: 'recibio' as const, value: sheet.recibio ?? sheet.recibe },
            { label: t.serviceSheet.deliveredBy, field: 'entrega' as const, value: sheet.entrega },
            { label: t.serviceSheetForm.acceptedBy, field: 'recibe' as const, value: sheet.recibe },
          ].map(({ label, field, value }) => (
            <div key={label} className="border-r border-surface-200 last:border-r-0">
              <SectionCell header className="border-x-0 border-t-0 text-center text-[10px] sm:text-[11px]">
                {label}
              </SectionCell>
              <SectionCell className="min-h-[3rem] border-x-0 border-t-0 text-center">
                <FormField
                  value={value}
                  editable={editable}
                  onChange={(v) => updateField(field, v)}
                />
              </SectionCell>
            </div>
          ))}
        </div>
      </FormSection>
    </div>
  );
}
