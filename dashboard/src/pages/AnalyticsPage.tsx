import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/Modal';
import {
  TrendChart,
  MaterialTrendChart,
  MaterialPieChart,
  SiteBarChart,
} from '@/components/charts/Charts';
import {
  useServiceSheetStats,
  useTrends,
  useMaterialTrends,
} from '@/hooks/useFirestoreData';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatNumber } from '@/types';
import { Leaf, TrendingUp, BarChart2 } from 'lucide-react';

export function AnalyticsPage() {
  const { t, locale } = useTranslation();
  const [days, setDays] = useState(14);
  const { stats, loading } = useServiceSheetStats();
  const { data: trends } = useTrends(days);
  const { data: materialTrends } = useMaterialTrends(days);

  if (loading) {
    return (
      <Layout title={t.analytics.title} subtitle={t.common.loading}>
        <LoadingSpinner />
      </Layout>
    );
  }

  const dailyAvg =
    days > 0 ? Math.round(stats.totalSheets / days) : 0;

  return (
    <Layout title={t.analytics.title} subtitle={t.analytics.subtitle}>
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-surface-800/50">{t.analytics.period}:</span>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              days === d
                ? 'bg-brand-600 text-white'
                : 'bg-white text-surface-800/60 hover:bg-surface-100'
            }`}
          >
            {d} {t.analytics.days}
          </button>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card hover>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                <Leaf className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <p className="text-sm text-surface-800/50">{t.analytics.recycled}</p>
                <p className="text-2xl font-bold text-surface-900">
                  {formatNumber(stats.totalQuantity, locale)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card hover>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-surface-800/50">{t.dashboard.activeSites}</p>
                <p className="text-2xl font-bold text-surface-900">
                  {formatNumber(stats.activeSites, locale)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card hover>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                <BarChart2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-surface-800/50">{t.analytics.dailyAvg}</p>
                <p className="text-2xl font-bold text-surface-900">
                  {formatNumber(dailyAvg, locale)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6">
        {trends.length > 0 && <TrendChart data={trends} />}
        {materialTrends.length > 0 && (
          <MaterialTrendChart data={materialTrends} />
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MaterialPieChart data={stats.byMaterial} />
        <SiteBarChart data={stats.bySite} />
      </div>

      {Object.keys(stats.bySite).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.analytics.bySite}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.bySite)
                .sort(([, a], [, b]) => b - a)
                .map(([siteName, count]) => {
                  const maxCount = Math.max(...Object.values(stats.bySite));
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={siteName} className="flex items-center gap-4">
                      <div className="w-40 truncate text-sm font-medium text-surface-800/70">
                        {siteName}
                      </div>
                      <div className="flex-1">
                        <div className="h-3 overflow-hidden rounded-full bg-surface-100">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-semibold">
                        {count}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
