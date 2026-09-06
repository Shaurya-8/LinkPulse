'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { analyticsApi, linksApi } from '@/lib/api';
import { Spinner, Badge, Button, toast } from '@/components/ui';
import { formatNumber, formatDate, extractDomain, copyToClipboard } from '@/lib/utils';
import {
  ArrowLeft, Copy, Check, Download, RefreshCw, ExternalLink,
  MousePointerClick, Users, Globe, Smartphone, Monitor,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

const PERIODS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All time' },
];

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#22c55e', '#ef4444'];

function StatCard({ label, value, icon: Icon, sub }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100">
          <Icon className="h-4 w-4 text-brand-600" />
        </div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{typeof value === 'number' ? formatNumber(value) : value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function HorizontalBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-gray-600 truncate shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-16 text-right text-xs font-semibold text-gray-700 shrink-0">
        {formatNumber(value)} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span>
      </div>
    </div>
  );
}

export default function LinkAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const linkId = params.id as string;
  const [period, setPeriod] = useState('7d');
  const [copied, setCopied] = useState(false);

  const { data: link, isLoading: linkLoading } = useQuery({
    queryKey: ['link', linkId],
    queryFn: () => linksApi.getById(linkId).then((r) => r.data.data),
  });
  
  console.log("link :",link, )
  const { data: summary } = useQuery({
    queryKey: ['analytics', linkId, 'summary', period],
    queryFn: () => analyticsApi.summary(linkId, period).then((r) => r.data.data),
    enabled: !!link,
  });

  const { data: timeSeries } = useQuery({
    queryKey: ['analytics', linkId, 'timeseries', period],
    queryFn: () => analyticsApi.timeSeries(linkId, period).then((r) => r.data.data),
    enabled: !!link,
  });

  const { data: geoData } = useQuery({
    queryKey: ['analytics', linkId, 'geo', period],
    queryFn: () => analyticsApi.geo(linkId, period).then((r) => r.data.data),
    enabled: !!link,
  });

  const { data: deviceData } = useQuery({
    queryKey: ['analytics', linkId, 'devices', period],
    queryFn: () => analyticsApi.devices(linkId, period).then((r) => r.data.data),
    enabled: !!link,
  });

  const { data: browserData } = useQuery({
    queryKey: ['analytics', linkId, 'browsers', period],
    queryFn: () => analyticsApi.browsers(linkId, period).then((r) => r.data.data),
    enabled: !!link,
  });

  const { data: referrerData } = useQuery({
    queryKey: ['analytics', linkId, 'referrers', period],
    queryFn: () => analyticsApi.referrers(linkId, period).then((r) => r.data.data),
    enabled: !!link,
  });

  const exportMutation = useMutation({
    mutationFn: () => analyticsApi.exportCsv(linkId, period),
    onSuccess: (res) => {
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${linkId}-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Analytics exported');
    },
  });

  async function handleCopy() {
    if (!link?.shortUrl) return;
    await copyToClipboard(link.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (linkLoading || !link) {
    return <div className="flex justify-center items-center h-full py-20"><Spinner size="lg" /></div>;
  }

  if (!link) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Link not found.</p>
        <Link href="/dashboard/links" className="btn-secondary mt-4 inline-flex">Back to links</Link>
      </div>
    );
  }

  const tsData = Array.isArray(timeSeries) ? timeSeries : [];
  const geo = Array.isArray(geoData) ? geoData : [];
  const devices = Array.isArray(deviceData) ? deviceData : [];
  const browsers = Array.isArray(browserData) ? browserData : [];
  const referrers = Array.isArray(referrerData) ? referrerData : [];
  const totalClicks = summary?.totalClicks ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/dashboard/links" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to links
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <a href={link.shortUrl} target="_blank" rel="noopener noreferrer"
                className="text-xl font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1.5">
                {link.shortCode.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-4 w-4" />
              </a>
              <Badge variant={link.status === 'ACTIVE' ? 'success' : 'default'} dot>{link.status}</Badge>
            </div>
            <p className="text-sm text-gray-400 mt-1 truncate">{extractDomain(link.originalUrl)}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleCopy} className="btn-secondary text-sm">
              {copied ? <><Check className="h-4 w-4 text-green-500" /> Copied</> : <><Copy className="h-4 w-4" /> Copy URL</>}
            </button>
            <Button variant="secondary" size="sm" onClick={() => exportMutation.mutate()} loading={exportMutation.isPending}
              icon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clicks" value={summary?.totalClicks ?? 0} icon={MousePointerClick} />
        <StatCard label="Unique Visitors" value={summary?.uniqueVisitors ?? 0} icon={Users} />
        <StatCard label="Top Country" value={summary?.topCountry ?? '—'} icon={Globe} />
        <StatCard label="Top Referrer" value={summary?.topReferer ?? 'Direct'} icon={Monitor} sub="traffic source" />
      </div>

      {/* Time Series Chart */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-5">Clicks over time</h3>
        {tsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={tsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v: number) => [formatNumber(v), 'Clicks']}
              />
              <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} fill="url(#colorClicks)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">No data for this period</div>
        )}
      </div>

      {/* Bottom Charts: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Geo */}
        <div className="card lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Countries</h3>
          <div className="space-y-3">
            {geo.length === 0
              ? <p className="text-xs text-gray-400">No data yet</p>
              : geo.slice(0, 8).map((item: { country: string; clicks: number }, i) => (
                <HorizontalBar key={item.country} label={item.country} value={item.clicks}
                  total={totalClicks} color={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
          </div>
        </div>

        {/* Devices */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Devices</h3>
          {devices.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={devices} dataKey="clicks" nameKey="device" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {devices.map((_: unknown, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatNumber(v), 'Clicks']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {devices.map((d: { device: string; clicks: number; percentage: number }, i: number) => (
                  <div key={d.device} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="capitalize text-gray-600">{d.device}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{d.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-xs text-gray-400">No data yet</p>}
        </div>

        {/* Browsers */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Browsers</h3>
          <div className="space-y-3">
            {browsers.length === 0
              ? <p className="text-xs text-gray-400">No data yet</p>
              : browsers.slice(0, 6).map((b: { browser: string; clicks: number }, i: number) => (
                <HorizontalBar key={b.browser} label={b.browser} value={b.clicks}
                  total={totalClicks} color={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
          </div>
        </div>
      </div>

      {/* Referrers */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Traffic Sources</h3>
        {referrers.length === 0 ? (
          <p className="text-xs text-gray-400">No referrer data yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {referrers.slice(0, 12).map((r: { referer: string; clicks: number }, i: number) => (
              <HorizontalBar key={r.referer} label={r.referer === 'Direct' ? 'Direct / Unknown' : r.referer}
                value={r.clicks} total={totalClicks} color={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
