'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, AlertTriangle, FileText, Clock, Wrench, MessageSquare, DollarSign, ArrowRight, Activity, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface KpiData {
  occupancyPct: string;
  occupiedUnits: number;
  totalUnits: number;
  rentOutstanding: string;
  overdueInvoicesCount: number;
  amcOutstanding: string;
  amcOverdueCount: number;
  activeLeases: number;
  expiringIn30: number;
  openWorkOrders: number;
  unassignedWorkOrders: number;
  openServiceRequests: number;
  securityDepositOutstanding: string;
  sdPendingCount: number;
  totalRevenue: string;
  collectionRate: string;
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl border bg-secondary/40 animate-pulse p-5 ${className ?? ''}`}>
      <div className="w-10 h-10 rounded-xl bg-secondary mb-4" />
      <div className="h-3 w-20 bg-secondary rounded mb-3" />
      <div className="h-8 w-24 bg-secondary rounded mb-2" />
      <div className="h-3 w-32 bg-secondary rounded" />
    </div>
  );
}

export default function KpiBentoGrid() {
  const supabase = createClient();
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { assignedProjectIds, authLoading } = useAuth();

  // Use a ref so the realtime channel always calls the latest version of fetchKpis
  const fetchKpisRef = React.useRef<() => void>(() => {});

  async function fetchKpis() {
    // Wait for auth context to finish loading before fetching
    if (authLoading) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const in30Days = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

      // Determine unit IDs scoped to assigned projects (for staff users)
      let scopedUnitIds: string[] | null = null;
      if (assignedProjectIds !== null) {
        if (assignedProjectIds.length === 0) {
          // No assigned projects — show zeros
          setData({
            occupancyPct: '0.0%', occupiedUnits: 0, totalUnits: 0,
            rentOutstanding: 'AED 0', overdueInvoicesCount: 0,
            amcOutstanding: 'AED 0', amcOverdueCount: 0,
            activeLeases: 0, expiringIn30: 0,
            openWorkOrders: 0, unassignedWorkOrders: 0,
            openServiceRequests: 0,
            securityDepositOutstanding: 'AED 0', sdPendingCount: 0,
            totalRevenue: 'AED 0', collectionRate: '0%',
          });
          setLoading(false);
          return;
        }
        // Get buildings for assigned projects
        const { data: buildings } = await supabase.from('buildings').select('id').in('project_id', assignedProjectIds);
        const buildingIds = (buildings || []).map((b: any) => b.id);
        if (buildingIds.length > 0) {
          const { data: floors } = await supabase.from('floors').select('id').in('building_id', buildingIds);
          const floorIds = (floors || []).map((f: any) => f.id);
          if (floorIds.length > 0) {
            const { data: units } = await supabase.from('units').select('id').in('floor_id', floorIds);
            scopedUnitIds = (units || []).map((u: any) => u.id);
          } else {
            scopedUnitIds = [];
          }
        } else {
          scopedUnitIds = [];
        }
      }

      // Build queries scoped to assigned units/projects
      let unitsQuery = supabase.from('units').select('id, status');
      let leasesQuery = supabase.from('leases').select('id, status, end_date, security_deposit, unit_id');
      let invoicesQuery = supabase.from('invoices').select('id, invoice_type, status, total_amount, due_date');
      let workOrdersQuery = supabase.from('work_orders').select('id, status, provider_id');
      let serviceReqQuery = supabase.from('service_requests').select('id, status');

      if (scopedUnitIds !== null) {
        if (scopedUnitIds.length === 0) {
          setData({
            occupancyPct: '0.0%', occupiedUnits: 0, totalUnits: 0,
            rentOutstanding: 'AED 0', overdueInvoicesCount: 0,
            amcOutstanding: 'AED 0', amcOverdueCount: 0,
            activeLeases: 0, expiringIn30: 0,
            openWorkOrders: 0, unassignedWorkOrders: 0,
            openServiceRequests: 0,
            securityDepositOutstanding: 'AED 0', sdPendingCount: 0,
            totalRevenue: 'AED 0', collectionRate: '0%',
          });
          setLoading(false);
          return;
        }
        unitsQuery = unitsQuery.in('id', scopedUnitIds);
        leasesQuery = leasesQuery.in('unit_id', scopedUnitIds);
        invoicesQuery = invoicesQuery.in('unit_id', scopedUnitIds);
        serviceReqQuery = serviceReqQuery.in('unit_id', scopedUnitIds);
        // Work orders: filter by project_id if assigned
        if (assignedProjectIds && assignedProjectIds.length > 0) {
          workOrdersQuery = workOrdersQuery.in('project_id', assignedProjectIds);
        }
      }

      const [unitsRes, leasesRes, invoicesRes, workOrdersRes, serviceReqRes] = await Promise.all([
        unitsQuery,
        leasesQuery,
        invoicesQuery,
        workOrdersQuery,
        serviceReqQuery,
      ]);

      const units = unitsRes.data || [];
      const leases = leasesRes.data || [];
      const invoices = invoicesRes.data || [];
      const workOrders = workOrdersRes.data || [];
      const serviceReqs = serviceReqRes.data || [];

      const totalUnits = units.length;
      // Derive occupied units from active leases (unit_id set), not units.status
      // (units.status may not be kept in sync when leases are created)
      const activeLeaseUnitIds = new Set(
        leases.filter((l) => l.status === 'active').map((l: any) => l.unit_id).filter(Boolean)
      );
      const occupiedUnits = activeLeaseUnitIds.size;
      const occupancyPct = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0.0';

      const activeLeases = leases.filter((l) => l.status === 'active').length;
      const expiringIn30 = leases.filter(
        (l) => l.status === 'active' && l.end_date >= today && l.end_date <= in30Days
      ).length;

      const rentInvoices = invoices.filter((i) => i.invoice_type === 'rent');
      const overdueRent = rentInvoices.filter((i) => {
        if (i.status === 'overdue') return true;
        if (['paid', 'cancelled'].includes(i.status)) return false;
        return i.due_date && i.due_date < today;
      });
      const rentOutstandingAmt = overdueRent.reduce((s, i) => s + Number(i.total_amount || 0), 0);

      const amcInvoices = invoices.filter((i) => i.invoice_type === 'amc' || i.invoice_type === 'other');
      const overdueAmc = amcInvoices.filter((i) => {
        if (i.status === 'overdue') return true;
        if (['paid', 'cancelled'].includes(i.status)) return false;
        return i.due_date && i.due_date < today;
      });
      const amcOutstandingAmt = overdueAmc.reduce((s, i) => s + Number(i.total_amount || 0), 0);

      const paidInvoices = invoices.filter((i) => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
      const totalInvoiced = invoices.filter((i) => i.status !== 'draft' && i.status !== 'cancelled')
        .reduce((s, i) => s + Number(i.total_amount || 0), 0);
      const collectionRate = totalInvoiced > 0 ? ((totalRevenue / totalInvoiced) * 100).toFixed(0) : '0';

      const openWorkOrders = workOrders.filter((w) => !['completed', 'cancelled'].includes(w.status));
      const unassignedWO = openWorkOrders.filter((w) => !w.provider_id);
      const openSR = serviceReqs.filter((s) => !['closed', 'resolved'].includes(s.status));

      const sdOutstanding = leases.filter((l) => l.status === 'active')
        .reduce((s, l) => s + Number(l.security_deposit || 0), 0);
      const sdPendingCount = leases.filter((l) => l.status === 'active' && Number(l.security_deposit || 0) > 0).length;

      const fmt = (n: number) => n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `AED ${(n / 1000).toFixed(0)}K` : `AED ${n.toLocaleString()}`;

      setData({
        occupancyPct: `${occupancyPct}%`,
        occupiedUnits,
        totalUnits,
        rentOutstanding: fmt(rentOutstandingAmt),
        overdueInvoicesCount: overdueRent.length,
        amcOutstanding: fmt(amcOutstandingAmt),
        amcOverdueCount: overdueAmc.length,
        activeLeases,
        expiringIn30,
        openWorkOrders: openWorkOrders.length,
        unassignedWorkOrders: unassignedWO.length,
        openServiceRequests: openSR.length,
        securityDepositOutstanding: fmt(sdOutstanding),
        sdPendingCount,
        totalRevenue: fmt(totalRevenue),
        collectionRate: `${collectionRate}%`,
      });
    } catch (e) {
      console.error('KPI fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  // Keep ref always pointing to latest fetchKpis (captures current assignedProjectIds/authLoading)
  useEffect(() => {
    fetchKpisRef.current = fetchKpis;
  });

  useEffect(() => {
    fetchKpis();
    // Use ref-based callback so realtime always calls the latest fetch function
    const channel = supabase.channel('kpi-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => fetchKpisRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, () => fetchKpisRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchKpisRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => fetchKpisRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => fetchKpisRef.current())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [assignedProjectIds, authLoading]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <SkeletonCard className="col-span-2 row-span-1" />
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const occupancyNum = parseFloat(data.occupancyPct);
  const occupancyColor = occupancyNum >= 85 ? '#22c55e' : occupancyNum >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">

      {/* Hero: Occupancy — spans 2 cols */}
      <div className="col-span-2 rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4 sm:p-6 text-white relative overflow-hidden shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div>
              <p className="text-[10px] sm:text-[11px] font-600 uppercase tracking-widest text-white/50 mb-1">{t?.kpi_portfolio_occupancy}</p>
              <p className="text-[32px] sm:text-[42px] font-800 leading-none tabular-nums" style={{ color: occupancyColor }}>{data.occupancyPct}</p>
              <p className="text-[12px] sm:text-[13px] text-white/60 mt-1">{data.occupiedUnits} of {data.totalUnits} {t?.kpi_units_occupied}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(occupancyNum, 100)}%`, backgroundColor: occupancyColor }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-white/40">0%</span>
            <Link href="/property-management" className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors">
              {t?.kpi_view_properties} <ArrowRight size={10} />
            </Link>
            <span className="text-[11px] text-white/40">100%</span>
          </div>
        </div>
      </div>

      {/* Revenue Collected */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{data.collectionRate}</span>
        </div>
        <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-1">{t?.kpi_revenue_collected}</p>
        <p className="text-[22px] font-800 text-foreground tabular-nums leading-tight">{data.totalRevenue}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{t?.kpi_collection_rate}</p>
      </div>

      {/* Active Leases */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText size={18} className="text-blue-600" />
          </div>
          {data.expiringIn30 > 0 && (
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{data.expiringIn30} {t?.kpi_expiring_label}</span>
          )}
        </div>
        <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-1">{t?.kpi_active_leases}</p>
        <p className="text-[22px] font-800 text-foreground tabular-nums leading-tight">{data.activeLeases}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {data.expiringIn30 > 0 ? `${data.expiringIn30} ${t?.kpi_expire_30}` : t?.kpi_all_current}
        </p>
      </div>

      {/* Rent Outstanding */}
      <div className={`rounded-2xl border p-5 shadow-card hover:shadow-card-hover transition-all duration-200 ${data.overdueInvoicesCount > 0 ? 'border-red-200 bg-red-50' : 'border-border bg-white'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.overdueInvoicesCount > 0 ? 'bg-red-100' : 'bg-secondary'}`}>
            <AlertTriangle size={18} className={data.overdueInvoicesCount > 0 ? 'text-red-600' : 'text-muted-foreground'} />
          </div>
          {data.overdueInvoicesCount > 0 && (
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t?.kpi_action_needed}</span>
          )}
        </div>
        <p className={`text-[11px] font-600 uppercase tracking-wider mb-1 ${data.overdueInvoicesCount > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>{t?.kpi_rent_outstanding}</p>
        <p className={`text-[22px] font-800 tabular-nums leading-tight ${data.overdueInvoicesCount > 0 ? 'text-red-800' : 'text-foreground'}`}>{data.rentOutstanding}</p>
        <p className={`text-[11px] mt-1 ${data.overdueInvoicesCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
          {data.overdueInvoicesCount} {data.overdueInvoicesCount !== 1 ? t?.kpi_invoices_overdue : t?.kpi_invoice_overdue_single}
        </p>
      </div>

      {/* AMC Outstanding */}
      <div className={`rounded-2xl border p-5 shadow-card hover:shadow-card-hover transition-all duration-200 ${data.amcOverdueCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-border bg-white'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.amcOverdueCount > 0 ? 'bg-amber-100' : 'bg-secondary'}`}>
            <Activity size={18} className={data.amcOverdueCount > 0 ? 'text-amber-700' : 'text-muted-foreground'} />
          </div>
        </div>
        <p className={`text-[11px] font-600 uppercase tracking-wider mb-1 ${data.amcOverdueCount > 0 ? 'text-amber-800' : 'text-muted-foreground'}`}>{t?.kpi_amc_outstanding}</p>
        <p className={`text-[22px] font-800 tabular-nums leading-tight ${data.amcOverdueCount > 0 ? 'text-amber-900' : 'text-foreground'}`}>{data.amcOutstanding}</p>
        <p className={`text-[11px] mt-1 ${data.amcOverdueCount > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>{data.amcOverdueCount} {t?.kpi_overdue}</p>
      </div>

      {/* Work Orders */}
      <div className={`rounded-2xl border p-5 shadow-card hover:shadow-card-hover transition-all duration-200 ${data.openWorkOrders > 0 ? 'border-orange-200 bg-orange-50' : 'border-border bg-white'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.openWorkOrders > 0 ? 'bg-orange-100' : 'bg-secondary'}`}>
            <Wrench size={18} className={data.openWorkOrders > 0 ? 'text-orange-600' : 'text-muted-foreground'} />
          </div>
          {data.unassignedWorkOrders > 0 && (
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{data.unassignedWorkOrders} {t?.kpi_unassigned}</span>
          )}
        </div>
        <p className={`text-[11px] font-600 uppercase tracking-wider mb-1 ${data.openWorkOrders > 0 ? 'text-orange-800' : 'text-muted-foreground'}`}>{t?.kpi_work_orders}</p>
        <p className={`text-[22px] font-800 tabular-nums leading-tight ${data.openWorkOrders > 0 ? 'text-orange-900' : 'text-foreground'}`}>{data.openWorkOrders}</p>
        <p className={`text-[11px] mt-1 ${data.openWorkOrders > 0 ? 'text-orange-700' : 'text-muted-foreground'}`}>
          {data.openWorkOrders === 0 ? t?.kpi_all_resolved : `${data.unassignedWorkOrders} ${t?.kpi_need_assignment}`}
        </p>
      </div>

      {/* Service Requests */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <MessageSquare size={18} className="text-violet-600" />
          </div>
        </div>
        <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-1">{t?.kpi_service_requests}</p>
        <p className="text-[22px] font-800 text-foreground tabular-nums leading-tight">{data.openServiceRequests}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{data.openServiceRequests === 0 ? t?.kpi_all_resolved : t?.kpi_pending_resolution}</p>
      </div>

      {/* Security Deposit */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <BarChart2 size={18} className="text-teal-600" />
          </div>
        </div>
        <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-1">{t?.kpi_security_deposits}</p>
        <p className="text-[22px] font-800 text-foreground tabular-nums leading-tight">{data.securityDepositOutstanding}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{data.sdPendingCount} {t?.kpi_active_leases_count}</p>
      </div>

      {/* Expiring Leases */}
      <div className={`rounded-2xl border p-5 shadow-card hover:shadow-card-hover transition-all duration-200 ${data.expiringIn30 > 0 ? 'border-amber-200 bg-amber-50' : 'border-border bg-white'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.expiringIn30 > 0 ? 'bg-amber-100' : 'bg-secondary'}`}>
            <Clock size={18} className={data.expiringIn30 > 0 ? 'text-amber-700' : 'text-muted-foreground'} />
          </div>
          {data.expiringIn30 > 0 && (
            <Link href="/lease-renewals" className="text-[10px] font-600 text-amber-700 hover:underline flex items-center gap-0.5">
              {t?.kpi_renew} <ArrowRight size={9} />
            </Link>
          )}
        </div>
        <p className={`text-[11px] font-600 uppercase tracking-wider mb-1 ${data.expiringIn30 > 0 ? 'text-amber-800' : 'text-muted-foreground'}`}>{t?.kpi_expiring_30_days}</p>
        <p className={`text-[22px] font-800 tabular-nums leading-tight ${data.expiringIn30 > 0 ? 'text-amber-900' : 'text-foreground'}`}>{data.expiringIn30}</p>
        <p className={`text-[11px] mt-1 ${data.expiringIn30 > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
          {data.expiringIn30 === 0 ? t?.kpi_no_expiring : t?.kpi_require_renewal}
        </p>
      </div>

    </div>
  );
}