import { MaterialBadge, StatusBadge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  formatNumber,
  getPrimaryMaterial,
  getTotalQuantity,
  isKnownMaterialType,
  type MaterialType,
} from '@/types';
import type { ServiceSheet } from '@/types';

export { ServiceSheetFormView } from '@/components/serviceSheets/ServiceSheetFormView';

interface ServiceSheetTableProps {
  sheets: ServiceSheet[];
  onRowClick?: (sheet: ServiceSheet) => void;
  compact?: boolean;
}

export function ServiceSheetTable({
  sheets,
  onRowClick,
  compact,
}: ServiceSheetTableProps) {
  const { t, locale } = useTranslation();

  if (sheets.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-surface-800/50">
        {t.serviceSheet.noData}
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-surface-100 md:hidden">
        {sheets.map((s) => {
          const primaryMaterial = getPrimaryMaterial(s);
          const known = isKnownMaterialType(primaryMaterial);
          return (
            <button
              key={`${s.userId}-${s.id}`}
              type="button"
              onClick={() => onRowClick?.(s)}
              className="w-full px-4 py-4 text-left transition-colors hover:bg-surface-50 active:bg-surface-100"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-brand-700">{s.folio}</p>
                  <p className="truncate text-xs text-surface-400">{s.codigo}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-surface-900">
                  {formatNumber(getTotalQuantity(s), locale)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={s.status} />
                {known ? (
                  <MaterialBadge type={primaryMaterial as MaterialType} />
                ) : (
                  <span className="text-xs text-surface-700">{primaryMaterial}</span>
                )}
                {s.siteName && (
                  <span className="truncate text-xs text-surface-800/60">{s.siteName}</span>
                )}
              </div>
              {!compact && s.userName && (
                <p className="mt-1 truncate text-xs text-surface-800/50">{s.userName}</p>
              )}
              <p className="mt-1 text-xs text-surface-400">
                {s.fecha || (s.createdAt ? formatDateTime(new Date(s.createdAt).getTime()) : '—')}
              </p>
            </button>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-surface-200 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                {t.serviceSheet.folio}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                {t.serviceSheet.status}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                {t.serviceSheet.materials}
              </th>
              {!compact && (
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                  {t.serviceSheet.user}
                </th>
              )}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                {t.serviceSheet.site}
              </th>
              {!compact && (
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                  {t.serviceSheet.operator}
                </th>
              )}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                {t.serviceSheet.quantity}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-800/50">
                {t.serviceSheet.date}
              </th>
            </tr>
          </thead>
          <tbody>
            {sheets.map((s) => {
              const primaryMaterial = getPrimaryMaterial(s);
              const known = isKnownMaterialType(primaryMaterial);
              return (
                <tr
                  key={`${s.userId}-${s.id}`}
                  onClick={() => onRowClick?.(s)}
                  className="cursor-pointer border-b border-surface-100 transition-colors hover:bg-surface-50"
                >
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-mono text-sm font-medium text-brand-700">
                        {s.folio}
                      </span>
                      <p className="text-xs text-surface-400">{s.codigo}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    {known ? (
                      <MaterialBadge type={primaryMaterial as MaterialType} />
                    ) : (
                      <span className="text-sm text-surface-700">{primaryMaterial}</span>
                    )}
                  </td>
                  {!compact && (
                    <td className="px-4 py-3 text-sm text-surface-800/70">
                      {s.userName ?? s.userEmail ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-surface-800/70">
                    {s.siteName ?? '—'}
                  </td>
                  {!compact && (
                    <td className="px-4 py-3 text-sm text-surface-800/70">
                      {s.operatorName ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-surface-900">
                    {formatNumber(getTotalQuantity(s), locale)}
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-800/50">
                    {s.fecha || (s.createdAt ? formatDateTime(new Date(s.createdAt).getTime()) : '—')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
