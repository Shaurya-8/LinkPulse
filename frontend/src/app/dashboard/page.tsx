'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, linksApi } from '@/lib/api';
import { useAuthStore, formatNumber, formatRelativeDate, extractDomain, cn } from '@/lib/utils';
import Link from 'next/link';
import { Spinner, Badge } from '@/components/ui';
import {
  Link2, BarChart3, MousePointerClick, TrendingUp,
  ExternalLink, ArrowRight, Plus, Activity,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

function StatCard({
  label, value, icon: Icon, trend, color = 'brand',
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color?: 'brand' | 'green' | 'blue' | 'purple';
}) {
  const colors = {
    brand: 'bg-brand-100 text-brand-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1.5 text-3xl font-extrabold text-gray-900">{formatNumber(Number(value))}</p>
          {trend && <p className="mt-1 text-xs text-green-600 font-medium">{trend}</p>}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, initialized } = useAuthStore();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data.data),
  });


  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ['links', { page: 1, limit: 5 }],
    queryFn: () => linksApi.getAll({ page: 1, limit: 5, sortBy: 'createdAt' }).then((r) => r.data.data),
  });


  if (initialized && statsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = statsData ?? {};
  const recentLinks = Array.isArray(linksData) ? linksData : [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {getGreeting()}, {user?.firstName ?? user?.username} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening with your links.</p>
        </div>
        <Link href="/dashboard/links" className="btn-primary">
          <Plus className="h-4 w-4" /> New Link
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Total Links" value={stats.totalLinks ?? 0} icon={Link2} color="brand" />
        <StatCard label="Active Links" value={stats.activeLinks ?? 0} icon={Activity} color="green" />
        <StatCard label="Total Clicks" value={stats.totalClicks ?? 0} icon={MousePointerClick} color="blue" />
        <StatCard label="Clicks (30d)" value={stats.clicksLast30Days ?? 0} icon={TrendingUp} color="purple" />
      </div>

      {/* Recent Links */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Recent Links</h2>
          <Link href="/dashboard/links" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {linksLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : recentLinks.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Link2 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No links yet. <Link href="/dashboard/links" className="text-brand-600 hover:underline">Create your first one!</Link></p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentLinks.map((link: {
              id: string; shortUrl: string; shortCode: string;
              longUrl: string; title?: string; clickCount: number;
              status: string; createdAt: string;
            }) => (
              <div key={link.id} className="flex items-center gap-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <Link2 className="h-3.5 w-3.5 text-brand-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 truncate"
                    >
                      {link.shortUrl.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <Badge
                      variant={link.status === 'ACTIVE' ? 'success' : link.status === 'EXPIRED' ? 'danger' : 'default'}
                      dot
                    >
                      {link.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{extractDomain(link.longUrl)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatNumber(link.clickCount)}</p>
                  <p className="text-xs text-gray-400">clicks</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Links */}
      {stats.topLinks?.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Top Performing Links</h2>
          <div className="space-y-3">
            {stats.topLinks.map((link: {
              id: string; shortCode: string; title?: string;
              longUrl: string; clickCount: number; status: string;
            }, i: number) => (
              <div key={link.id} className="flex items-center gap-4">
                <span className="text-lg font-extrabold text-gray-200 w-6 shrink-0 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {link.title ?? extractDomain(link.longUrl)}
                  </p>
                  <p className="text-xs text-gray-400">{extractDomain(link.longUrl)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatNumber(link.clickCount)}</p>
                  <p className="text-xs text-gray-400">clicks</p>
                </div>
                <div className="w-24 bg-gray-100 rounded-full h-1.5 shrink-0">
                  <div
                    className="bg-brand-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, (link.clickCount / (stats.topLinks[0]?.clickCount || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
