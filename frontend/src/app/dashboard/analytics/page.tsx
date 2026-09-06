'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, linksApi } from '@/lib/api';
import { Spinner, Badge } from '@/components/ui';
import { formatNumber, formatRelativeDate, extractDomain } from '@/lib/utils';
import { BarChart3, TrendingUp, MousePointerClick, Globe, Link2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

const PERIODS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d');

  const { data: dashStats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data.data),
  });

  const { data: links = [] } = useQuery({
    queryKey: ['top-links'],
    queryFn: () => linksApi.getAll({ sortBy: 'clickCount', sortOrder: 'desc', limit: 10 }).then((r) => r.data.data ?? []),
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-full py-20"><Spinner size="lg" /></div>;
  }

  const topLinks: Array<{ id: string; shortUrl: string; longUrl: string; title?: string; clickCount: number; status: string }> = Array.isArray(links) ? links.slice(0, 10) : [];
  const maxClicks = topLinks[0]?.clickCount ?? 1;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Performance overview across all your links.</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Links', value: dashStats?.totalLinks ?? 0, icon: Link2, color: 'bg-brand-100 text-brand-600' },
          { label: 'Active Links', value: dashStats?.activeLinks ?? 0, icon: TrendingUp, color: 'bg-green-100 text-green-600' },
          { label: 'Total Clicks', value: dashStats?.totalClicks ?? 0, icon: MousePointerClick, color: 'bg-blue-100 text-blue-600' },
          { label: 'Clicks (30d)', value: dashStats?.clicksLast30Days ?? 0, icon: BarChart3, color: 'bg-purple-100 text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-gray-500">{label}</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {/* Top Links Bar Chart */}
      {topLinks.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Top Links by Clicks</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={topLinks.map((l) => ({
                name: l.shortUrl.replace(/^https?:\/\//, ''),
                clicks: l.clickCount,
              }))}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={120}
                tickFormatter={(v: string) => v.length > 20 ? `${v.slice(0, 18)}…` : v}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v: number) => [formatNumber(v), 'Clicks']}
              />
              <Bar dataKey="clicks" radius={[0, 4, 4, 0]}>
                {topLinks.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top links table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-gray-900">All Links Performance</h2>
        </div>
        {topLinks.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400 text-sm">
            Create links to see their performance here.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Link</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Destination</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Clicks</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right hidden md:table-cell">Share</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topLinks.map((link) => {
                const share = maxClicks > 0 ? ((link.clickCount / dashStats?.totalClicks!) * 100).toFixed(1) : '0';
                return (
                  <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        {link.shortUrl.replace(/^https?:\/\//, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{extractDomain(link.longUrl)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={link.status === 'ACTIVE' ? 'success' : 'default'} dot>
                        {link.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-bold text-gray-900">{formatNumber(link.clickCount)}</span>
                    </td>
                    <td className="px-5 py-3 text-right hidden md:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-brand-500"
                            style={{ width: `${(link.clickCount / maxClicks) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{share}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/links/${link.id}`} className="btn-ghost p-1.5" title="View details">
                        <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
