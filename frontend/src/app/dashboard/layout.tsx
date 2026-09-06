'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { ToastContainer, toast } from '@/components/ui';
import {
  LayoutDashboard, Link2, BarChart3, Settings, KeyRound,
  FolderOpen, LogOut, Sparkles, Menu, X, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/links', label: 'My Links', icon: Link2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/collections', label: 'Collections', icon: FolderOpen },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      toast.success('Signed out');
      window.location.href = '/login';
    },
  });

  return (
    <aside className={cn(
      'flex h-full flex-col bg-white border-r border-border',
      mobile ? 'w-72' : 'w-64',
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
            <Link2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-gray-900">LinkPulse</span>
        </Link>
        {mobile && (
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Premium banner */}
      {user?.role === 'FREE' && (
        <div className="mx-3 mt-3 rounded-lg bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            <span className="text-xs font-semibold text-brand-700">Upgrade to Premium</span>
          </div>
          <p className="text-xs text-gray-600">Unlock A/B testing, smart routing & real-time analytics.</p>
          <Link href="/dashboard/settings?tab=billing" className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
            Upgrade now <ChevronRight className="inline h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-600' : 'text-gray-400')} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-bold shrink-0">
            {user?.firstName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {user?.firstName ?? user?.username}
            </p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="btn-ghost p-1.5 text-gray-400 hover:text-red-500"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (initialized && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-white px-4 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn-ghost p-2 -ml-2"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <Link2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">LinkPulse</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
