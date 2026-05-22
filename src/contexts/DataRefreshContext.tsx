'use client';

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type RefreshListener = () => void;

interface DataRefreshContextValue {
  /** Register a listener that will be called when data should be refreshed */
  subscribe: (key: string, listener: RefreshListener) => () => void;
  /** Trigger a refresh for a specific key or all keys */
  refresh: (key?: string) => void;
  /** Trigger a refresh for all registered listeners */
  refreshAll: () => void;
}

const DataRefreshContext = createContext<DataRefreshContextValue>({
  subscribe: () => () => {},
  refresh: () => {},
  refreshAll: () => {},
});

export const useDataRefresh = () => useContext(DataRefreshContext);

// ─── Hook: auto-refresh on mount and route change ─────────────────────────────

/**
 * Use this hook inside any client component that fetches data.
 * It will call `fetchFn` on mount AND whenever the route changes.
 *
 * @param key     - Unique identifier for this data source (e.g. 'leases', 'invoices')
 * @param fetchFn - The async function that loads data
 */
export function useAutoRefresh(key: string, fetchFn: () => void) {
  const { subscribe } = useDataRefresh();
  const fetchRef = useRef(fetchFn);

  // Always keep ref pointing to latest fetchFn
  useEffect(() => {
    fetchRef.current = fetchFn;
  });

  useEffect(() => {
    // Subscribe to global refresh events
    const unsubscribe = subscribe(key, () => fetchRef.current());
    return unsubscribe;
  }, [key, subscribe]);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const listenersRef = useRef<Map<string, Set<RefreshListener>>>(new Map());
  const prevPathRef = useRef<string>(pathname);

  const subscribe = useCallback((key: string, listener: RefreshListener) => {
    if (!listenersRef.current.has(key)) {
      listenersRef.current.set(key, new Set());
    }
    listenersRef.current.get(key)!.add(listener);

    return () => {
      listenersRef.current.get(key)?.delete(listener);
    };
  }, []);

  const refresh = useCallback((key?: string) => {
    if (key) {
      listenersRef.current.get(key)?.forEach((fn) => fn());
    } else {
      listenersRef.current.forEach((listeners) => listeners.forEach((fn) => fn()));
    }
  }, []);

  const refreshAll = useCallback(() => {
    listenersRef.current.forEach((listeners) => listeners.forEach((fn) => fn()));
  }, []);

  // Trigger refresh on route change
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      // Small delay to let the new page mount first
      const timer = setTimeout(() => {
        refreshAll();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pathname, refreshAll]);

  return (
    <DataRefreshContext.Provider value={{ subscribe, refresh, refreshAll }}>
      {children}
    </DataRefreshContext.Provider>
  );
}
