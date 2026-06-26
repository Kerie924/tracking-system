import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'green' | 'blue' | 'amber' | 'purple' | 'rose';
}

const colorMap = {
  green: {
    bg: 'bg-brand-50',
    icon: 'text-brand-600',
    ring: 'ring-brand-100',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    ring: 'ring-blue-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    ring: 'ring-amber-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    ring: 'ring-purple-100',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'text-rose-600',
    ring: 'ring-rose-100',
  },
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'green',
}: KpiCardProps) {
  const colors = colorMap[color];

  return (
    <div className="animate-slide-up rounded-2xl border border-surface-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2 sm:space-y-3">
          <p className="text-xs font-medium text-surface-800/60 sm:text-sm">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-surface-800/50">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                trend.value >= 0 ? 'text-brand-600' : 'text-rose-600'
              )}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4 sm:h-12 sm:w-12',
            colors.bg,
            colors.icon,
            colors.ring
          )}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
