import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { linksApi, analyticsApi } from '@/lib/api';
import type { LinkData, GetLinksParams } from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui';

// ─────────────────────────────────────────────
// useDebounce
// ─────────────────────────────────────────────

export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────
// useClipboard
// ─────────────────────────────────────────────

export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    }
    return success;
  }, [timeout]);

  return { copied, copy };
}

// ─────────────────────────────────────────────
// useLinks — paginated link list with filters
// ─────────────────────────────────────────────

export function useLinks(params: GetLinksParams = {}) {
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(params.search ?? '', 400);

  const queryParams = { ...params, search: debouncedSearch || undefined };

  const query = useQuery({
    queryKey: ['links', queryParams],
    queryFn: () => linksApi.getAll(queryParams).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => linksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Link deleted');
    },
    onError: () => toast.error('Failed to delete link'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => linksApi.toggle(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast.success(`Link ${res.data.data?.status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    },
    onError: () => toast.error('Failed to toggle link'),
  });

  return {
    links: (query.data?.data ?? []) as LinkData[],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    deleteLink: deleteMutation.mutate,
    toggleLink: toggleMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleMutation.isPending,
  };
}

// ─────────────────────────────────────────────
// useSingleLink
// ─────────────────────────────────────────────

export function useSingleLink(id: string) {
  return useQuery({
    queryKey: ['link', id],
    queryFn: () => linksApi.getById(id).then((r) => r.data.data as LinkData),
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────
// useAnalytics
// ─────────────────────────────────────────────

export function useAnalytics(linkId: string, period = '7d') {
  const enabled = !!linkId;

  const summary = useQuery({
    queryKey: ['analytics', linkId, 'summary', period],
    queryFn: () => analyticsApi.summary(linkId, period).then((r) => r.data.data),
    enabled,
  });

  const timeSeries = useQuery({
    queryKey: ['analytics', linkId, 'timeseries', period],
    queryFn: () => analyticsApi.timeSeries(linkId, period).then((r) => r.data.data),
    enabled,
  });

  const geo = useQuery({
    queryKey: ['analytics', linkId, 'geo', period],
    queryFn: () => analyticsApi.geo(linkId, period).then((r) => r.data.data),
    enabled,
  });

  const devices = useQuery({
    queryKey: ['analytics', linkId, 'devices', period],
    queryFn: () => analyticsApi.devices(linkId, period).then((r) => r.data.data),
    enabled,
  });

  const browsers = useQuery({
    queryKey: ['analytics', linkId, 'browsers', period],
    queryFn: () => analyticsApi.browsers(linkId, period).then((r) => r.data.data),
    enabled,
  });

  const referrers = useQuery({
    queryKey: ['analytics', linkId, 'referrers', period],
    queryFn: () => analyticsApi.referrers(linkId, period).then((r) => r.data.data),
    enabled,
  });

  const isLoading = summary.isLoading || timeSeries.isLoading;

  return {
    summary: summary.data,
    timeSeries: (timeSeries.data ?? []) as Array<{ date: string; clicks: number; uniqueVisitors: number }>,
    geo: (geo.data ?? []) as Array<{ country: string; countryCode: string | null; clicks: number; percentage: number }>,
    devices: (devices.data ?? []) as Array<{ device: string; clicks: number; percentage: number }>,
    browsers: (browsers.data ?? []) as Array<{ browser: string; clicks: number; percentage: number }>,
    referrers: (referrers.data ?? []) as Array<{ referer: string; clicks: number; percentage: number }>,
    isLoading,
  };
}

// ─────────────────────────────────────────────
// useDashboardStats
// ─────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data.data),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ─────────────────────────────────────────────
// useLocalStorage
// ─────────────────────────────────────────────

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn('useLocalStorage error:', error);
    }
  };

  return [storedValue, setValue] as const;
}

// ─────────────────────────────────────────────
// useMediaQuery
// ─────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
