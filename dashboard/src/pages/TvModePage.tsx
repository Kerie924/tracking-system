import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServiceSheetStats, useTrends } from '@/hooks/useFirestoreData';
import { LiveBadge } from '@/components/ui/Badge';
import {
  MaterialPieChart,
  MaterialSummaryChart,
  TrendChart,
} from '@/components/charts/Charts';
import { formatNumber } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import { Recycle, FileText, Package, Users, ArrowLeft } from 'lucide-react';

export function TvModePage() {
  const { stats } = useServiceSheetStats();
  const { data: trends } = useTrends(7);
  const { t, locale } = useTranslation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <Recycle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t.appName}</h1>
            <p className="text-sm text-white/50">{t.nav.tvMode}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.nav.backToDashboard}
          </Link>
          <LiveBadge />
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums">
              {time.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-sm text-white/50">
              {time.toLocaleDateString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4">
        <TvKpi
          icon={FileText}
          label={t.dashboard.sheetsToday}
          value={formatNumber(stats.todaySheets, locale)}
          color="text-brand-400"
        />
        <TvKpi
          icon={Package}
          label={t.dashboard.totalQuantity}
          value={formatNumber(stats.totalQuantity, locale)}
          color="text-blue-400"
        />
        <TvKpi
          icon={Recycle}
          label={t.dashboard.totalSheets}
          value={formatNumber(stats.totalSheets, locale)}
          color="text-purple-400"
        />
        <TvKpi
          icon={Users}
          label={t.dashboard.activeUsers}
          value={formatNumber(stats.activeUsers, locale)}
          color="text-amber-400"
        />
      </div>

      {trends.length > 0 && (
        <div className="px-6 pb-6">
          <TrendChart data={trends} variant="dark" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 px-6 pb-8 lg:grid-cols-2">
        <MaterialPieChart data={stats.byMaterial} variant="dark" />
        <MaterialSummaryChart data={stats.byMaterial} variant="dark" />
      </div>
    </div>
  );
}

function TvKpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-sm font-medium text-white/50">{label}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
