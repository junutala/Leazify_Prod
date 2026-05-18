'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Activity, TrendingUp, TrendingDown, Users, DollarSign,
  FileText, Clock, RefreshCw, BarChart2, CheckCircle, XCircle,
} from 'lucide-react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  entity_type: string;
  action: string;
  performed_by_email: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface Invoice {
  id: string;
  status: string;
  amount: number | null;
  due_date: string | null;
  created_at: string;
}

interface Lease {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

interface AnalyticsData {
  auditLogs: AuditLog[];
  invoices: Invoice[];
  leases: Lease[];
  totalUnits: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function getLast6Months(): { key: string; label: string }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-AE', { month: 'short', year: '2-digit' }),
    };
  });
}

const CHART_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon, trend, trendType,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary">
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full ${
            trendType === 'up' ? 'bg-green-50 text-green-700' :
            trendType === 'down'? 'bg-red-50 text-red-600' : 'bg-secondary text-muted-foreground'
          }`}>
            {trendType === 'up' ? <TrendingUp size={10} /> : trendType === 'down' ? <TrendingDown size={10} /> : null}
            {trend}
          </span>
        )}
      </div>
      <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-[28px] font-700 tabular-nums leading-none text-foreground mb-1">{value}</p>
      {sub && <p className="text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[16px] font-700 text-foreground">{title}</h2>
      <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsClient() {
  const supabase = createClient();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [auditRes, invoiceRes, leaseRes, unitRes] = await Promise.all([
        supabase.from('audit_logs').select('id,entity_type,action,performed_by_email,created_at,metadata').order('created_at', { ascending: false }).limit(1000),
        supabase.from('invoices').select('id,status,amount,due_date,created_at'),
        supabase.from('leases').select('id,status,start_date,end_date'),
        supabase.from('units').select('id', { count: 'exact', head: true }),
      ]);

      if (auditRes.error) throw auditRes.error;
      if (invoiceRes.error) throw invoiceRes.error;
      if (leaseRes.error) throw leaseRes.error;

      setData({
        auditLogs: auditRes.data || [],
        invoices: invoiceRes.data || [],
        leases: leaseRes.data || [],
        totalUnits: unitRes.count || 0,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 py-6 space-y-6">
        <LoadingSkeleton rows={3} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 py-6">
        <p className="text-destructive text-[13px]">{error || 'No data available'}</p>
      </div>
    );
  }

  const { auditLogs, invoices, leases, totalUnits } = data;

  // ── 1. User Activity ────────────────────────────────────────────────────────
  const last7Days = getLast7Days();
  const activityByDay = last7Days.map((day) => ({
    day: new Date(day).toLocaleDateString('en-AE', { weekday: 'short', day: 'numeric' }),
    events: auditLogs.filter((l) => l.created_at.slice(0, 10) === day).length,
  }));

  const userEventCounts: Record<string, number> = {};
  auditLogs.forEach((l) => {
    const u = l.performed_by_email || 'System';
    userEventCounts[u] = (userEventCounts[u] || 0) + 1;
  });
  const topUsers = Object.entries(userEventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([email, count]) => ({ email: email.length > 24 ? email.slice(0, 22) + '…' : email, count }));

  const totalEvents = auditLogs.length;
  const todayEvents = auditLogs.filter((l) => l.created_at.slice(0, 10) === last7Days[6]).length;
  const uniqueUsers = Object.keys(userEventCounts).filter((u) => u !== 'System').length;

  // ── 2. Invoice Collection Rates ─────────────────────────────────────────────
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
  const overdueInvoices = invoices.filter((i) => {
    if (i.status === 'paid') return false;
    if (!i.due_date) return false;
    return new Date(i.due_date) < new Date();
  }).length;
  const pendingInvoices = totalInvoices - paidInvoices - overdueInvoices;
  const collectionRate = totalInvoices > 0 ? ((paidInvoices / totalInvoices) * 100).toFixed(1) : '0.0';

  const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const collectedAmount = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);

  const last6Months = getLast6Months();
  const invoicesByMonth = last6Months.map(({ key, label }) => {
    const monthInvoices = invoices.filter((i) => i.created_at?.slice(0, 7) === key);
    const paid = monthInvoices.filter((i) => i.status === 'paid').length;
    const total = monthInvoices.length;
    return { label, paid, total, rate: total > 0 ? Math.round((paid / total) * 100) : 0 };
  });

  const invoiceStatusData = [
    { name: 'Paid', value: paidInvoices, color: '#22c55e' },
    { name: 'Pending', value: pendingInvoices, color: '#f59e0b' },
    { name: 'Overdue', value: overdueInvoices, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  // ── 3. Lease Utilization ────────────────────────────────────────────────────
  const activeLeases = leases.filter((l) => l.status === 'active').length;
  const utilizationRate = totalUnits > 0 ? ((activeLeases / totalUnits) * 100).toFixed(1) : '0.0';
  const expiringSoon = leases.filter((l) => {
    if (l.status !== 'active' || !l.end_date) return false;
    const daysLeft = (new Date(l.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  const leaseStatusCounts: Record<string, number> = {};
  leases.forEach((l) => {
    leaseStatusCounts[l.status] = (leaseStatusCounts[l.status] || 0) + 1;
  });
  const leaseStatusData = Object.entries(leaseStatusCounts).map(([name, value], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const leasesByMonth = last6Months.map(({ key, label }) => ({
    label,
    new: leases.filter((l) => l.start_date?.slice(0, 7) === key).length,
    expired: leases.filter((l) => l.end_date?.slice(0, 7) === key && l.status !== 'active').length,
  }));

  // ── 4. Approval Turnaround Times ────────────────────────────────────────────
  const approvalLogs = auditLogs.filter((l) => l.action === 'approved' || l.action === 'rejected');
  const creationLogs = auditLogs.filter((l) => l.action === 'created' || l.action === 'generated');

  // Pair approvals with their creation events by entity_id
  const turnaroundTimes: number[] = [];
  approvalLogs.forEach((approvalLog: any) => {
    const creation = creationLogs.find(
      (c: any) => c.entity_type === approvalLog.entity_type
    );
    if (creation) {
      const diff = new Date(approvalLog.created_at).getTime() - new Date(creation.created_at).getTime();
      if (diff > 0) turnaroundTimes.push(diff);
    }
  });

  const avgTurnaround = turnaroundTimes.length > 0
    ? formatDuration(turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length)
    : 'N/A';

  const totalApprovals = auditLogs.filter((l) => l.action === 'approved').length;
  const totalRejections = auditLogs.filter((l) => l.action === 'rejected').length;
  const approvalRate = (totalApprovals + totalRejections) > 0
    ? ((totalApprovals / (totalApprovals + totalRejections)) * 100).toFixed(1)
    : '0.0';

  const approvalByEntity: Record<string, { approved: number; rejected: number }> = {};
  approvalLogs.forEach((l) => {
    if (!approvalByEntity[l.entity_type]) approvalByEntity[l.entity_type] = { approved: 0, rejected: 0 };
    if (l.action === 'approved') approvalByEntity[l.entity_type].approved++;
    else approvalByEntity[l.entity_type].rejected++;
  });
  const approvalEntityData = Object.entries(approvalByEntity).map(([entity, counts]) => ({
    entity: entity.charAt(0).toUpperCase() + entity.slice(1).replace('_', ' '),
    ...counts,
  }));

  const approvalByMonth = last6Months.map(({ key, label }) => ({
    label,
    approved: auditLogs.filter((l) => l.action === 'approved' && l.created_at.slice(0, 7) === key).length,
    rejected: auditLogs.filter((l) => l.action === 'rejected' && l.created_at.slice(0, 7) === key).length,
  }));

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">Analytics</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
            Key metrics derived from audit logs, leases, and invoices
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all shrink-0"
        >
          <RefreshCw size={13} /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Section 1: User Activity ─────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="User Activity"
          subtitle="Audit log events per user and day over the last 7 days"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <MetricCard
            label="Total Audit Events"
            value={totalEvents.toString()}
            sub="All time"
            icon={<Activity size={18} />}
          />
          <MetricCard
            label="Events Today"
            value={todayEvents.toString()}
            sub="Last 24 hours"
            icon={<BarChart2 size={18} />}
            trend={todayEvents > 0 ? 'Active' : 'Quiet'}
            trendType={todayEvents > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            label="Active Users"
            value={uniqueUsers.toString()}
            sub="Unique contributors"
            icon={<Users size={18} />}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Daily activity bar chart */}
          <div className="xl:col-span-3 bg-white border border-border rounded-xl p-5 shadow-card">
            <p className="text-[13px] font-600 text-foreground mb-4">Events per Day (Last 7 Days)</p>
            {activityByDay.every((d) => d.events === 0) ? (
              <div className="flex items-center justify-center h-40 text-[12px] text-muted-foreground">No audit events recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={activityByDay} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="events" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top users */}
          <div className="xl:col-span-2 bg-white border border-border rounded-xl p-5 shadow-card">
            <p className="text-[13px] font-600 text-foreground mb-4">Top Users by Activity</p>
            {topUsers.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[12px] text-muted-foreground">No user activity recorded</div>
            ) : (
              <div className="space-y-3">
                {topUsers.map((u, i) => (
                  <div key={u.email} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-700 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-500 text-foreground truncate">{u.email}</p>
                      <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.round((u.count / (topUsers[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[12px] font-600 text-muted-foreground tabular-nums shrink-0">{u.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Invoice Collection Rates ─────────────────────────────── */}
      <section>
        <SectionHeader
          title="Invoice Collection Rates"
          subtitle="Paid vs outstanding invoices and monthly collection trends"
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
          <MetricCard
            label="Collection Rate"
            value={`${collectionRate}%`}
            sub={`${paidInvoices} of ${totalInvoices} invoices paid`}
            icon={<DollarSign size={18} />}
            trend={parseFloat(collectionRate) >= 70 ? 'On track' : 'Needs attention'}
            trendType={parseFloat(collectionRate) >= 70 ? 'up' : 'down'}
          />
          <MetricCard
            label="Collected Amount"
            value={`$${collectedAmount.toLocaleString()}`}
            sub={`of $${totalAmount.toLocaleString()} total`}
            icon={<CheckCircle size={18} />}
          />
          <MetricCard
            label="Overdue Invoices"
            value={overdueInvoices.toString()}
            sub="Past due date"
            icon={<XCircle size={18} />}
            trend={overdueInvoices > 0 ? `${overdueInvoices} overdue` : 'None overdue'}
            trendType={overdueInvoices > 0 ? 'down' : 'up'}
          />
          <MetricCard
            label="Pending Invoices"
            value={pendingInvoices.toString()}
            sub="Awaiting payment"
            icon={<FileText size={18} />}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Monthly collection rate line chart */}
          <div className="xl:col-span-3 bg-white border border-border rounded-xl p-5 shadow-card">
            <p className="text-[13px] font-600 text-foreground mb-4">Monthly Collection Rate (%)</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={invoicesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  formatter={(v: any) => [`${v}%`, 'Collection Rate']}
                />
                <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e' }} name="Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Invoice status donut */}
          <div className="xl:col-span-2 bg-white border border-border rounded-xl p-5 shadow-card">
            <p className="text-[13px] font-600 text-foreground mb-4">Invoice Status Breakdown</p>
            {invoiceStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[12px] text-muted-foreground">No invoices found</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {invoiceStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v: any, name: any) => [v, name]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 3: Lease Utilization ─────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Lease Utilization"
          subtitle="Active lease coverage across total units and monthly lease trends"
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
          <MetricCard
            label="Utilization Rate"
            value={`${utilizationRate}%`}
            sub={`${activeLeases} active of ${totalUnits} units`}
            icon={<TrendingUp size={18} />}
            trend={parseFloat(utilizationRate) >= 80 ? 'Healthy' : 'Below target'}
            trendType={parseFloat(utilizationRate) >= 80 ? 'up' : 'down'}
          />
          <MetricCard
            label="Active Leases"
            value={activeLeases.toString()}
            sub="Currently occupied"
            icon={<FileText size={18} />}
          />
          <MetricCard
            label="Total Units"
            value={totalUnits.toString()}
            sub="Across all properties"
            icon={<BarChart2 size={18} />}
          />
          <MetricCard
            label="Expiring in 30 Days"
            value={expiringSoon.toString()}
            sub="Require renewal action"
            icon={<Clock size={18} />}
            trend={expiringSoon > 0 ? `${expiringSoon} expiring` : 'None expiring'}
            trendType={expiringSoon > 3 ? 'down' : expiringSoon > 0 ? 'neutral' : 'up'}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* New vs expired leases per month */}
          <div className="xl:col-span-3 bg-white border border-border rounded-xl p-5 shadow-card">
            <p className="text-[13px] font-600 text-foreground mb-4">New vs Expired Leases (Last 6 Months)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leasesByMonth} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="new" fill="#0ea5e9" radius={[3, 3, 0, 0]} name="New Leases" />
                <Bar dataKey="expired" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Expired" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Lease status donut */}
          <div className="xl:col-span-2 bg-white border border-border rounded-xl p-5 shadow-card">
            <p className="text-[13px] font-600 text-foreground mb-4">Lease Status Distribution</p>
            {leaseStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[12px] text-muted-foreground">No leases found</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={leaseStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {leaseStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 4: Approval Turnaround Times ─────────────────────────────── */}
      <section>
        <SectionHeader
          title="Approval Turnaround Times"
          subtitle="Approval and rejection rates derived from audit log events"
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
          <MetricCard
            label="Approval Rate"
            value={`${approvalRate}%`}
            sub={`${totalApprovals} approved, ${totalRejections} rejected`}
            icon={<CheckCircle size={18} />}
            trend={parseFloat(approvalRate) >= 80 ? 'High approval' : 'Review needed'}
            trendType={parseFloat(approvalRate) >= 80 ? 'up' : 'down'}
          />
          <MetricCard
            label="Avg Turnaround"
            value={avgTurnaround}
            sub="From creation to decision"
            icon={<Clock size={18} />}
          />
          <MetricCard
            label="Total Approvals"
            value={totalApprovals.toString()}
            sub="All time"
            icon={<CheckCircle size={18} />}
          />
          <MetricCard
            label="Total Rejections"
            value={totalRejections.toString()}
            sub="All time"
            icon={<XCircle size={18} />}
            trend={totalRejections > 0 ? `${totalRejections} rejected` : 'None rejected'}
            trendType={totalRejections > 5 ? 'down' : 'neutral'}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Monthly approvals vs rejections */}
          <div className="xl:col-span-3 bg-white border border-border rounded-xl p-5 shadow-card">
            <p className="text-[13px] font-600 text-foreground mb-4">Approvals vs Rejections (Last 6 Months)</p>
            {approvalByMonth.every((d) => d.approved === 0 && d.rejected === 0) ? (
              <div className="flex items-center justify-center h-40 text-[12px] text-muted-foreground">No approval events recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={approvalByMonth} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="approved" fill="#22c55e" radius={[3, 3, 0, 0]} name="Approved" />
                  <Bar dataKey="rejected" fill="#ef4444" radius={[3, 3, 0, 0]} name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Approval breakdown by entity type */}
          <div className="xl:col-span-2 bg-white border border-border rounded-xl p-5 shadow-card">
            <p className="text-[13px] font-600 text-foreground mb-4">Approvals by Entity Type</p>
            {approvalEntityData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[12px] text-muted-foreground">No approval data available</div>
            ) : (
              <div className="space-y-3 mt-2">
                {approvalEntityData.map((row) => {
                  const total = row.approved + row.rejected;
                  const rate = total > 0 ? Math.round((row.approved / total) * 100) : 0;
                  return (
                    <div key={row.entity}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-500 text-foreground">{row.entity}</span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="text-green-700 font-600">{row.approved}✓</span>
                          <span className="text-red-500 font-600">{row.rejected}✗</span>
                          <span className="font-600 text-foreground">{rate}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
