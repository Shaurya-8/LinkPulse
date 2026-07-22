import { FeatureKey } from "../../../generated/prisma/enums";

export interface FeatureRequest {
    featurekey: FeatureKey;
    amount: number;
}


export interface CreateLinks {
    id: string;
    shortCode: string;
    customAlias: string | null;
    longUrl: string;
    normalizedUrl: string;
    isOneTime: boolean;
    title: string | null;
    description: string | null;
    faviconUrl: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    passwordHash: string | null;
    totalClicks: number;
    clickLimit: number;
    userId: string;
}

export interface GetLinksParams {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    tag?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export interface LinkWithMeta {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  title?: string | null;
  description?: string | null;
  status: string;
  clickCount: number;
  maxClicks?: number | null;
  isPasswordProtected: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{ id: string; name: string; color: string }>;
  qrCode?: {
    pngUrl?: string | null;
    svgData?: string | null;
  } | null;
}


// ─────────────────────────────────────────────
// API Response
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
