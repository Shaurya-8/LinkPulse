import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OtpPurpose, setAccessToken } from './api';

// ─────────────────────────────────────────────
// Tailwind Class Merge
// ─────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────
// Auth Store (Zustand)
// ─────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'FREE' | 'ADMIN';
  planType: 'FREE' | 'PREMIUM' | 'ADMIN';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean
  initialized: boolean

  verificationId: string | null;
  requestId: string | null; // registerId / resetId / loginId
  purpose: OtpPurpose | null;

  setVerification: (data: {
    verificationId: string;
    requestId: string;
    purpose: OtpPurpose
  }) => void;

  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  clearVerification: () => void;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      initialized: false,

      verificationId: null,
      requestId: null,
      purpose: null,

      setLoading: (isLoading: boolean) => set({ isLoading }),
      setInitialized: (initialized: boolean) =>
        set({ initialized }),
      setVerification: ({ verificationId, requestId, purpose }) =>
        set({ verificationId, requestId, purpose }),
      clearVerification: () =>
        set({ verificationId: null, requestId: null, purpose: null }),

      setAuth: (user, token) => {
        setAccessToken(token);
        set({
          user, accessToken: token, isAuthenticated: true,
          verificationId: null, requestId: null, purpose: null

        });
      },
      clearAuth: () => {
        setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          verificationId: null,
          requestId: null,
          purpose: null,
        });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? {
            ...state.user, ...updates,
          } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Don't persist token (security)
    },
  ),
);

// ─────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function formatDatetime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

// ─────────────────────────────────────────────
// URL Utils
// ─────────────────────────────────────────────

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function truncateUrl(url: string, maxLength = 50): string {
  const domain = extractDomain(url);
  return domain.length > maxLength ? `${domain.slice(0, maxLength)}...` : domain;
}

// ─────────────────────────────────────────────
// Clipboard
// ─────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand('copy');
    document.body.removeChild(el);
    return success;
  }
}

// ─────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'text-green-600 bg-green-50 border-green-200';
    case 'INACTIVE': return 'text-gray-500 bg-gray-50 border-gray-200';
    case 'EXPIRED': return 'text-red-500 bg-red-50 border-red-200';
    default: return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

export function generateRandomColor(): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f59e0b', '#ef4444', '#3b82f6', '#22c55e',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
