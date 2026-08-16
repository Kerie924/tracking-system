import { Check } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel, getUnitLabel, getUnitOfMeasureLabel } from '@/i18n/translations';
import { cn, datetimeLocalToIso, formatDateTime, isoToDatetimeLocal } from '@/lib/utils';
import appIcon from '@/assets/app-icon-1024.png';
import { MercadoLibreLogo } from '@/components/serviceSheets/MercadoLibreLogo';
import {
  formatNumber,
  getMaterialDetailsMap,
  LOGISTICS_ACCOUNTS,
  logisticsDisplayName,
  matchesUnitOption,
  OTHER_ROW_UNIT_OF_MEASURE,
  SERVICE_SHEET_MATERIAL_ROWS,
  SERVICE_SHEET_UNIT_OPTIONS,
  toggleSheetMaterial,
  updateSheetMaterialQuantity,
  updateSheetMaterialUnitOfMeasure,
  updateSheetPackagingType,
  type MaterialType,
  type ServiceSheet,
} from '@/types';

const fieldInputClass =
  'w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs font-semibold text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30';

function FieldValue({
  value,
  className,
}: {
  value?: string | number | null;
  className?: string;
}) {
  const display =
    value === undefined || value === null || value === ''
      ? '—'
      : String(value);
  return (
    <span
      className={cn(
        'block text-xs font-semibold text-surface-900',
        className
      )}
    >
      {display}
    </span>
  );
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
  if (!editable) return <FieldValue value={value} className={className} />;
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
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
        checked
          ? 'border-brand-700 bg-brand-600 shadow-sm shadow-brand-600/30'
          : 'border-surface-800 bg-white',
        interactive && !checked && 'group-hover:border-brand-500 group-hover:bg-brand-50'
      )}
      aria-hidden
    >
      {checked && (
        <Check
          className="h-3.5 w-3.5 text-white"
          strokeWidth={3.5}
          absoluteStrokeWidth
        />
      )}
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
          'group inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1'
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

function DateTimeFormField({
  value,
  editable,
  onChange,
}: {
  value?: string;
  editable?: boolean;
  onChange?: (iso: string) => void;
}) {
  if (!editable) {
    return <FieldValue value={formatSheetDateTime(value) || '—'} />;
  }
  return (
    <input
      type="datetime-local"
      value={isoToDatetimeLocal(value)}
      onChange={(e) => onChange?.(datetimeLocalToIso(e.target.value) || '')}
      className={cn(fieldInputClass, 'text-center')}
    />
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

  const handleUnitSelect = (unitOption: string) => {
    if (!editable || !onChange) return;
    onChange(updateSheetPackagingType(sheet, unitOption));
  };

  const selectedPackaging = resolveSelectedUnitOption(sheet.packagingType);
  const unitRowSpan = SERVICE_SHEET_MATERIAL_ROWS.length + 1; // materials + "other"

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
            <MetaBox
              label={`${t.createSheet.logistics}:`}
              className="col-span-2 lg:col-span-1"
            >
              {editable ? (
                <select
                  className="w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs font-semibold"
                  value={sheet.logisticsAccountId ?? ''}
                  onChange={(e) =>
                    updateField('logisticsAccountId', e.target.value)
                  }
                >
                  <option value="">{t.createSheet.selectLogistics}</option>
                  {LOGISTICS_ACCOUNTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {logisticsDisplayName(a.id, language)}
                    </option>
                  ))}
                </select>
              ) : (
                <FieldValue
                  value={logisticsDisplayName(sheet.logisticsAccountId, language)}
                />
              )}
            </MetaBox>
          </div>
        </div>
      </FormSection>

      <FormSection>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-100/90 text-[10px] font-semibold uppercase tracking-wide text-surface-600 sm:text-[11px]">
                <th className="w-9 border-r border-surface-200 px-1 py-2.5 text-center">
                  ✓
                </th>
                <th className="border-r border-surface-200 px-2 py-2.5 font-semibold">
                  {t.serviceSheetForm.materialCol}
                </th>
                <th className="w-[4.5rem] border-r border-surface-200 px-2 py-2.5 text-center font-semibold">
                  {t.serviceSheetForm.quantityCol}
                </th>
                <th className="min-w-[8rem] border-r border-surface-200 px-2 py-2.5 font-semibold">
                  {t.serviceSheetForm.unitOfMeasureCol}
                </th>
                <th className="w-[9.5rem] px-2 py-2.5 font-semibold">
                  {t.serviceSheetForm.unitCol}
                </th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_SHEET_MATERIAL_ROWS.map((row, index) => {
                const entry = materialDetails[row.id];
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-surface-100',
                      index % 2 === 1 && 'bg-surface-50/40'
                    )}
                  >
                    <td className="border-r border-surface-100 px-1 py-2 text-center align-middle">
                      <FormCheckbox
                        checked={entry.matched}
                        interactive={editable}
                        onToggle={() => handleMaterialToggle(row.id)}
                      />
                    </td>
                    <td className="border-r border-surface-100 px-2 py-2 align-middle text-[11px] sm:text-xs">
                      <span className="mr-1 font-semibold text-brand-700">
                        {row.index}.-
                      </span>
                      {getMaterialLabel(row.id, language)}
                    </td>
                    <td className="border-r border-surface-100 px-2 py-2 text-center align-middle">
                      {editable ? (
                        <input
                          type="number"
                          min={0}
                          value={entry.quantity}
                          onChange={(e) =>
                            handleQuantityChange(row.id, e.target.value)
                          }
                          className={cn(fieldInputClass, 'w-14 text-center')}
                        />
                      ) : (
                        <span className="text-sm font-semibold">
                          {formatNumber(entry.quantity, locale)}
                        </span>
                      )}
                    </td>
                    <td className="border-r border-surface-100 px-2 py-2 align-middle">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {row.units.map((unit) => {
                          const unitChecked = materialUnitMatches(entry, unit);
                          const unitLabel = getUnitOfMeasureLabel(unit, language);
                          const content = (
                            <>
                              <FormCheckbox checked={unitChecked} />
                              <span
                                className={cn(
                                  unitChecked && 'font-semibold text-surface-900'
                                )}
                              >
                                {unitLabel}
                              </span>
                            </>
                          );

                          if (editable && entry.matched) {
                            return (
                              <button
                                key={unit}
                                type="button"
                                onClick={() =>
                                  handleUnitOfMeasureSelect(row.id, unit)
                                }
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
                    </td>
                    {index === 0 && (
                      <td
                        rowSpan={unitRowSpan}
                        className="bg-white px-2 py-2 align-top"
                      >
                        <div className="flex flex-col gap-1.5">
                          {SERVICE_SHEET_UNIT_OPTIONS.map((option) => {
                            const unitChecked =
                              selectedPackaging === option ||
                              matchesUnitOption(sheet.packagingType, option);
                            const label = getUnitLabel(option, language);
                            const content = (
                              <>
                                <FormCheckbox checked={unitChecked} />
                                <span
                                  className={cn(
                                    'text-[10px] leading-tight sm:text-[11px]',
                                    unitChecked && 'font-semibold text-surface-900'
                                  )}
                                >
                                  {label}
                                </span>
                              </>
                            );

                            if (editable) {
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleUnitSelect(option)}
                                  className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                                >
                                  {content}
                                </button>
                              );
                            }

                            return (
                              <span
                                key={option}
                                className="inline-flex items-center gap-2 px-1 py-0.5"
                              >
                                {content}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              <tr className="border-t border-surface-200 bg-surface-50/30">
                <td className="border-r border-surface-100 px-1 py-2" />
                <td className="border-r border-surface-100 px-2 py-2 text-[11px] sm:text-xs">
                  {t.serviceSheetForm.other}:
                </td>
                <td className="border-r border-surface-100 px-2 py-2" />
                <td className="border-r border-surface-100 px-2 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </FormSection>

      {/* Matches paper Orden de Salida: entry/exit + operator, then plates + seal */}
      <FormSection>
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {[
            {
              label: t.serviceSheetForm.entryTime,
              node: (
                <DateTimeFormField
                  value={sheet.siteEntryTime}
                  editable={editable}
                  onChange={(v) => updateField('siteEntryTime', v)}
                />
              ),
            },
            {
              label: t.serviceSheetForm.exitTime,
              node: (
                <DateTimeFormField
                  value={sheet.siteExitTime}
                  editable={editable}
                  onChange={(v) => updateField('siteExitTime', v)}
                />
              ),
            },
            {
              label: t.serviceSheetForm.operatorId,
              node: (
                <FormField
                  value={sheet.operatorId}
                  editable={editable}
                  onChange={(v) => updateField('operatorId', v)}
                />
              ),
            },
            {
              label: t.serviceSheetForm.operatorName,
              node: (
                <FormField
                  value={sheet.operatorName}
                  editable={editable}
                  onChange={(v) => updateField('operatorName', v)}
                />
              ),
            },
          ].map(({ label, node }) => (
            <div key={label} className="border-r border-b border-surface-200 last:border-r-0 sm:last:border-r-0">
              <SectionCell
                header
                className="border-x-0 border-t-0 text-center text-[10px] sm:text-[11px]"
              >
                {label}
              </SectionCell>
              <SectionCell className="min-h-[2.5rem] border-x-0 border-t-0 text-center">
                {node}
              </SectionCell>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {[
            {
              label: t.serviceSheetForm.vehiclePlates,
              field: 'vehiclePlates' as const,
              value: sheet.vehiclePlates,
            },
            {
              label: t.serviceSheetForm.trailerPlates,
              field: 'trailerPlates' as const,
              value: sheet.trailerPlates,
            },
            {
              label: t.serviceSheetForm.sealNumber,
              field: 'sealNumber' as const,
              value: sheet.sealNumber,
            },
          ].map(({ label, field, value }) => (
            <div
              key={label}
              className="border-r border-surface-200 last:border-r-0"
            >
              <SectionCell
                header
                className="border-x-0 border-t-0 text-center text-[10px] sm:text-[11px]"
              >
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

      <FormSection className="p-3 sm:p-4">
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          {sheet.photoUri && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                {t.tickets.orderPhoto}
              </p>
              <img
                src={sheet.photoUri}
                alt="Orden"
                className="max-h-40 rounded-lg border border-surface-200 object-contain"
              />
            </div>
          )}
          {(sheet.tickets ?? []).length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                {t.tickets.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {(sheet.tickets ?? []).map((ticket) =>
                  ticket.photoUri ? (
                    <a
                      key={ticket.id}
                      href={ticket.photoUri}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={ticket.photoUri}
                        alt={ticket.scaleFolio || ticket.id}
                        className="h-20 w-20 rounded-lg border border-surface-200 object-cover"
                      />
                    </a>
                  ) : (
                    <div
                      key={ticket.id}
                      className="rounded-lg border border-surface-200 bg-surface-50 px-2 py-1 text-xs"
                    >
                      {ticket.scaleFolio || ticket.id}
                      {ticket.netWeight != null ? ` · ${ticket.netWeight} kg` : ''}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                title: t.serviceSheet.preparedBy,
                role: t.serviceSheet.preparedByRole,
                field: 'elaboro' as const,
                value: sheet.elaboro,
              },
              {
                title: t.serviceSheet.supervisor,
                role: t.serviceSheet.supervisorRole,
                field: 'responsableSup' as const,
                value: sheet.responsableSup,
              },
              {
                title: t.serviceSheet.authorizedBy,
                role: t.serviceSheet.authorizedByRole,
                field: 'autoriza' as const,
                value: sheet.autoriza,
              },
              {
                title: t.serviceSheet.operatorReceivedDelivered,
                role: t.serviceSheet.operatorReceivedDeliveredRole,
                field: 'recibio' as const,
                value: sheet.recibio || sheet.entrega,
                syncEntrega: true,
              },
            ] as const
          ).map(({ title, role, field, value, ...rest }) => (
            <div
              key={field}
              className="flex min-h-[7.5rem] flex-col rounded-xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white px-3 py-3 text-center shadow-sm"
            >
              <div className="mb-3">
                <p className="text-[11px] font-semibold leading-snug text-surface-800 sm:text-xs">
                  {title}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-brand-700">
                  ({role})
                </p>
              </div>
              <div className="mt-auto flex min-h-[2.75rem] items-center justify-center rounded-lg border border-dashed border-surface-200 bg-white px-2 py-2">
                <FormField
                  value={value}
                  editable={editable}
                  className="border-0 bg-transparent text-center text-sm shadow-none focus:ring-0"
                  onChange={(v) => {
                    updateField(field, v);
                    if ('syncEntrega' in rest && rest.syncEntrega) {
                      updateField('entrega', v);
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </FormSection>
    </div>
  );
}
