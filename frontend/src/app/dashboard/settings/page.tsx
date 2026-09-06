'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/utils';
import { Button, Input, Textarea, ConfirmDialog, toast } from '@/components/ui';
import { User, Lock, Trash2, Shield, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  bio: z.string().max(500).optional().or(z.literal('')),
  timezone: z.string(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number')
    .regex(/[^A-Za-z0-9]/, 'Include a special character'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match',
}).refine((d) => d.currentPassword !== d.newPassword, {
  path: ['newPassword'], message: 'New password must differ from current',
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { user, updateUser, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────
  // Profile form
  // ─────────────────────────────────────────────
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.firstName ?? '',
      bio: '',
      timezone: 'UTC',
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.getProfile().then((r) => r.data.data),
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name ?? '',
        bio: profile.bio ?? '',
        timezone: profile.timezone ?? 'UTC',
      });
    }
  }, [profile, profileForm]);

  const profileMutation = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (res) => {
      const updated = res.data.data;
      updateUser({ firstName: updated.name });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  // ─────────────────────────────────────────────
  // Password form
  // ─────────────────────────────────────────────
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const passwordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success('Password changed. Please log in again.');
      passwordForm.reset();
      setTimeout(() => { clearAuth(); window.location.href = '/login'; }, 2000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change password';
      passwordForm.setError('currentPassword', { message: msg });
    },
  });

  // ─────────────────────────────────────────────
  // Delete account
  // ─────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: usersApi.deleteAccount,
    onSuccess: () => {
      clearAuth();
      toast.success('Account deleted');
      window.location.href = '/';
    },
    onError: () => toast.error('Failed to delete account'),
  });

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="hidden sm:flex flex-col gap-1 w-44 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors',
                activeTab === id
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                id === 'danger' && activeTab !== 'danger' && 'text-red-500 hover:bg-red-50 hover:text-red-700',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Mobile tab bar */}
        <div className="sm:hidden flex gap-1 mb-4 w-full">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 py-2 text-xs font-semibold rounded-lg border',
                activeTab === id ? 'bg-brand-600 text-white border-brand-600' : 'border-border text-gray-600',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ── Profile ── */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-5 pb-4 border-b border-border">
                Profile Information
              </h2>
              <form
                onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))}
                className="space-y-4"
              >
                {/* Avatar placeholder */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-2xl font-bold">
                    {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user?.firstName}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                    <span className="mt-1 inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Name"
                    error={profileForm.formState.errors.name?.message}
                    {...profileForm.register('name')}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Bio</label>
                  <textarea
                    rows={3}
                    placeholder="A short bio about yourself"
                    className="input resize-none"
                    {...profileForm.register('bio')}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Timezone</label>
                  <select className="input" {...profileForm.register('timezone')}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" loading={profileMutation.isPending} icon={<Save className="h-4 w-4" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-5 pb-4 border-b border-border flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand-600" /> Change Password
              </h2>
              <form
                onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))}
                className="space-y-4"
              >
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  error={passwordForm.formState.errors.currentPassword?.message}
                  {...passwordForm.register('currentPassword')}
                />
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  error={passwordForm.formState.errors.newPassword?.message}
                  {...passwordForm.register('newPassword')}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  error={passwordForm.formState.errors.confirmPassword?.message}
                  {...passwordForm.register('confirmPassword')}
                />
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Changing your password will sign you out of all devices.
                </p>
                <div className="flex justify-end">
                  <Button type="submit" loading={passwordMutation.isPending}>
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Danger Zone ── */}
          {activeTab === 'danger' && (
            <div className="card border-red-200">
              <h2 className="text-base font-semibold text-red-700 mb-5 pb-4 border-b border-red-100 flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Danger Zone
              </h2>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Delete your account</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Permanently delete your account and all links, analytics, and QR codes.
                    This action <strong>cannot be undone</strong>.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)} className="shrink-0">
                  Delete Account
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete your account?"
        description="All your links, analytics data, QR codes, and collections will be permanently deleted. This cannot be undone."
        confirmLabel="Yes, delete my account"
      />
    </div>
  );
}
