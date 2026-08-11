import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { MonthCalendarPicker } from '@/components/ui/MonthCalendarPicker';
import { LoadingSpinner } from '@/components/ui/Modal';
import {
  TrendChart,
  MaterialTrendChart,
  MaterialPieChart,
  SiteBarChart,
} from '@/components/charts/Charts';
import { useServiceSheets } from '@/hooks/useFirestoreData';
import {
  computeMaterialTrendsFromSheets,
  computeStatsFromSheets,
  computeTrendsFromSheets,
  subscribeToSites,
} from '@/services/firestoreData';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  formatNumber,
  siteDisplayName,
  type CatalogSite,
} from '@/types';
import { Leaf, TrendingUp, BarChart2 } from 'lucide-react';

export function AnalyticsPage() {
  const { t, locale, language } = useTranslation();
  const { sheets, loading } = useServiceSheets();
  const [siteFilter, setSiteFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [sites, setSites] = useState<CatalogSite[]>([]);

  useEffect(() => {
    return subscribeToSites(setSites);
  }, []);

  const siteOptions = useMemo(() => {
    return sites
      .map((site) => ({
        value: site.id,
        label: `${siteDisplayName(site, language)} (${site.code})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sites, language]);

  const filteredSheets = useMemo(() => {
    return sheets.filter((s) => {
      const matchesSite =
        !siteFilter ||
        s.siteId === siteFilter ||
        s.codigo === siteFilter ||
        s.siteName === siteFilter ||
        sites.some(
          (site) =>
            site.id === siteFilter &&
            (s.siteId === site.id ||
              s.codigo === site.code ||
              s.codigo === site.formCodigo ||
              s.siteName === site.name ||
              s.siteName === site.code)
        );

      const dateStr = s.fecha || s.createdAt || '';
      const matchesMonth = !monthFilter || dateStr.startsWith(monthFilter);

      return matchesSite && matchesMonth;
    });
  }, [sheets, siteFilter, monthFilter, sites]);

  const stats = useMemo(
    () => computeStatsFromSheets(filteredSheets),
    [filteredSheets]
  );

  const trendDays = useMemo(() => {
    if (monthFilter) {
      const [y, m] = monthFilter.split('-').map(Number);
      return new Date(y, m, 0).getDate();
    }
    return 30;
  }, [monthFilter]);

  const trends = useMemo(() => {
    if (monthFilter) {
      const [y, m] = monthFilter.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const result = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${monthFilter}-${String(day).padStart(2, '0')}`;
        const daySheets = filteredSheets.filter(
          (s) => s.fecha === dateStr || s.createdAt?.startsWith(dateStr)
        );
        result.push({
          date: dateStr,
          count: daySheets.length,
          weight: daySheets.reduce(
            (sum, s) =>
              sum +
              (s.materials?.reduce((a, mat) => a + (mat.quantity || 0), 0) ?? 0),
            0
          ),
        });
      }
      return result;
    }
    return computeTrendsFromSheets(filteredSheets, trendDays);
  }, [filteredSheets, monthFilter, trendDays]);

  const materialTrends = useMemo(() => {
    if (monthFilter) {
      const [y, m] = monthFilter.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      return computeMaterialTrendsFromSheets(
        filteredSheets,
        Math.min(daysInMonth, 31)
      );
    }
    return computeMaterialTrendsFromSheets(filteredSheets, trendDays);
  }, [filteredSheets, monthFilter, trendDays]);

  if (loading) {
    return (
      <Layout title={t.analytics.title} subtitle={t.common.loading}>
        <LoadingSpinner />
      </Layout>
    );
  }

  const dailyAvg =
    trends.length > 0
      ? Math.round(stats.totalSheets / Math.max(trends.length, 1))
      : 0;

  return (
    <Layout title={t.analytics.title} subtitle={t.analytics.subtitle}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[14rem] flex-1 sm:max-w-sm">
          <Select
            label={t.analytics.filterSite}
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            options={[
              { value: '', label: t.analytics.allSites },
              ...siteOptions,
            ]}
          />
        </div>
        <div className="min-w-[14rem] flex-1 sm:max-w-sm">
          <MonthCalendarPicker
            label={t.analytics.filterMonth}
            value={monthFilter}
            onChange={setMonthFilter}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card hover>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                <Leaf className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <p className="text-sm text-surface-800/50">{t.analytics.totalKilograms}</p>
                <p className="text-2xl font-bold text-surface-900">
                  {formatNumber(stats.totalKilograms, locale)}{' '}
                  <span className="text-base font-semibold text-surface-500">kg</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card hover>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Leaf className="h-6 w-6 text-emerald-600" />
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
                <p className="text-sm text-surface-800/50">{t.dashboard.totalSheets}</p>
                <p className="text-2xl font-bold text-surface-900">
                  {formatNumber(stats.totalSheets, locale)}
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
