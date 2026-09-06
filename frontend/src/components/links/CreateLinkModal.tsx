'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { linksApi } from '@/lib/api';
import { useAuthStore } from '@/lib/utils';
import { Modal, Button, Input, Select, toast } from '@/components/ui';
import { Settings2, Tag, Shield, Clock, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  longUrl: z.string().url('Enter a valid URL (include https://)'),
  customAlias: z
    .string()
    .regex(/^[a-zA-Z0-9_-]*$/, 'Letters, numbers, hyphens & underscores only')
    .max(64)
    .optional()
    .or(z.literal('')),
  title: z.string().max(255).optional().or(z.literal('')),
  password: z.string().min(4, 'At least 4 characters').max(100).optional().or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
  maxClicks: z.coerce.number().int().min(1).optional().or(z.literal('')),
  redirectType: z.enum(['TEMPORARY', 'PERMANENT']).default('TEMPORARY'),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (link: unknown) => void;
}

const TABS = [
  { id: 'basic', label: 'Basic', icon: Hash },
  { id: 'advanced', label: 'Advanced', icon: Settings2 },
  { id: 'security', label: 'Security', icon: Shield },
];

export function CreateLinkModal({ open, onClose, onSuccess }: Props) {
  const { user } = useAuthStore();
  const isPremium = user?.role === 'PREMIUM' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  const [aliasChecking, setAliasChecking] = useState(false);
  const [aliasAvailable, setAliasAvailable] = useState<boolean | null>(null);

  const { register, handleSubmit, watch, formState: { errors }, reset, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { redirectType: 'TEMPORARY' },
  });

  const alias = watch('customAlias');

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) =>
      linksApi.create({
        longUrl: data.longUrl,
        customAlias: data.customAlias || undefined,
        title: data.title || undefined,
        password: data.password || undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        maxClicks: data.maxClicks ? Number(data.maxClicks) : undefined,
        redirectType: data.redirectType,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Short link created!');
      reset();
      onSuccess?.(res.data.data);
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create link.';
      if (msg.toLowerCase().includes('alias')) setError('customAlias', { message: msg });
      else setError('root', { message: msg });
    },
  });

  async function checkAlias(alias: string) {
    if (!alias || alias.length < 3) { setAliasAvailable(null); return; }
    setAliasChecking(true);
    try {
      const res = await linksApi.checkAlias(alias);
      setAliasAvailable(res.data.data?.available ?? false);
    } catch { setAliasAvailable(null); }
    finally { setAliasChecking(false); }
  }

  function handleClose() {
    reset();
    setActiveTab('basic');
    setAliasAvailable(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Short Link" size="md">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 -mt-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all',
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4" noValidate>
        {errors.root && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <>
            <Input
              label="Destination URL *"
              type="url"
              placeholder="https://your-long-url.com/page?utm=..."
              error={errors.longUrl?.message}
              {...register('longUrl')}
            />
            <Input
              label="Title (optional)"
              placeholder="e.g. Summer Campaign Link"
              hint="Helps you identify this link later."
              error={errors.title?.message}
              {...register('title')}
            />
            <div>
              <Input
                label="Custom alias (optional)"
                placeholder="my-link"
                hint="Your short URL will be: linksnap.io/my-link"
                error={errors.customAlias?.message}
                {...register('customAlias', {
                  onBlur: (e) => checkAlias(e.target.value),
                })}
              />
              {aliasChecking && <p className="mt-1 text-xs text-gray-400">Checking availability…</p>}
              {aliasAvailable === true && !aliasChecking && alias && (
                <p className="mt-1 text-xs text-green-600">✓ "{alias}" is available</p>
              )}
              {aliasAvailable === false && !aliasChecking && alias && (
                <p className="mt-1 text-xs text-red-500">✗ "{alias}" is already taken</p>
              )}
            </div>
          </>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Expiration date</label>
              <input
                type="datetime-local"
                className="input"
                {...register('expiresAt')}
              />
              <p className="mt-1 text-xs text-gray-500">Link stops working after this date/time.</p>
            </div>
            <Input
              label="Max clicks (one-time: set to 1)"
              type="number"
              placeholder="Unlimited"
              hint="Link deactivates after this many clicks."
              error={errors.maxClicks?.message}
              {...register('maxClicks')}
            />
            <Select
              label="Redirect type"
              options={[
                { value: 'TEMPORARY', label: '302 Temporary (recommended)' },
                { value: 'PERMANENT', label: '301 Permanent (cached by browsers)' },
              ]}
              {...register('redirectType')}
            />
          </>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            {isPremium ? (
              <Input
                label="Password protection"
                type="password"
                placeholder="Leave empty for no password"
                hint="Visitors must enter this password before being redirected."
                error={errors.password?.message}
                leftIcon={<Shield className="h-4 w-4" />}
                {...register('password')}
              />
            ) : (
              <div className="rounded-xl bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 p-5 text-center">
                <Shield className="h-8 w-8 text-brand-400 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 text-sm">Password protection</h3>
                <p className="text-xs text-gray-500 mt-1">Upgrade to Premium to add password protection to your links.</p>
                <a href="/dashboard/settings?tab=billing" className="mt-3 inline-block btn-primary text-xs py-1.5 px-4">
                  Upgrade now
                </a>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-6">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={isPending}>Create Link</Button>
        </div>
      </form>
    </Modal>
  );
}
