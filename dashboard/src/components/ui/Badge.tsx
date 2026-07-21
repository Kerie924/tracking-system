import { cn } from '@/lib/utils';
import { MATERIAL_TYPES, getSheetStatus, type ServiceSheetStatus } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel, getStatusLabel } from '@/i18n/translations';
import type { MaterialType } from '@/types';

export function MaterialBadge({ type }: { type: MaterialType | string }) {
  const { language } = useTranslation();
  const mat = MATERIAL_TYPES.find((m) => m.id === type);
  const color = mat?.color ?? '#6b7280';
  const label = getMaterialLabel(type, language);

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {label}
    </span>
  );
}

const STATUS_STYLES: Record<ServiceSheetStatus, string> = {
  draft: 'bg-surface-100 text-surface-700',
  validated: 'bg-sky-50 text-sky-700',
  authorized: 'bg-amber-50 text-amber-800',
  completed: 'bg-emerald-50 text-emerald-700',
};

export function StatusBadge({
  status,
}: {
  status?: ServiceSheetStatus | string | null;
}) {
  const { language } = useTranslation();
  const normalized = getSheetStatus({ status: status as ServiceSheetStatus });
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[normalized]
      )}
    >
      {getStatusLabel(normalized, language)}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        active
          ? 'bg-brand-50 text-brand-700'
          : 'bg-surface-100 text-surface-800/50'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-brand-500' : 'bg-surface-300'
        )}
      />
      {active ? t.dashboard.live : '—'}
    </span>
  );
}

export function LiveBadge({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500" />
      {label ?? t.dashboard.live}
    </span>
  );
}
