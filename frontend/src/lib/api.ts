import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Token storage (memory-first for security)
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// ─────────────────────────────────────────────
// Request interceptor — attach token
// ─────────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────────
// Response interceptor — auto-refresh token
// ─────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);


// ──────────────────────────────────────────────
// Refresh Token Handling
// ──────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {

    refreshPromise = axios
      .post(`${BASE_URL}/api/v1/auth/refresh`, {}, {
        withCredentials: true,
      })
      .then((res) => {
        const { user, accessToken } = res.data;
        useAuthStore.getState().setAuth(user, accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}


// ─────────────────────────────────────────────
// Typed API Methods
// ─────────────────────────────────────────────

// Auth
export const authApi = {
  register: (
    data:
      {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string
      }
  ) => api.post('/v1/auth/register', data),
  verifyOtp: (
    data: VerifyOtp
  ) => api.post('/v1/otp/verify', data),
  login: (
    data: {
      email: string;
      password: string;
      rememberMe?: boolean
    }
  ) => api.post('/v1/auth/login', data),

  logout: () => api.post('/v1/auth/logout'),

  refresh: () => api.post('/v1/auth/refresh'),

  me: () => api.get('/v1/auth/test-cookie'),

  verifyEmail: (data: ResendOtp) => api.get(`/v1/otp/verify/${data}`),

  resendOtp: (data: ResendOtp) => api.post('/v1/otp/resend', data),

  forgotPassword: (email: string) => api.post('/v1/auth/forgot-password', { email }),

  resetPassword: (
    data: {
      token: string;
      password: string;
      confirmPassword: string
    }
  ) => api.post('/v1/auth/reset-password', data),

  changePassword: (
    data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string
    }
  ) => api.patch('/v1/auth/change-password', data),
};

// Links
export const linksApi = {

  create: (data: CreateLinkPayload) => api.post('/v1/link/create', data),

  getAll: (params?: GetLinksParams) => api.get('/v1/link', { params }),

  getById: (id: string) => api.get(`/v1/link/${id}`),

  update: (id: string, data: Partial<CreateLinkPayload>) => api.patch(`/v1/link/${id}`, data),

  delete: (id: string) => api.delete(`/v1/link/${id}`),

  toggle: (id: string) => api.patch(`/v1/link/${id}/toggle`),

  checkAlias: (alias: string) => api.get(`/v1/link/check-alias/${alias}`),

  setRules: (id: string, rules: RedirectRule[]) => api.put(`/v1/link/${id}/rules`, { rules }),

  createAbTest: (id: string, data: AbTestPayload) => api.post(`/v1/link/${id}/ab-test`, data),

  bulkCreate: (links: BulkLinkItem[]) => api.post('/v1/link/bulk', { links }),

  getBulkJob: (jobId: string) => api.get(`/v1/link/bulk/jobs/${jobId}`),
};

// Analytics
export const analyticsApi = {
  dashboard: () => api.get('/v1/analytics/dashboard'),

  summary: (
    linkId: string,
    period = '7d'
  ) => api.get(`/v1/analytics/${linkId}/summary`, { params: { period } }),

  timeSeries: (
    linkId: string,
    period = '7d',
    granularity = 'day'
  ) => api.get(`/v1/analytics/${linkId}/timeseries`,
    {
      params: { period, granularity }
    }
  ),

  geo: (
    linkId: string,
    period = '7d') =>
    api.get(`/v1/analytics/${linkId}/geo`, { params: { period } }),

  devices: (linkId: string, period = '7d') => api.get(`/v1/analytics/${linkId}/devices`, { params: { period } }),
  browsers: (linkId: string, period = '7d') => api.get(`/v1/analytics/${linkId}/browsers`, { params: { period } }),
  os: (linkId: string, period = '7d') => api.get(`/v1/analytics/${linkId}/os`, { params: { period } }),
  referrers: (linkId: string, period = '7d') => api.get(`/v1/analytics/${linkId}/referrers`, { params: { period } }),
  realtime: (linkId: string) => api.get(`/v1/analytics/${linkId}/realtime`),
  exportCsv: (linkId: string, period = '30d') =>
    api.get(`/v1/analytics/${linkId}/export`, { params: { period }, responseType: 'blob' }),
};

// QR Codes
export const qrApi = {
  generate: (linkId: string, options?: QrOptions) => api.post(`/qr/${linkId}/generate`, options),
  get: (linkId: string) => api.get(`/qr/${linkId}`),
  branded: (linkId: string, options: QrOptions & { logoUrl?: string }) =>
    api.post(`/qr/${linkId}/branded`, options),
  downloadUrl: (shortCode: string, format: 'png' | 'svg' = 'png') =>
    `${BASE_URL}/api/qr/download/${shortCode}?format=${format}`,
};

// Users
export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: ProfileUpdatePayload) => api.patch('/users/profile', data),
  createApiKey: (data: { name: string; scopes: string[]; expiresAt?: string }) =>
    api.post('/users/api-keys', data),
  listApiKeys: () => api.get('/users/api-keys'),
  revokeApiKey: (keyId: string) => api.delete(`/users/api-keys/${keyId}`),
  getCollections: () => api.get('/users/collections'),
  createCollection: (data: { name: string; description?: string; color?: string }) =>
    api.post('/users/collections', data),
  deleteCollection: (id: string) => api.delete(`/users/collections/${id}`),
  addToCollection: (collectionId: string, linkId: string) =>
    api.post(`/users/collections/${collectionId}/links/${linkId}`),
  deleteAccount: () => api.delete('/users/account'),
};

// Subscription
export const subscriptionApi = {
  getPlans: () => api.get('/v1/subscription/plans'),
  getCurrentPlan: () => api.get('/v1/subscription/current'),
  buyPlan: (planId: string) => api.post(`/v1/subscription/buy/${planId}`),
  upgradePlan: (planId: string) => api.post(`/v1/subscription/upgrade/${planId}`),
  downgradePlan: (planId: string) => api.post(`/v1/subscription/downgrade/${planId}`),
  cancelSubscription: () => api.post('/v1/subscription/cancel'),
  reactivateSubscription: () => api.post('/v1/subscription/reactivate'),
  getBillingHistory: () => api.get('/v1/subscription/billing-history'),
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export enum OtpPurpose {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET"
}

interface VerifyOtp {
  verificationId: string;
  requestId: string;
  purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  otp: string
}

export interface ResendOtp {
  requestId: string,
  verificationId: string,
  purpose: OtpPurpose

}

export interface CreateLinkPayload {
  longUrl: string;
  customAlias?: string;
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: string;
  maxClicks?: number;
  redirectType?: 'TEMPORARY' | 'PERMANENT';
  tags?: Array<{ name: string; color: string }>;
}

export interface GetLinksParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tag?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RedirectRule {
  conditionType: 'DEVICE' | 'GEO' | 'LANGUAGE' | 'TIME_OF_DAY' | 'DAY_OF_WEEK';
  conditionValue: string;
  targetUrl: string;
  label?: string;
  priority?: number;
  isActive?: boolean;
}

export interface AbTestPayload {
  name: string;
  variants: Array<{ name: string; url: string; weight: number }>;
}

export interface BulkLinkItem {
  longUrl: string;
  customAlias?: string;
  title?: string;
  expiresAt?: string;
  tags?: string[];
}

export interface QrOptions {
  foreground?: string;
  background?: string;
  errorLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
}

export interface ProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  timezone?: string;
}

export interface LinkData {
  id: string;
  shortCode: string;
  shortUrl: string;
  longUrl: string;
  title?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  clickCount: number;
  maxClicks?: number;
  isPasswordProtected: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ id: string; name: string; color: string }>;
  qrCode?: { pngUrl?: string; svgData?: string } | null;
}

export default api;
