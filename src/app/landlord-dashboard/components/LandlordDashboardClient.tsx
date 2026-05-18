'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, FileText, DollarSign, AlertTriangle, Clock, Wrench, TrendingUp, Home, RefreshCw, ArrowRight, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

interface LandlordMetrics {
  totalUnits: number;
  occupiedUnits: number;
  occupancyPct: string;
  activeLeases: number;
  draftLeases: number;
  expiringIn30: number;
  expiringIn60: number;
  annualRentIncome: number;
  monthlyRentIncome: number;
  totalSecurityDeposit: number;
  openMaintenanceRequests: number;
  overdueInvoices: number;
  overdueAmount: number;
}

interface RecentLease {
  id: string;
  lease_number: string | null;
  status: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  units?: { unit_name: string; unit_number: string; floors?: { name: string; buildings?: { name: string; projects?: { name: string } } } };
  persons?: { name: string };
}

const statusColors: Record<string, string> = {
  active: 'success', expired: 'error', terminated: 'error', pending: 'warning', renewed: 'info', draft: 'default',
};

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  href?: string;
}) {
  const content = (
    <div className={`bg-white rounded-2xl border border-border shadow-card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent || 'bg-primary/10'}`}>
          {icon}
        </div>
        {href && <ArrowRight size={14} className="text-muted-foreground mt-1" />}
      </div>
      <div>
        <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="text-[28px] font-800 text-foreground leading-none tabular-nums">{value}</p>
        {sub && <p className="text-[12px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function fmt(n: number) {
  return n >= 1_000_000
    ? `AED ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
    ? `AED ${(n / 1000).toFixed(0)}K`
    : `AED ${n.toLocaleString()}`;
}

export default function LandlordDashboardClient() {
  const supabase = createClient();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<LandlordMetrics | null>(null);
  const [recentLeases, setRecentLeases] = useState<RecentLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [landlordName, setLandlordName] = useState('');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Get landlord person record linked to this user
      const { data: personData } = await supabase
        .from('persons')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (personData) {
        setLandlordName(personData.name);
      } else {
        // Fallback to user profile name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        setLandlordName(profile?.full_name || user.email || 'Landlord');
      }

      const today = new Date().toISOString().split('T')[0];
      const in30Days = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const in60Days = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0];

      // Get landlord assignments to find their units/properties
      let unitIds: string[] = [];
      let projectIds: string[] = [];

      if (personData) {
        const { data: assignments } = await supabase
          .from('project_landlord_assignments')
          .select('project_id, building_id, floor_id, unit_id')
          .eq('person_id', personData.id);

        if (assignments && assignments.length > 0) {
          // Collect direct unit IDs
          const directUnitIds = assignments.filter((a: any) => a.unit_id).map((a: any) => a.unit_id);
          const directProjectIds = assignments.filter((a: any) => a.project_id).map((a: any) => a.project_id);
          const directBuildingIds = assignments.filter((a: any) => a.building_id).map((a: any) => a.building_id);
          const directFloorIds = assignments.filter((a: any) => a.floor_id).map((a: any) => a.floor_id);

          projectIds = [...new Set(directProjectIds)];

          // Resolve units from projects
          if (directProjectIds.length > 0) {
            const { data: bldgs } = await supabase.from('buildings').select('id').in('project_id', directProjectIds);
            const bldgIds = (bldgs || []).map((b: any) => b.id);
            if (bldgIds.length > 0) {
              const { data: flrs } = await supabase.from('floors').select('id').in('building_id', bldgIds);
              const flrIds = (flrs || []).map((f: any) => f.id);
              if (flrIds.length > 0) {
                const { data: us } = await supabase.from('units').select('id').in('floor_id', flrIds);
                unitIds.push(...(us || []).map((u: any) => u.id));
              }
            }
          }

          // Resolve units from buildings
          if (directBuildingIds.length > 0) {
            const { data: flrs } = await supabase.from('floors').select('id').in('building_id', directBuildingIds);
            const flrIds = (flrs || []).map((f: any) => f.id);
            if (flrIds.length > 0) {
              const { data: us } = await supabase.from('units').select('id').in('floor_id', flrIds);
              unitIds.push(...(us || []).map((u: any) => u.id));
            }
          }

          // Resolve units from floors
          if (directFloorIds.length > 0) {
            const { data: us } = await supabase.from('units').select('id').in('floor_id', directFloorIds);
            unitIds.push(...(us || []).map((u: any) => u.id));
          }

          unitIds.push(...directUnitIds);
          unitIds = [...new Set(unitIds)];
        }
      }

      // If no assignments found, show all data (for superadmin/admin landlords)
      const hasScope = unitIds.length > 0 || projectIds.length > 0;

      // Fetch units
      let unitsQuery = supabase.from('units').select('id, status');
      if (hasScope && unitIds.length > 0) unitsQuery = unitsQuery.in('id', unitIds);
      const { data: units } = await unitsQuery;

      // Fetch leases
      let leasesQuery = supabase.from('leases').select('id, status, start_date, end_date, rent_amount, security_deposit, unit_id, lease_number, lessee_person_id, units(unit_name, unit_number, floors(name, buildings(name, projects(name)))), persons(name)').order('created_at', { ascending: false });
      if (hasScope && unitIds.length > 0) leasesQuery = leasesQuery.in('unit_id', unitIds);
      const { data: leases } = await leasesQuery;

      // Fetch invoices
      let invoicesQuery = supabase.from('invoices').select('id, status, total_amount, invoice_type');
      if (hasScope && unitIds.length > 0) invoicesQuery = invoicesQuery.in('unit_id', unitIds);
      const { data: invoices } = await invoicesQuery;

      // Fetch maintenance requests
      let maintQuery = supabase.from('maintenance_requests').select('id, status');
      if (hasScope && projectIds.length > 0) maintQuery = maintQuery.in('project_id', projectIds);
      const { data: maintenance } = await maintQuery;

      const unitList = units || [];
      const leaseList = (leases || []) as RecentLease[];
      const invoiceList = invoices || [];
      const maintList = maintenance || [];

      const totalUnits = unitList.length;
      // Derive occupied units from active leases (not units.status which may be stale)
      const activeLeaseUnitIds = new Set(
        leaseList.filter(l => l.status === 'active').map((l: any) => l.unit_id).filter(Boolean)
      );
      const occupiedUnits = activeLeaseUnitIds.size;
      const occupancyPct = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0.0';

      const activeLeases = leaseList.filter(l => l.status === 'active');
      const draftLeases = leaseList.filter(l => l.status === 'draft').length;
      const expiringIn30 = activeLeases.filter(l => l.end_date >= today && l.end_date <= in30Days).length;
      const expiringIn60 = activeLeases.filter(l => l.end_date >= today && l.end_date <= in60Days).length;

      const annualRentIncome = activeLeases.reduce((s, l) => s + Number(l.rent_amount || 0), 0);
      const monthlyRentIncome = annualRentIncome / 12;
      const totalSecurityDeposit = activeLeases.reduce((s, l) => s + Number((l as any).security_deposit || 0), 0);

      const overdueInvoices = invoiceList.filter((i: any) => i.status === 'overdue');
      const overdueAmount = overdueInvoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);

      const openMaint = maintList.filter((m: any) => !['resolved', 'closed', 'completed'].includes(m.status)).length;

      setMetrics({
        totalUnits,
        occupiedUnits,
        occupancyPct: `${occupancyPct}%`,
        activeLeases: activeLeases.length,
        draftLeases,
        expiringIn30,
        expiringIn60,
        annualRentIncome,
        monthlyRentIncome,
        totalSecurityDeposit,
        openMaintenanceRequests: openMaint,
        overdueInvoices: overdueInvoices.length,
        overdueAmount,
      });

      setRecentLeases(leaseList.slice(0, 8));
    } catch (e) {
      console.error('Landlord dashboard fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 py-6 space-y-6">
        <div className="h-8 w-64 bg-secondary animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 animate-pulse">
              <div className="w-10 h-10 bg-secondary rounded-xl mb-4" />
              <div className="h-3 w-20 bg-secondary rounded mb-2" />
              <div className="h-7 w-16 bg-secondary rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <LoadingSkeleton rows={5} />
        </div>
      </div>
    );
  }

  const m = metrics;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">
            Welcome back{landlordName ? `, ${landlordName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">Your property portfolio overview</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all shrink-0"
        >
          <RefreshCw size={13} /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Hero occupancy card + key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Occupancy — hero card spanning 2 cols */}
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4 sm:p-6 text-white relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div>
                <p className="text-[10px] sm:text-[11px] font-600 uppercase tracking-widest text-white/50 mb-1">Portfolio Occupancy</p>
                <p className="text-[32px] sm:text-[42px] font-800 leading-none tabular-nums" style={{ color: parseFloat(m?.occupancyPct || '0') >= 85 ? '#22c55e' : parseFloat(m?.occupancyPct || '0') >= 65 ? '#f59e0b' : '#ef4444' }}>
                  {m?.occupancyPct || '0%'}
                </p>
                <p className="text-[12px] sm:text-[13px] text-white/60 mt-1">{m?.occupiedUnits} of {m?.totalUnits} units occupied</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Building2 size={20} className="text-white" />
              </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(parseFloat(m?.occupancyPct || '0'), 100)}%`, backgroundColor: parseFloat(m?.occupancyPct || '0') >= 85 ? '#22c55e' : parseFloat(m?.occupancyPct || '0') >= 65 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-white/40">0%</span>
              <Link href="/property-management" className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors">
                View Properties <ArrowRight size={10} />
              </Link>
              <span className="text-[11px] text-white/40">100%</span>
            </div>
          </div>
        </div>

        {/* Annual Rent Income */}
        <MetricCard
          icon={<DollarSign size={18} className="text-emerald-600" />}
          label="Annual Rent Income"
          value={fmt(m?.annualRentIncome || 0)}
          sub={`Monthly: ${fmt(m?.monthlyRentIncome || 0)}`}
          accent="bg-emerald-50"
          href="/leasing"
        />

        {/* Active Leases */}
        <MetricCard
          icon={<FileText size={18} className="text-primary" />}
          label="Active Leases"
          value={m?.activeLeases || 0}
          sub={m?.draftLeases ? `${m.draftLeases} in draft` : 'All finalized'}
          accent="bg-primary/10"
          href="/leasing"
        />

        {/* Expiring Soon */}
        <MetricCard
          icon={<Clock size={18} className={m?.expiringIn30 ? 'text-amber-600' : 'text-muted-foreground'} />}
          label="Expiring in 30 Days"
          value={m?.expiringIn30 || 0}
          sub={`${m?.expiringIn60 || 0} expiring in 60 days`}
          accent={m?.expiringIn30 ? 'bg-amber-50' : 'bg-secondary'}
          href="/lease-renewals"
        />

        {/* Security Deposits */}
        <MetricCard
          icon={<TrendingUp size={18} className="text-indigo-600" />}
          label="Security Deposits Held"
          value={fmt(m?.totalSecurityDeposit || 0)}
          sub="From active leases"
          accent="bg-indigo-50"
        />

        {/* Overdue Invoices */}
        <MetricCard
          icon={<AlertTriangle size={18} className={m?.overdueInvoices ? 'text-destructive' : 'text-muted-foreground'} />}
          label="Overdue Invoices"
          value={m?.overdueInvoices || 0}
          sub={m?.overdueAmount ? `${fmt(m.overdueAmount)} outstanding` : 'All clear'}
          accent={m?.overdueInvoices ? 'bg-destructive/10' : 'bg-secondary'}
          href="/invoicing"
        />

        {/* Maintenance */}
        <MetricCard
          icon={<Wrench size={18} className={m?.openMaintenanceRequests ? 'text-orange-600' : 'text-muted-foreground'} />}
          label="Open Maintenance"
          value={m?.openMaintenanceRequests || 0}
          sub="Requests pending action"
          accent={m?.openMaintenanceRequests ? 'bg-orange-50' : 'bg-secondary'}
          href="/maintenance"
        />
      </div>

      {/* Recent Leases Table */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" />
            <h2 className="text-[14px] font-600 text-foreground">Recent Leases</h2>
          </div>
          <Link href="/leasing" className="flex items-center gap-1 text-[12px] text-primary hover:underline font-500">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {recentLeases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Home size={32} className="text-muted-foreground/40 mb-3" />
            <p className="text-[14px] font-500 text-muted-foreground">No leases found</p>
            <p className="text-[12px] text-muted-foreground/60 mt-1">Leases assigned to your properties will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[700px]">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  {['Lease No.', 'Unit', 'Building', 'Lessee', 'Annual Rent', 'Period', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLeases.map(lease => (
                  <tr key={lease.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] text-primary font-600">{lease.lease_number || '—'}</td>
                    <td className="px-4 py-3 font-500">{lease.units?.unit_name || lease.units?.unit_number || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[12px]">
                      <div>{lease.units?.floors?.buildings?.name || '—'}</div>
                      <div className="text-[11px]">{lease.units?.floors?.name || ''}</div>
                    </td>
                    <td className="px-4 py-3">{lease.persons?.name || '—'}</td>
                    <td className="px-4 py-3 font-600 tabular-nums">AED {Number(lease.rent_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{lease.start_date} → {lease.end_date}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[lease.status] as any || 'default'} size="sm">
                        {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
