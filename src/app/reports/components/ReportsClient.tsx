'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  Download,
  FileText,
  DollarSign,
  ListChecks,
  Wrench,
  RefreshCw,
  Filter,
  Calendar,
  ChevronDown,
  X,
  Building2,
  TrendingUp,
  CheckCircle,
  ClipboardList,
  Percent,
  Clock,
  AlertCircle,
} from 'lucide-react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportCategory = 'operational' | 'raw';
type OperationalReportType = 'occupancy' | 'collection_rates' | 'approval_metrics' | 'audit_trails';
type RawReportType = 'leases' | 'invoices' | 'work_orders' | 'service_requests';
type ReportType = OperationalReportType | RawReportType;

interface ReportConfig {
  id: ReportType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  category: ReportCategory;
}

interface KpiCard {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  status: string;
  priority: string;
}

const defaultFilters: Filters = { dateFrom: '', dateTo: '', status: '', priority: '' };

const REPORT_CONFIGS: ReportConfig[] = [
  // Operational
  {
    id: 'occupancy',
    label: 'Occupancy',
    icon: <Building2 size={18} />,
    color: 'text-sky-600 bg-sky-50',
    description: 'Unit occupancy rates, vacant vs occupied breakdown by project',
    category: 'operational',
  },
  {
    id: 'collection_rates',
    label: 'Collection Rates',
    icon: <TrendingUp size={18} />,
    color: 'text-emerald-600 bg-emerald-50',
    description: 'Invoice collection rates, paid vs overdue amounts',
    category: 'operational',
  },
  {
    id: 'approval_metrics',
    label: 'Approval Metrics',
    icon: <CheckCircle size={18} />,
    color: 'text-violet-600 bg-violet-50',
    description: 'Lease and invoice approval rates, turnaround times',
    category: 'operational',
  },
  {
    id: 'audit_trails',
    label: 'Audit Trails',
    icon: <ClipboardList size={18} />,
    color: 'text-amber-600 bg-amber-50',
    description: 'Entity changes with timestamps, users, and before/after values',
    category: 'operational',
  },
  // Raw data
  {
    id: 'leases',
    label: 'Leases',
    icon: <FileText size={18} />,
    color: 'text-blue-600 bg-blue-50',
    description: 'Lease agreements, tenants, rent amounts and status',
    category: 'raw',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: <DollarSign size={18} />,
    color: 'text-teal-600 bg-teal-50',
    description: 'Invoice records, amounts, VAT and payment status',
    category: 'raw',
  },
  {
    id: 'work_orders',
    label: 'Work Orders',
    icon: <ListChecks size={18} />,
    color: 'text-indigo-600 bg-indigo-50',
    description: 'Work orders, skill types, providers and costs',
    category: 'raw',
  },
  {
    id: 'service_requests',
    label: 'Service Requests',
    icon: <Wrench size={18} />,
    color: 'text-orange-600 bg-orange-50',
    description: 'Maintenance and service requests with priority and status',
    category: 'raw',
  },
];

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(',')),
  ];
  return lines.join('\n');
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF helper ───────────────────────────────────────────────────────────────

function downloadPdf(
  title: string,
  rows: Record<string, unknown>[],
  kpis?: KpiCard[]
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);

  const thStyle =
    'style="border:1px solid #d1d5db;padding:6px 10px;background:#f9fafb;font-size:11px;text-align:left;white-space:nowrap;"';
  const tdStyle =
    'style="border:1px solid #e5e7eb;padding:5px 10px;font-size:11px;color:#374151;"';

  const headerRow = headers.map((h) => `<th ${thStyle}>${h}</th>`).join('');
  const bodyRows = rows
    .map(
      (r) =>
        `<tr>${headers
          .map((h) => `<td ${tdStyle}>${r[h] ?? ''}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const kpiHtml = kpis?.length
    ? `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
        ${kpis
          .map(
            (k) =>
              `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;min-width:140px;">
                <p style="font-size:10px;color:#6b7280;margin:0 0 4px;">${k.label}</p>
                <p style="font-size:20px;font-weight:700;margin:0;color:#111827;">${k.value}</p>
                ${k.sub ? `<p style="font-size:10px;color:#9ca3af;margin:4px 0 0;">${k.sub}</p>` : ''}
              </div>`
          )
          .join('')}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body { font-family: 'DM Sans', sans-serif; margin: 24px; color: #111827; }
    h2 { font-size: 16px; margin-bottom: 4px; }
    p.meta { font-size: 11px; color: #6b7280; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    @media print { @page { margin: 16mm; } }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <p class="meta">Generated: ${new Date().toLocaleString()}</p>
  ${kpiHtml}
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─── Operational report fetchers ──────────────────────────────────────────────

async function fetchOccupancyReport(
  supabase: ReturnType<typeof createClient>,
  filters: Filters
): Promise<{ rows: Record<string, unknown>[]; kpis: KpiCard[] }> {
  const [unitRes, leaseRes] = await Promise.all([
    supabase
      .from('units')
      .select('id,unit_number,unit_name,floors(name,buildings(name,projects(name)))'),
    supabase
      .from('leases')
      .select('id,status,unit_id,start_date,end_date,rent_amount,persons(name)')
      .in('status', ['active']),
  ]);

  if (unitRes.error) throw unitRes.error;
  if (leaseRes.error) throw leaseRes.error;

  const units: any[] = unitRes.data ?? [];
  const activeLeases: any[] = leaseRes.data ?? [];
  const occupiedUnitIds = new Set(activeLeases.map((l) => l.unit_id));

  const rows = units.map((u) => {
    const lease = activeLeases.find((l) => l.unit_id === u.id);
    return {
      'Unit #': u.unit_number,
      'Unit Name': u.unit_name ?? '-',
      Floor: u.floors?.name ?? '-',
      Building: u.floors?.buildings?.name ?? '-',
      Project: u.floors?.buildings?.projects?.name ?? '-',
      Status: occupiedUnitIds.has(u.id) ? 'Occupied' : 'Vacant',
      Tenant: lease?.persons?.name ?? '-',
      'Lease Start': lease?.start_date ?? '-',
      'Lease End': lease?.end_date ?? '-',
      'Rent Amount': lease?.rent_amount ?? '-',
    };
  });

  const totalUnits = units.length;
  const occupiedCount = occupiedUnitIds.size;
  const vacantCount = totalUnits - occupiedCount;
  const occupancyRate =
    totalUnits > 0 ? ((occupiedCount / totalUnits) * 100).toFixed(1) : '0.0';

  const kpis: KpiCard[] = [
    {
      label: 'Total Units',
      value: String(totalUnits),
      icon: <Building2 size={16} />,
      accent: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Occupied',
      value: String(occupiedCount),
      sub: `${occupancyRate}% occupancy`,
      icon: <CheckCircle size={16} />,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Vacant',
      value: String(vacantCount),
      sub: `${(100 - parseFloat(occupancyRate)).toFixed(1)}% vacancy`,
      icon: <AlertCircle size={16} />,
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Occupancy Rate',
      value: `${occupancyRate}%`,
      icon: <Percent size={16} />,
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  return { rows, kpis };
}

async function fetchCollectionRatesReport(
  supabase: ReturnType<typeof createClient>,
  filters: Filters
): Promise<{ rows: Record<string, unknown>[]; kpis: KpiCard[] }> {
  let q = supabase
    .from('invoices')
    .select(
      'invoice_number,invoice_type_ext,status,amount,tax_amount,total_amount,due_date,created_at,units(unit_number,unit_name),tenants(full_name)'
    )
    .not('status', 'in', '("draft","cancelled")')
    .order('created_at', { ascending: false });

  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.status) q = q.eq('status', filters.status);

  const { data, error } = await q;
  if (error) throw error;

  const invoices: any[] = data ?? [];
  const total = invoices.length;
  const paid = invoices.filter((i) => i.status === 'paid').length;
  const overdue = invoices.filter((i) => {
    if (i.status === 'paid') return false;
    return i.due_date && new Date(i.due_date) < new Date();
  }).length;
  const pending = total - paid - overdue;

  const totalAmount = invoices.reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const collectedAmount = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const collectionRate = total > 0 ? ((paid / total) * 100).toFixed(1) : '0.0';

  const rows = invoices.map((i) => {
    const isOverdue =
      i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date();
    return {
      'Invoice #': i.invoice_number,
      Type: i.invoice_type_ext ?? '-',
      Tenant: i.tenants?.full_name ?? '-',
      Unit: i.units ? `${i.units.unit_number} – ${i.units.unit_name}` : '-',
      Status: i.status,
      'Collection Status': isOverdue ? 'Overdue' : i.status === 'paid' ? 'Collected' : 'Pending',
      Amount: i.amount,
      'Total Amount': i.total_amount,
      'Due Date': i.due_date ?? '-',
      'Created At': i.created_at?.slice(0, 10),
    };
  });

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `AED ${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
      ? `AED ${(n / 1_000).toFixed(1)}K`
      : `AED ${n.toFixed(0)}`;

  const kpis: KpiCard[] = [
    {
      label: 'Collection Rate',
      value: `${collectionRate}%`,
      sub: `${paid} of ${total} invoices paid`,
      icon: <Percent size={16} />,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Collected Amount',
      value: fmt(collectedAmount),
      sub: `of ${fmt(totalAmount)} total`,
      icon: <DollarSign size={16} />,
      accent: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Overdue',
      value: String(overdue),
      sub: `${total > 0 ? ((overdue / total) * 100).toFixed(1) : 0}% of invoices`,
      icon: <AlertCircle size={16} />,
      accent: 'bg-red-50 text-red-600',
    },
    {
      label: 'Pending',
      value: String(pending),
      icon: <Clock size={16} />,
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  return { rows, kpis };
}

async function fetchApprovalMetricsReport(
  supabase: ReturnType<typeof createClient>,
  filters: Filters
): Promise<{ rows: Record<string, unknown>[]; kpis: KpiCard[] }> {
  let q = supabase
    .from('audit_logs')
    .select('id,entity_type,entity_label,action,performed_by_email,created_at,metadata')
    .in('action', ['approved', 'rejected', 'status_changed'])
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');

  const { data, error } = await q;
  if (error) throw error;

  const logs: any[] = data ?? [];
  const approvals = logs.filter((l) => l.action === 'approved');
  const rejections = logs.filter((l) => l.action === 'rejected');
  const total = approvals.length + rejections.length;
  const approvalRate = total > 0 ? ((approvals.length / total) * 100).toFixed(1) : '0.0';

  // Avg turnaround: time between created and approved (from metadata if available)
  const turnaroundMs = approvals
    .map((l) => {
      const submitted = l.metadata?.submitted_at;
      if (!submitted) return null;
      return new Date(l.created_at).getTime() - new Date(submitted).getTime();
    })
    .filter((v): v is number => v !== null && v > 0);

  const avgTurnaround =
    turnaroundMs.length > 0
      ? turnaroundMs.reduce((a, b) => a + b, 0) / turnaroundMs.length
      : null;

  const formatDuration = (ms: number) => {
    const h = ms / (1000 * 60 * 60);
    return h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`;
  };

  const rows = logs.map((l) => ({
    'Entity Type': l.entity_type ?? '-',
    'Entity Label': l.entity_label ?? '-',
    Action: l.action,
    'Performed By': l.performed_by_email ?? '-',
    'Date & Time': l.created_at?.slice(0, 16).replace('T', ' '),
    Notes: l.metadata?.notes ?? '-',
  }));

  const kpis: KpiCard[] = [
    {
      label: 'Approval Rate',
      value: `${approvalRate}%`,
      sub: `${approvals.length} approved, ${rejections.length} rejected`,
      icon: <CheckCircle size={16} />,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Total Approvals',
      value: String(approvals.length),
      icon: <CheckCircle size={16} />,
      accent: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Total Rejections',
      value: String(rejections.length),
      icon: <X size={16} />,
      accent: 'bg-red-50 text-red-600',
    },
    {
      label: 'Avg Turnaround',
      value: avgTurnaround ? formatDuration(avgTurnaround) : 'N/A',
      sub: avgTurnaround ? 'from submission to decision' : 'no turnaround data',
      icon: <Clock size={16} />,
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  return { rows, kpis };
}

async function fetchAuditTrailsReport(
  supabase: ReturnType<typeof createClient>,
  filters: Filters
): Promise<{ rows: Record<string, unknown>[]; kpis: KpiCard[] }> {
  let q = supabase
    .from('audit_logs')
    .select(
      'id,entity_type,entity_label,action,performed_by_email,before_values,after_values,created_at,metadata'
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');

  const { data, error } = await q;
  if (error) throw error;

  const logs: any[] = data ?? [];

  const actionCounts: Record<string, number> = {};
  const entityCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};

  logs.forEach((l) => {
    actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
    entityCounts[l.entity_type] = (entityCounts[l.entity_type] || 0) + 1;
    const u = l.performed_by_email || 'System';
    userCounts[u] = (userCounts[u] || 0) + 1;
  });

  const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
  const uniqueUsers = Object.keys(userCounts).filter((u) => u !== 'System').length;

  const rows = logs.map((l) => {
    const before = l.before_values
      ? Object.keys(l.before_values)
          .slice(0, 3)
          .map((k) => `${k}: ${l.before_values[k]}`)
          .join('; ')
      : '-';
    const after = l.after_values
      ? Object.keys(l.after_values)
          .slice(0, 3)
          .map((k) => `${k}: ${l.after_values[k]}`)
          .join('; ')
      : '-';
    return {
      'Date & Time': l.created_at?.slice(0, 16).replace('T', ' '),
      'Entity Type': l.entity_type ?? '-',
      'Entity Label': l.entity_label ?? '-',
      Action: l.action,
      'Performed By': l.performed_by_email ?? 'System',
      'Before (sample)': before,
      'After (sample)': after,
    };
  });

  const kpis: KpiCard[] = [
    {
      label: 'Total Events',
      value: String(logs.length),
      icon: <ClipboardList size={16} />,
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Active Users',
      value: String(uniqueUsers),
      sub: 'unique contributors',
      icon: <CheckCircle size={16} />,
      accent: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Entity Types',
      value: String(Object.keys(entityCounts).length),
      icon: <Building2 size={16} />,
      accent: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Top Action',
      value: topAction ? topAction[0] : 'N/A',
      sub: topAction ? `${topAction[1]} occurrences` : undefined,
      icon: <TrendingUp size={16} />,
      accent: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return { rows, kpis };
}

// ─── Raw data fetchers ────────────────────────────────────────────────────────

async function fetchLeases(
  supabase: ReturnType<typeof createClient>,
  filters: Filters
): Promise<Record<string, unknown>[]> {
  let q = supabase
    .from('leases')
    .select(
      'lease_number,status,start_date,end_date,rent_amount,security_deposit,payment_terms,annual_increment_pct,amc_amount,created_at,units(unit_number,unit_name,floors(name,buildings(name,projects(name)))),persons(name)'
    )
    .order('created_at', { ascending: false });

  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.status) q = q.eq('status', filters.status);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    'Lease #': r.lease_number ?? '-',
    Tenant: r.persons?.name ?? '-',
    Unit: r.units ? `${r.units.unit_number} – ${r.units.unit_name}` : '-',
    Floor: r.units?.floors?.name ?? '-',
    Building: r.units?.floors?.buildings?.name ?? '-',
    Project: r.units?.floors?.buildings?.projects?.name ?? '-',
    Status: r.status,
    'Start Date': r.start_date,
    'End Date': r.end_date,
    'Rent Amount': r.rent_amount,
    'Security Deposit': r.security_deposit,
    'Payment Terms': r.payment_terms,
    'Annual Increment %': r.annual_increment_pct,
    'AMC Amount': r.amc_amount,
    'Created At': r.created_at?.slice(0, 10),
  }));
}

async function fetchInvoices(
  supabase: ReturnType<typeof createClient>,
  filters: Filters
): Promise<Record<string, unknown>[]> {
  let q = supabase
    .from('invoices')
    .select(
      'invoice_number,invoice_type_ext,status,amount,tax_amount,total_amount,vat_pct,due_date,invoice_period_start,invoice_period_end,created_at,units(unit_number,unit_name),tenants(full_name)'
    )
    .not('status', 'in', '("draft","cancelled")')
    .order('created_at', { ascending: false });

  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.status) q = q.eq('status', filters.status);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    'Invoice #': r.invoice_number,
    Type: r.invoice_type_ext,
    Tenant: r.tenants?.full_name ?? '-',
    Unit: r.units ? `${r.units.unit_number} – ${r.units.unit_name}` : '-',
    Status: r.status,
    Amount: r.amount,
    'Tax Amount': r.tax_amount,
    'Total Amount': r.total_amount,
    'VAT %': r.vat_pct,
    'Due Date': r.due_date,
    'Period Start': r.invoice_period_start,
    'Period End': r.invoice_period_end,
    'Created At': r.created_at?.slice(0, 10),
  }));
}

async function fetchWorkOrders(
  supabase: ReturnType<typeof createClient>,
  filters: Filters
): Promise<Record<string, unknown>[]> {
  let q = supabase
    .from('work_orders')
    .select(
      'wo_number,skill_type,status,amount,payment_terms,payer,other_instructions,created_at,projects(name),buildings(name),floors(name),service_providers(name)'
    )
    .order('created_at', { ascending: false });

  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.status) q = q.eq('status', filters.status);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    'WO #': r.wo_number,
    'Skill Type': r.skill_type,
    Status: r.status,
    Amount: r.amount,
    'Payment Terms': r.payment_terms,
    Payer: r.payer,
    Project: r.projects?.name ?? '-',
    Building: r.buildings?.name ?? '-',
    Floor: r.floors?.name ?? '-',
    Provider: r.service_providers?.name ?? '-',
    Instructions: r.other_instructions ?? '-',
    'Created At': r.created_at?.slice(0, 10),
  }));
}

async function fetchServiceRequests(
  supabase: ReturnType<typeof createClient>,
  filters: Filters
): Promise<Record<string, unknown>[]> {
  let q = supabase
    .from('service_requests')
    .select(
      'title,description,skill_type,priority,status,payer,created_at,units(unit_number,unit_name),service_providers(name)'
    )
    .order('created_at', { ascending: false });

  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.priority) q = q.eq('priority', filters.priority);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    Title: r.title,
    Description: r.description ?? '-',
    'Skill Type': r.skill_type,
    Priority: r.priority,
    Status: r.status,
    Payer: r.payer,
    Unit: r.units ? `${r.units.unit_number} – ${r.units.unit_name}` : '-',
    Provider: r.service_providers?.name ?? '-',
    'Created At': r.created_at?.slice(0, 10),
  }));
}

// ─── Status options per report type ──────────────────────────────────────────

const STATUS_OPTIONS: Partial<Record<ReportType, string[]>> = {
  leases: ['pending', 'active', 'expired', 'terminated', 'renewed'],
  invoices: ['sent', 'paid', 'overdue', 'partially_paid'],
  collection_rates: ['sent', 'paid', 'overdue', 'partially_paid'],
  work_orders: ['draft', 'issued', 'in_progress', 'completed', 'cancelled'],
  service_requests: ['open', 'in_progress', 'completed', 'closed', 'cancelled'],
};

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

// ─── KPI Summary Bar ─────────────────────────────────────────────────────────

function KpiSummaryBar({ kpis }: { kpis: KpiCard[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {kpis.map((k, i) => (
        <div
          key={i}
          className="bg-white border border-border rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground">
              {k.label}
            </p>
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.accent}`}
            >
              {k.icon}
            </span>
          </div>
          <p className="text-[26px] font-700 tabular-nums leading-none text-foreground">
            {k.value}
          </p>
          {k.sub && (
            <p className="text-[11px] text-muted-foreground mt-1">{k.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsClient() {
  const supabase = createClient();
  const { t } = useLanguage();

  const [activeReport, setActiveReport] = useState<ReportType>('occupancy');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [kpis, setKpis] = useState<KpiCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  const activeConfig = REPORT_CONFIGS.find((c) => c.id === activeReport)!;
  const isOperational = activeConfig.category === 'operational';

  const handleTabChange = (id: ReportType) => {
    setActiveReport(id);
    setRows(null);
    setKpis([]);
    setGenerated(false);
    setError('');
    setFilters(defaultFilters);
  };

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    setRows(null);
    setKpis([]);
    try {
      if (activeReport === 'occupancy') {
        const result = await fetchOccupancyReport(supabase, filters);
        setRows(result.rows);
        setKpis(result.kpis);
      } else if (activeReport === 'collection_rates') {
        const result = await fetchCollectionRatesReport(supabase, filters);
        setRows(result.rows);
        setKpis(result.kpis);
      } else if (activeReport === 'approval_metrics') {
        const result = await fetchApprovalMetricsReport(supabase, filters);
        setRows(result.rows);
        setKpis(result.kpis);
      } else if (activeReport === 'audit_trails') {
        const result = await fetchAuditTrailsReport(supabase, filters);
        setRows(result.rows);
        setKpis(result.kpis);
      } else if (activeReport === 'leases') {
        setRows(await fetchLeases(supabase, filters));
      } else if (activeReport === 'invoices') {
        setRows(await fetchInvoices(supabase, filters));
      } else if (activeReport === 'work_orders') {
        setRows(await fetchWorkOrders(supabase, filters));
      } else {
        setRows(await fetchServiceRequests(supabase, filters));
      }
      setGenerated(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [activeReport, filters]);

  const handleExportCsv = () => {
    if (!rows?.length) return;
    downloadCsv(
      `${activeReport}_report_${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  const handleExportPdf = () => {
    if (!rows?.length) return;
    downloadPdf(`${activeConfig.label} Report`, rows, kpis.length ? kpis : undefined);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setRows(null);
    setKpis([]);
    setGenerated(false);
  };

  const hasActiveFilters =
    filters.dateFrom || filters.dateTo || filters.status || filters.priority;

  const operationalReports = REPORT_CONFIGS.filter((c) => c.category === 'operational');
  const rawReports = REPORT_CONFIGS.filter((c) => c.category === 'raw');

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BarChart3 size={18} />
          </div>
          <div>
            <h1 className="text-[16px] sm:text-[17px] font-600 text-foreground leading-tight">{t.reports_title}</h1>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground">
              {t.reports_subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">

        {/* ── Operational Reports ── */}
        <div>
          <p className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground mb-2.5">
            {t.reports_operational}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {operationalReports.map((cfg) => (
              <button
                key={cfg.id}
                onClick={() => handleTabChange(cfg.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150 ${
                  activeReport === cfg.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-white hover:border-primary/40 hover:bg-secondary/50'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}
                >
                  {cfg.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-[13px] font-600 ${
                      activeReport === cfg.id ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {cfg.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {cfg.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Raw Data Reports ── */}
        <div>
          <p className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground mb-2.5">
            {t.reports_raw_data}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rawReports.map((cfg) => (
              <button
                key={cfg.id}
                onClick={() => handleTabChange(cfg.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150 ${
                  activeReport === cfg.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-white hover:border-primary/40 hover:bg-secondary/50'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}
                >
                  {cfg.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-[13px] font-600 ${
                      activeReport === cfg.id ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {cfg.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {cfg.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filters panel ── */}
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-600 text-foreground">
              <Filter size={14} className="text-muted-foreground" />
              Filters
              <span className="text-[11px] font-400 text-muted-foreground ml-1">
                — {activeConfig.label}
              </span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                <X size={11} /> Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Date From */}
            <div>
              <label className="block text-[11px] font-500 text-muted-foreground mb-1">
                <Calendar size={10} className="inline mr-1" />
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                }
                className="w-full h-8 px-2.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-500 text-muted-foreground mb-1">
                <Calendar size={10} className="inline mr-1" />
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateTo: e.target.value }))
                }
                className="w-full h-8 px-2.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-500 text-muted-foreground mb-1">
                Status
              </label>
              <div className="relative">
                <select
                  value={filters.status}
                  disabled={!STATUS_OPTIONS[activeReport]}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full h-8 pl-2.5 pr-7 text-[12px] border border-border rounded-lg bg-background text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">All statuses</option>
                  {(STATUS_OPTIONS[activeReport] ?? []).map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>

            {/* Priority (service requests only) */}
            <div>
              <label className="block text-[11px] font-500 text-muted-foreground mb-1">
                Priority
              </label>
              <div className="relative">
                <select
                  value={filters.priority}
                  disabled={activeReport !== 'service_requests'}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="w-full h-8 pl-2.5 pr-7 text-[12px] border border-border rounded-lg bg-background text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">All priorities</option>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Generate + Export buttons */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[13px] font-500 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <BarChart3 size={14} />
              )}
              {loading ? 'Generating…' : 'Generate Report'}
            </button>

            {generated && rows && rows.length > 0 && (
              <>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-[13px] font-500 text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  <Download size={14} />
                  Export CSV
                </button>
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-[13px] font-500 text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  <FileText size={14} />
                  Export PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-destructive/5 border border-destructive/20 rounded-lg text-[13px] text-destructive">
            <X size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-white border border-border rounded-xl p-4 space-y-2">
            <LoadingSkeleton rows={6} />
          </div>
        )}

        {/* Results */}
        {!loading && generated && rows !== null && (
          <div>
            {/* KPI summary for operational reports */}
            {isOperational && kpis.length > 0 && (
              <KpiSummaryBar kpis={kpis} />
            )}

            <div className="bg-white border border-border rounded-xl overflow-hidden">
              {/* Table header bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center ${activeConfig.color}`}
                  >
                    {activeConfig.icon}
                  </span>
                  <span className="text-[13px] font-600 text-foreground">
                    {activeConfig.label} Report
                  </span>
                </div>
                <span className="text-[12px] text-muted-foreground">
                  {rows.length} record{rows.length !== 1 ? 's' : ''}
                </span>
              </div>

              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <BarChart3 size={32} className="opacity-30" />
                  <p className="text-[13px]">
                    No records found for the selected filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-secondary/50">
                        {Object.keys(rows[0]).map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2.5 text-left font-600 text-muted-foreground whitespace-nowrap border-b border-border"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                        >
                          {Object.values(row).map((val, j) => (
                            <td
                              key={j}
                              className="px-3 py-2.5 text-foreground whitespace-nowrap max-w-[200px] truncate"
                              title={String(val ?? '')}
                            >
                              {val === null || val === undefined || val === '' ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
