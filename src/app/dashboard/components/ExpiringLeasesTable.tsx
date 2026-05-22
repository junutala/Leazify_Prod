'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoRefresh } from '@/contexts/DataRefreshContext';


interface ExpiringLease {
  id: string;
  lease_number: string | null;
  unit_id: string;
  end_date: string;
  rent_amount: number;
  status: string;
  units?: {
    unit_number: string;
    unit_name: string;
    floors?: {
      name: string;
      buildings?: {
        name: string;
        projects?: { name: string };
      };
    };
  };
  persons?: { name: string };
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function UrgencyBadge({ days, daysLeftLabel }: { days: number; daysLeftLabel: string }) {
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-600 rounded-full border border-red-200">
      <AlertTriangle size={9} />
      {days}{daysLeftLabel}
    </span>
  );
  if (days <= 14) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-600 rounded-full border border-amber-200">
      <Clock size={9} />
      {days}{daysLeftLabel}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-600 rounded-full border border-blue-200">
      <Clock size={9} />
      {days}{daysLeftLabel}
    </span>
  );
}

export default function ExpiringLeasesTable() {
  const supabase = createClient();
  const [leases, setLeases] = useState<ExpiringLease[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { assignedProjectIds, authLoading } = useAuth();

  // Keep ref always pointing to latest fetchLeases to avoid stale closure in realtime callback
  const fetchLeasesRef = React.useRef<() => void>(() => {});

  async function fetchLeases() {
    // Wait for auth context to finish loading before fetching
    if (authLoading) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const in30Days = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

      // If staff user with no assigned projects, show nothing
      if (assignedProjectIds !== null && assignedProjectIds.length === 0) {
        setLeases([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('leases')
        .select(`
          id, lease_number, unit_id, end_date, rent_amount, status,
          units(unit_number, unit_name, floors(name, buildings(name, project_id, projects(name)))),
          persons(name)
        `)
        .eq('status', 'active')
        .gte('end_date', today)
        .lte('end_date', in30Days)
        .order('end_date', { ascending: true });

      let leaseList = data || [];

      // Filter by assigned projects for staff users
      if (assignedProjectIds !== null && assignedProjectIds.length > 0) {
        leaseList = leaseList.filter((l: any) => {
          const projectId = l.units?.floors?.buildings?.project_id;
          return projectId && assignedProjectIds.includes(projectId);
        });
      }

      setLeases(leaseList);
    } catch (e) {
      console.error('ExpiringLeases fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  // Keep ref always pointing to latest fetchLeases
  useEffect(() => {
    fetchLeasesRef.current = fetchLeases;
  });

  // Refetch on route change
  useAutoRefresh('expiring-leases', () => fetchLeasesRef.current());

  useEffect(() => {
    fetchLeases();

    const channel = supabase
      .channel('expiring-leases-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, () => fetchLeasesRef.current())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignedProjectIds, authLoading]);

  return (
    <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-600 text-foreground">{t?.elt_title}</h3>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5">
            {loading
              ? t?.elt_subtitle_loading
              : leases.length === 0
              ? t?.elt_subtitle_none
              : `${t?.elt_title} — ${leases.length} ${t?.elt_subtitle_count}`}
          </p>
        </div>
        <Link href="/leasing" className="flex items-center gap-1 text-[12px] text-primary font-500 hover:underline shrink-0">
          {t?.elt_view_all} <ChevronRight size={13} />
        </Link>
      </div>

      {loading ? (
        <div className="p-4 sm:p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`sk-${i}`} className="h-10 bg-secondary/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : leases.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">
          {t?.elt_no_expiring}
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden divide-y divide-border">
            {leases.map((l) => {
              const days = daysUntil(l.end_date);
              const unitLabel = l.units?.unit_name || l.units?.unit_number || '—';
              const buildingLabel = l.units?.floors?.buildings?.name || '—';
              const tenantName = (l.persons as any)?.name || '—';
              const endFormatted = new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div key={l.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-600 text-foreground">{unitLabel}</span>
                    <UrgencyBadge days={days} daysLeftLabel={t?.elt_days_left || 'd left'} />
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">{tenantName} · {buildingLabel}</span>
                    <span className="font-mono font-500 text-foreground tabular-nums">${Number(l.rent_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{endFormatted}</span>
                    <Link href="/lease-renewals" className="text-[11px] font-500 text-primary hover:underline">
                      {t?.elt_renew}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {[t?.elt_col_unit, t?.elt_col_building, t?.elt_col_tenant, t?.elt_col_lease_end, t?.elt_col_urgency, t?.elt_col_rent, ''].map((h, i) => (
                    <th key={`exp-th-${i}`} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leases.map((l) => {
                  const days = daysUntil(l.end_date);
                  const unitLabel = l.units?.unit_name || l.units?.unit_number || '—';
                  const buildingLabel = l.units?.floors?.buildings?.name || '—';
                  const tenantName = (l.persons as any)?.name || '—';
                  const endFormatted = new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  return (
                    <tr key={l.id} className="border-b border-border hover:bg-secondary/30 transition-colors duration-100 group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[12px] font-500 text-foreground">{unitLabel}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{buildingLabel}</td>
                      <td className="px-4 py-3">
                        <span className="font-500 text-foreground">{tenantName}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{endFormatted}</td>
                      <td className="px-4 py-3">
                        <UrgencyBadge days={days} daysLeftLabel={t?.elt_days_left || 'd left'} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-500 text-foreground tabular-nums">
                          ${Number(l.rent_amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href="/lease-renewals"
                          className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 text-[11px] font-500 bg-primary/10 text-primary rounded-md hover:bg-primary/15"
                        >
                          {t?.elt_renew}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}