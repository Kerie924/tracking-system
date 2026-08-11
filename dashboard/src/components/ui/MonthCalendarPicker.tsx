import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface MonthCalendarPickerProps {
  label?: string;
  value: string; // '' | 'YYYY-MM'
  onChange: (value: string) => void;
}

export function MonthCalendarPicker({
  label,
  value,
  onChange,
}: MonthCalendarPickerProps) {
  const { t, language } = useTranslation();
  const locale = language === 'en' ? 'en-US' : 'es-MX';
  const now = new Date();
  const selected = value
    ? {
        year: Number(value.slice(0, 4)),
        month: Number(value.slice(5, 7)) - 1,
      }
    : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    selected?.year ?? now.getFullYear()
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (selected) setViewYear(selected.year);
  }, [selected?.year]);

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleDateString(locale, { month: 'short' })
      ),
    [locale]
  );

  const displayLabel = value
    ? new Date(`${value}-01`).toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      })
    : t.analytics.allMonths;

  return (
    <div className="relative space-y-1.5" ref={rootRef}>
      {label && (
        <label className="text-sm font-medium text-surface-800/70">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-left text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <span className="truncate">{displayLabel}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-surface-400" />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-72 rounded-xl border border-surface-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="rounded-lg p-1.5 text-surface-600 hover:bg-surface-100"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-surface-900">{viewYear}</span>
            <button
              type="button"
              className="rounded-lg p-1.5 text-surface-600 hover:bg-surface-100"
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {monthNames.map((name, monthIndex) => {
              const monthValue = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;
              const isSelected = value === monthValue;
              const isCurrent =
                viewYear === now.getFullYear() && monthIndex === now.getMonth();
              return (
                <button
                  key={monthValue}
                  type="button"
                  onClick={() => {
                    onChange(monthValue);
                    setOpen(false);
                  }}
                  className={cn(
                    'rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : isCurrent
                        ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                        : 'text-surface-700 hover:bg-surface-100'
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-surface-100 pt-2">
            <button
              type="button"
              className="w-full rounded-lg px-2 py-1.5 text-sm text-surface-600 hover:bg-surface-50"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              {t.analytics.allMonths}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
