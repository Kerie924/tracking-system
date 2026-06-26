import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/contexts/LanguageContext';
import { getMaterialLabel } from '@/i18n/translations';
import { MATERIAL_TYPES } from '@/types';

const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: '13px',
};

interface TrendChartProps {
  data: { date: string; count: number; weight: number }[];
  variant?: 'light' | 'dark';
}

export function TrendChart({ data, variant = 'light' }: TrendChartProps) {
  const { t, locale } = useTranslation();
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
    }),
  }));

  const isDark = variant === 'dark';
  const gradientId = isDark ? 'tvColorCount' : 'colorCount';
  const darkTooltip = {
    backgroundColor: '#0f172a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '13px',
  };

  const content = (
    <ResponsiveContainer width="100%" height={isDark ? 280 : 220} minHeight={isDark ? 240 : 200}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={isDark ? 0.35 : 0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={isDark ? darkTooltip : tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          name={t.dashboard.totalSheets}
          stroke="#10b981"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (isDark) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white/90">{t.analytics.trend}</h2>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.analytics.trend}</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

interface MaterialPieProps {
  data: Record<string, number>;
  variant?: 'light' | 'dark';
}

export function MaterialPieChart({ data, variant = 'light' }: MaterialPieProps) {
  const { t, language } = useTranslation();
  const chartData: { name: string; value: number; color: string }[] = MATERIAL_TYPES.map((m) => ({
    name: getMaterialLabel(m.id, language),
    value: data[m.id] || 0,
    color: m.color,
  })).filter((d) => d.value > 0);

  if (chartData.length === 0) {
    chartData.push({ name: '—', value: 1, color: '#e2e8f0' });
  }

  const isDark = variant === 'dark';
  const darkTooltip = {
    backgroundColor: '#0f172a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '13px',
  };

  const content = (
    <ResponsiveContainer width="100%" height={isDark ? 320 : 220} minHeight={isDark ? 280 : 200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={isDark ? 80 : 60}
          outerRadius={isDark ? 130 : 100}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={isDark ? darkTooltip : tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => (
            <span className={isDark ? 'text-sm text-white/70' : 'text-sm text-surface-800/70'}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  if (isDark) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white/90">
          {t.analytics.distribution}
        </h2>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.analytics.distribution}</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

interface MaterialSummaryProps {
  data: Record<string, number>;
  variant?: 'light' | 'dark';
}

export function MaterialSummaryChart({ data, variant = 'light' }: MaterialSummaryProps) {
  const { t, language, locale } = useTranslation();
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;

  const bars = (
    <div className="space-y-4">
      {MATERIAL_TYPES.map(({ id, color }) => {
        const qty = data[id] ?? 0;
        const pct = Math.round((qty / total) * 100);
        return (
          <div key={id}>
            <div className="mb-1 flex justify-between text-sm">
              <span
                className={
                  variant === 'dark'
                    ? 'font-medium text-white/70'
                    : 'font-medium text-surface-800/70'
                }
              >
                {getMaterialLabel(id, language)}
              </span>
              <span
                className={
                  variant === 'dark' ? 'font-semibold text-white' : 'font-semibold text-surface-900'
                }
              >
                {qty.toLocaleString(locale)} ({pct}%)
              </span>
            </div>
            <div
              className={
                variant === 'dark'
                  ? 'h-2 overflow-hidden rounded-full bg-white/10'
                  : 'h-2 overflow-hidden rounded-full bg-surface-100'
              }
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (variant === 'dark') {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white/90">
          {t.dashboard.materialSummary}
        </h2>
        {bars}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.dashboard.materialSummary}</CardTitle>
      </CardHeader>
      <CardContent>{bars}</CardContent>
    </Card>
  );
}

interface MaterialTrendProps {
  data: ({
    date: string;
  } & Record<import('@/types').MaterialType, number>)[];
}

export function MaterialTrendChart({ data }: MaterialTrendProps) {
  const { t, language, locale } = useTranslation();
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.analytics.volumeByMaterial}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240} minHeight={200}>
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-surface-800/70">{value}</span>
              )}
            />
            {MATERIAL_TYPES.map((m) => (
              <Bar
                key={m.id}
                dataKey={m.id}
                name={getMaterialLabel(m.id, language)}
                fill={m.color}
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface SiteBarProps {
  data: Record<string, number>;
}

export function SiteBarChart({ data }: SiteBarProps) {
  const { t } = useTranslation();
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.analytics.bySite}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220} minHeight={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" name={t.dashboard.totalSheets} fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
