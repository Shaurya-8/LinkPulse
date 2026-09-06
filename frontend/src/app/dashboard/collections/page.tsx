'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Button, Input, Modal, ConfirmDialog, EmptyState, Spinner, toast } from '@/components/ui';
import { cn, generateRandomColor, formatDate } from '@/lib/utils';
import { Plus, FolderOpen, Trash2, Link2, Folder } from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#ef4444', '#3b82f6', '#22c55e',
];

interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  _count: { items: number };
  items: Array<{
    link: { shortCode: string; title?: string; clickCount: number };
  }>;
}

function CreateCollectionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.createCollection({ name, description: description || undefined, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection created');
      setName(''); setDescription(''); setColor('#6366f1');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create collection';
      toast.error(msg);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Collection" size="sm">
      <div className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g. Marketing Campaign Q1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Description (optional)</label>
          <textarea
            rows={2}
            placeholder="What are these links for?"
            className="input resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Color</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                  color === c ? 'border-gray-900 scale-110' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutate()} loading={isPending} disabled={!name.trim()}>
            Create Collection
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CollectionCard({ collection, onDelete }: { collection: Collection; onDelete: () => void }) {
  return (
    <div className="card hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${collection.color}20` }}
          >
            <Folder className="h-5 w-5" style={{ color: collection.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{collection.name}</h3>
            {collection.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{collection.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Preview links */}
      {collection.items.length > 0 ? (
        <div className="space-y-2 mb-3">
          {collection.items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
              <Link2 className="h-3 w-3 shrink-0 text-gray-300" />
              <span className="truncate">{item.link.title ?? item.link.shortCode}</span>
              <span className="ml-auto text-gray-400">{item.link.clickCount} clicks</span>
            </div>
          ))}
          {collection._count.items > 3 && (
            <p className="text-xs text-gray-400">+{collection._count.items - 3} more links</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-3">No links added yet</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          {collection._count.items} link{collection._count.items !== 1 ? 's' : ''}
        </span>
        <span>Created {formatDate(collection.createdAt)}</span>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => usersApi.getCollections().then((r) => r.data.data as Collection[]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete collection'),
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-sm text-gray-500 mt-1">Organise your links into groups.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          New Collection
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" />}
          title="No collections yet"
          description="Create a collection to group related links together — great for campaigns, projects, or clients."
          action={
            <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Create First Collection
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              onDelete={() => setDeleteId(col.id)}
            />
          ))}
        </div>
      )}

      <CreateCollectionModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Delete this collection?"
        description="The collection will be deleted but your links will be kept. This cannot be undone."
        confirmLabel="Delete Collection"
      />
    </div>
  );
}
