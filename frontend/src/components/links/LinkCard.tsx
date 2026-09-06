'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { linksApi } from '@/lib/api';
import type { LinkData } from '@/lib/api';
import { copyToClipboard, formatRelativeDate, formatNumber, extractDomain, getStatusColor, cn } from '@/lib/utils';
import { Badge, Button, ConfirmDialog, toast } from '@/components/ui';
import {
  Copy, Check, ExternalLink, BarChart3, Trash2, Power,
  QrCode, Lock, Clock, MousePointerClick, MoreHorizontal,
} from 'lucide-react';

interface Props {
  link: LinkData;
  onEdit?: (link: LinkData) => void;
  view?: 'card' | 'row';
}

export function LinkCard({ link, onEdit, view = 'card' }: Props) {
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['links'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const toggleMutation = useMutation({
    mutationFn: () => linksApi.toggle(link.id),
    onSuccess: () => { invalidate(); toast.success(`Link ${link.status === 'ACTIVE' ? 'deactivated' : 'activated'}`); },
    onError: () => toast.error('Failed to toggle link status'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => linksApi.delete(link.id),
    onSuccess: () => { invalidate(); toast.success('Link deleted'); setDeleteOpen(false); },
    onError: () => toast.error('Failed to delete link'),
  });

  async function handleCopy() {
    await copyToClipboard(link.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isExpired = link.status === 'EXPIRED';
  const isInactive = link.status === 'INACTIVE';

  if (view === 'row') {
    return (
      <>
        <tr className="group hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                {link.isPasswordProtected
                  ? <Lock className="h-3.5 w-3.5 text-brand-600" />
                  : <ExternalLink className="h-3.5 w-3.5 text-brand-600" />}
              </div>
              <div className="min-w-0">
                <a
                  href={link.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 truncate block max-w-[180px]"
                >
                  {link.shortUrl.replace(/^https?:\/\//, '')}
                </a>
                <p className="text-xs text-gray-400 truncate max-w-[180px]">{extractDomain(link.longUrl)}</p>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 hidden sm:table-cell">
            <p className="text-sm text-gray-600 truncate max-w-[200px]">{link.title ?? '—'}</p>
          </td>
          <td className="px-4 py-3">
            <Badge
              variant={link.status === 'ACTIVE' ? 'success' : link.status === 'EXPIRED' ? 'danger' : 'default'}
              dot
            >
              {link.status}
            </Badge>
          </td>
          <td className="px-4 py-3 text-right">
            <span className="text-sm font-semibold text-gray-900">{formatNumber(link.clickCount)}</span>
          </td>
          <td className="px-4 py-3 text-right text-xs text-gray-400 hidden md:table-cell">
            {formatRelativeDate(link.createdAt)}
          </td>
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleCopy} className="btn-ghost p-1.5" aria-label="Copy">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <Link href={`/dashboard/links/${link.id}`} className="btn-ghost p-1.5" title="Analytics">
                <BarChart3 className="h-3.5 w-3.5" />
              </Link>
              <button onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending} className="btn-ghost p-1.5" aria-label="Toggle">
                <Power className={cn('h-3.5 w-3.5', link.status === 'ACTIVE' ? 'text-green-500' : 'text-gray-400')} />
              </button>
              <button onClick={() => setDeleteOpen(true)} className="btn-ghost p-1.5 hover:text-red-500" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
        </tr>
        <ConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate()}
          loading={deleteMutation.isPending}
          title="Delete this link?"
          description={`"${link.shortUrl.replace(/^https?:\/\//, '')}" will be permanently deleted and all analytics data will be lost.`}
          confirmLabel="Delete Link"
        />
      </>
    );
  }

  // Card view
  return (
    <>
      <div className={cn('card hover:shadow-md transition-all group', isExpired && 'opacity-75')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={link.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 truncate"
            >
              {link.shortUrl.replace(/^https?:\/\//, '')}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            {link.isPasswordProtected && (
              <span title="Password protected"><Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" /></span>
            )}
          </div>
          <Badge
            variant={link.status === 'ACTIVE' ? 'success' : isExpired ? 'danger' : 'default'}
            dot
            className="shrink-0"
          >
            {link.status}
          </Badge>
        </div>

        {/* Destination */}
        <p className="text-xs text-gray-400 truncate mb-3">{link.longUrl}</p>

        {/* Tags */}
        {link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {link.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <MousePointerClick className="h-3 w-3" />
            {formatNumber(link.clickCount)} clicks
          </span>
          {link.expiresAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Exp {formatRelativeDate(link.expiresAt)}
            </span>
          )}
          <span className="ml-auto">{formatRelativeDate(link.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="btn-secondary flex-1 py-1.5 text-xs">
            {copied ? <><Check className="h-3.5 w-3.5 text-green-500" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
          <Link href={`/dashboard/links/${link.id}`} className="btn-ghost p-1.5" aria-label="View analytics">
            <BarChart3 className="h-4 w-4" />
          </Link>
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending || isExpired}
            className="btn-ghost p-1.5"
            aria-label={link.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          >
            <Power className={cn('h-4 w-4', link.status === 'ACTIVE' ? 'text-green-500' : 'text-gray-300')} />
          </button>
          <button onClick={() => setDeleteOpen(true)} className="btn-ghost p-1.5 hover:text-red-500" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete this link?"
        description="This action cannot be undone. All analytics data will be permanently lost."
        confirmLabel="Delete Link"
      />
    </>
  );
}
