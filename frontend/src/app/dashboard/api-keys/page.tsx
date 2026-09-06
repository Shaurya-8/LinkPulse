'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Button, Input, Modal, ConfirmDialog, Badge, Spinner, EmptyState, toast } from '@/components/ui';
import { copyToClipboard, formatDate, formatRelativeDate } from '@/lib/utils';
import { Plus, KeyRound, Copy, Check, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

const SCOPES = [
  { id: 'links:read',      label: 'Read links',           desc: 'List and view your links' },
  { id: 'links:write',     label: 'Write links',          desc: 'Create, update, delete links' },
  { id: 'analytics:read',  label: 'Read analytics',       desc: 'Access click data and stats' },
  { id: 'qr:read',         label: 'Read QR codes',        desc: 'Download QR code files' },
];

interface CreatedKey { key: string; id: string; keyPrefix: string }

function CreateKeyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['links:read', 'links:write', 'analytics:read']);
  const [expiresAt, setExpiresAt] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      usersApi.createApiKey({ name, scopes: selectedScopes, expiresAt: expiresAt || undefined }),
    onSuccess: (res) => {
      setCreatedKey(res.data.data as CreatedKey);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create key';
      toast.error(msg);
    },
  });

  function handleClose() {
    setName(''); setSelectedScopes(['links:read', 'links:write', 'analytics:read']);
    setExpiresAt(''); setCreatedKey(null); setCopied(false);
    onClose();
  }

  async function handleCopy(key: string) {
    await copyToClipboard(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create API Key" size="md">
      {createdKey ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-3">
            <KeyRound className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">API key created</p>
              <p className="text-xs text-green-600">Copy and store it securely — it won't be shown again.</p>
            </div>
          </div>
          <div className="rounded-lg bg-gray-900 p-4 font-mono text-sm text-green-400 break-all select-all">
            {createdKey.key}
          </div>
          <Button
            className="w-full"
            onClick={() => handleCopy(createdKey.key)}
            icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          >
            {copied ? 'Copied!' : 'Copy API Key'}
          </Button>
          <Button variant="secondary" className="w-full" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <Input
            label="Key name"
            placeholder="e.g. Production App, CI/CD Pipeline"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Permissions</label>
            <div className="space-y-2">
              {SCOPES.map((scope) => (
                <label key={scope.id} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.id)}
                    onChange={() => toggleScope(scope.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{scope.label}</p>
                    <p className="text-xs text-gray-500">{scope.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Expiration <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              className="input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={() => mutate()}
              loading={isPending}
              disabled={!name.trim() || selectedScopes.length === 0}
            >
              Create API Key
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => usersApi.listApiKeys().then((r) => r.data.data as ApiKeyRecord[]),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => usersApi.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked');
      setRevokeId(null);
    },
    onError: () => toast.error('Failed to revoke key'),
  });

  interface ApiKeyRecord {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    isActive: boolean;
    lastUsedAt?: string | null;
    expiresAt?: string | null;
    createdAt: string;
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage keys for programmatic access to the LinkSnap API.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          New Key
        </Button>
      </div>

      {/* Docs callout */}
      <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <strong>Authentication:</strong> Pass your key as{' '}
        <code className="bg-brand-100 px-1.5 py-0.5 rounded font-mono text-xs">X-API-Key: sk_live_...</code> header.
        {' '}Max 10 active keys per account.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-8 w-8" />}
          title="No API keys"
          description="Create an API key to integrate LinkSnap into your apps or workflows."
          action={
            <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Create First Key
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {keys.map((key: ApiKeyRecord) => (
            <div key={key.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${key.isActive ? 'bg-brand-100' : 'bg-gray-100'}`}>
                    <KeyRound className={`h-4 w-4 ${key.isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{key.name}</p>
                      <Badge variant={key.isActive ? 'success' : 'default'} dot>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{key.keyPrefix}••••••••••••</p>
                  </div>
                </div>
                {key.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevokeId(key.id)}
                    className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {key.scopes.map((scope) => (
                  <span key={scope} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {scope}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                <span>Created {formatDate(key.createdAt)}</span>
                {key.lastUsedAt && <span>Last used {formatRelativeDate(key.lastUsedAt)}</span>}
                {key.expiresAt && (
                  <span className={new Date(key.expiresAt) < new Date() ? 'text-red-500' : ''}>
                    {new Date(key.expiresAt) < new Date() ? 'Expired' : 'Expires'} {formatDate(key.expiresAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateKeyModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={!!revokeId}
        onClose={() => setRevokeId(null)}
        onConfirm={() => revokeId && revokeMutation.mutate(revokeId)}
        loading={revokeMutation.isPending}
        title="Revoke this API key?"
        description="Any applications using this key will immediately lose access. This cannot be undone."
        confirmLabel="Revoke Key"
      />
    </div>
  );
}
