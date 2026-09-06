'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { linksApi } from '@/lib/api';
import type { LinkData } from '@/lib/api';
import { CreateLinkModal } from '@/components/links/CreateLinkModal';
import { LinkCard } from '@/components/links/LinkCard';
import { Spinner, EmptyState, Button, Select } from '@/components/ui';
import { Plus, Search, Link2, LayoutGrid, List, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'EXPIRED', label: 'Expired' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date created' },
  { value: 'clickCount', label: 'Most clicks' },
  { value: 'title', label: 'Title A–Z' },
];

export default function LinksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['links', { page, search, status, sortBy, sortOrder }],
    queryFn: () =>
      linksApi.getAll({ page, limit: 20, search: search || undefined, status: status || undefined, sortBy, sortOrder })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  console.log("links 43 : ",data);
  const links: LinkData[] = data?.data.links ?? [];
  const meta = data?.meta;

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Links</h1>
          {meta && (
            <p className="text-sm text-gray-500 mt-0.5">{meta.total} total links</p>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          New Link
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, short code, or URL…"
            value={search}
            onChange={handleSearch}
            className="input pl-9 h-10"
          />
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input h-10 w-full sm:w-36"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input h-10 w-full sm:w-40"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          <button
            onClick={() => setView('grid')}
            className={cn('p-2.5 transition-colors', view === 'grid' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-50')}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('table')}
            className={cn('p-2.5 transition-colors', view === 'table' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-50')}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-8 w-8" />}
          title={search || status ? 'No links match your filters' : 'No links yet'}
          description={search || status ? 'Try changing your search or filter.' : 'Create your first short link to get started.'}
          action={
            !search && !status ? (
              <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
                Create your first link
              </Button>
            ) : undefined
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {links.map((link) => (
            <LinkCard key={link.id} link={link} view="card" />
          ))}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Link</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Title</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Clicks</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right hidden md:table-cell">Created</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {links.map((link) => (
                <LinkCard key={link.id} link={link} view="row" />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={!meta.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <CreateLinkModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
