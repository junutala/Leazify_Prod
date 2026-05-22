'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '@/contexts/DataRefreshContext';

interface UsePageDataOptions<T> {
  /** Unique key for this data source */
  key: string;
  /** Async function that returns the data */
  fetcher: () => Promise<T>;
  /** Initial/default value */
  initialData?: T;
  /** Whether to skip fetching (e.g. waiting for auth) */
  skip?: boolean;
}

interface UsePageDataResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * A unified data-fetching hook that:
 * - Fetches on mount
 * - Refetches on route change (via DataRefreshContext)
 * - Exposes loading/error states
 * - Deduplicates concurrent requests
 */
export function usePageData<T>({
  key,
  fetcher,
  initialData,
  skip = false,
}: UsePageDataOptions<T>): UsePageDataResult<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const fetch = useCallback(async () => {
    if (skip || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
      console.error(`[usePageData:${key}]`, e);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [key, skip]);

  // Register with global refresh system
  useAutoRefresh(key, fetch);

  // Fetch on mount and when skip changes
  useEffect(() => {
    if (!skip) {
      fetch();
    }
  }, [skip, fetch]);

  return { data, loading, error, refetch: fetch };
}
