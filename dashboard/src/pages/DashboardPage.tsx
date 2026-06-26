import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LiveBadge } from '@/components/ui/Badge';
import {
  ServiceSheetTable,
  ServiceSheetFormView,
} from '@/components/serviceSheets/ServiceSheetTable';
import { TrendChart, MaterialPieChart, SiteBarChart } from '@/components/charts/Charts';
import { LoadingSpinner, Modal } from '@/components/ui/Modal';
import { useServiceSheetStats, useTrends } from '@/hooks/useFirestoreData';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel } from '@/i18n/translations';
import { formatNumber, MATERIAL_TYPES } from '@/types';
import type { ServiceSheet } from '@/types';
import { FileText, Package, MapPin, Users, Calendar } from 'lucide-react';

export function DashboardPage() {
  const { t, language, locale } = useTranslation();
  const { stats, sheets, loading, error, isAdmin } = useServiceSheetStats();
  const { data: trends } = useTrends(7);
  const [selected, setSelected] = useState<ServiceSheet | null>(null);

  if (loading) {
    return (
      <Layout title={t.dashboard.title} subtitle={t.dashboard.loading}>
        <LoadingSpinner />
      </Layout>
    );
  }

  const totalMaterialQty = Object.values(stats.byMaterial).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <Layout title={t.dashboard.title} subtitle={t.dashboard.subtitle}>
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {t.dashboard.error}: {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
        <LiveBadge label={t.dashboard.live} />
        <span className="text-xs text-surface-800/50 sm:text-sm">
          {sheets.length} {t.dashboard.sheetsRegistered}
        </span>
      </div>

      <div
        className={`mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 ${isAdmin ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}
      >
        <KpiCard
          title={t.dashboard.sheetsToday}
          value={formatNumber(stats.todaySheets, locale)}
          icon={Calendar}
          color="green"
        />
        <KpiCard
          title={t.dashboard.totalSheets}
          value={formatNumber(stats.totalSheets, locale)}
          icon={FileText}
          color="blue"
        />
        <KpiCard
          title={t.dashboard.totalQuantity}
          value={formatNumber(stats.totalQuantity, locale)}
          icon={Package}
          color="purple"
        />
        <KpiCard
          title={t.dashboard.activeSites}
          value={formatNumber(stats.activeSites, locale)}
          icon={MapPin}
          color="amber"
        />
        {isAdmin && (
          <KpiCard
            title={t.dashboard.activeUsers}
            value={formatNumber(stats.activeUsers, locale)}
            icon={Users}
            color="green"
          />
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-2">
        {trends.length > 0 && <TrendChart data={trends} />}
        <MaterialPieChart data={stats.byMaterial} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-2">
        <SiteBarChart data={stats.bySite} />
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.materialSummary}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MATERIAL_TYPES.map(({ id, color }) => {
                const qty = stats.byMaterial[id] ?? 0;
                const total = totalMaterialQty || 1;
                const pct = Math.round((qty / total) * 100);
                return (
                  <div key={id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-surface-800/70">
                        {getMaterialLabel(id, language)}
                      </span>
                      <span className="font-semibold text-surface-900">
                        {formatNumber(qty, locale)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t.dashboard.recentSheets} ({formatNumber(sheets.length, locale)})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <ServiceSheetTable
            sheets={sheets}
            onRowClick={setSelected}
          />
        </CardContent>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t.serviceSheetForm.title}
        size="xl"
        bare
      >
        {selected && <ServiceSheetFormView sheet={selected} />}
      </Modal>
    </Layout>
  );
}
