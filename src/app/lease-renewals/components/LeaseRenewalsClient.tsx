'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Search, Download, CheckCircle, XCircle, Clock, Lock, FileText, AlertCircle, ChevronRight, Building2, Layers, Home, Percent } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';

interface RenewalEntry {
  lease_id: string;
  lease_number: string;
  unit_id: string;
  unit_name: string;
  lessee: string;
  current_rent: number;
  current_sd: number;
  current_to_pct: number;
  prev_end_date: string;
  new_start_date: string; // day after prev_end_date — read-only
  new_end_date: string;   // 365 days from new_start_date — read-only
  rent_increase_pct: number;
}

interface RenewedLease {
  id: string;
  lease_number: string;
  rent_amount: number;
  security_deposit: number;
  start_date: string;
  end_date: string;
  status: string;
  approval_status: string;
  rejection_reason?: string;
  approved_at?: string;
  created_at: string;
  original_lease_id?: string;
  original_rent?: number;
  persons?: { name: string };
  units?: { unit_name: string; unit_number: string };
}

// ── helpers ──────────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function generateRenewalPDF(entries: RenewalEntry[]) {
  const rows = entries.map(e => {
    const newRent = e.current_rent * (1 + e.rent_increase_pct / 100);
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${e.lease_number}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${e.unit_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${e.lessee}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">AED ${e.current_rent.toLocaleString()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${e.rent_increase_pct > 0 ? '+' : ''}${e.rent_increase_pct}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#1a56db;font-weight:600">AED ${newRent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${e.new_start_date}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${e.new_end_date}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>Lease Renewals</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;color:#333}
      h1{color:#1a56db;border-bottom:2px solid #1a56db;padding-bottom:10px}
      .meta{display:flex;gap:40px;margin:16px 0;padding:12px;background:#f9fafb;border-radius:8px}
      .meta-item{font-size:12px;color:#6b7280}
      .meta-item strong{display:block;font-size:14px;color:#111;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280}
      .footer{margin-top:30px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
    </style>
    </head><body>
    <h1>Lease Renewals — Pending Approval</h1>
    <div class="meta">
      <div class="meta-item">Generated<strong>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
      <div class="meta-item">Total Units<strong>${entries.length}</strong></div>
    </div>
    <table>
      <thead><tr>
        <th>Lease #</th><th>Unit</th><th>Lessee</th>
        <th>Current Rent</th><th>Increase %</th><th>New Rent</th>
        <th>New Start</th><th>New End</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Leazify Property Management System — Lease Renewal Summary</div>
    </body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

function generateApprovedLeasePDF(lease: RenewedLease) {
  const html = `<!DOCTYPE html><html><head><title>Renewed Lease ${lease.lease_number}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;color:#333}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}
      h1{color:#1a56db;margin:0}
      .badge{display:inline-block;padding:6px 14px;background:#d1fae5;color:#065f46;border-radius:20px;font-size:12px;font-weight:700}
      .section{margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;font-size:13px}
      .row:last-child{border-bottom:none}
      .label{color:#6b7280}
      .value{font-weight:600}
      .total{font-size:18px;font-weight:700;color:#1a56db}
      .footer{margin-top:30px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
    </style>
    </head><body>
    <div class="header">
      <div><h1>RENEWED LEASE</h1><p style="color:#6b7280;font-size:13px;margin:4px 0">${lease.lease_number}</p></div>
      <span class="badge">✓ ACTIVE</span>
    </div>
    <div class="section">
      <div class="row"><span class="label">Tenant</span><span class="value">${lease.persons?.name || '—'}</span></div>
      <div class="row"><span class="label">Unit</span><span class="value">${lease.units?.unit_name || lease.units?.unit_number || '—'}</span></div>
      <div class="row"><span class="label">Lease #</span><span class="value">${lease.lease_number}</span></div>
      <div class="row"><span class="label">Start Date</span><span class="value">${lease.start_date || '—'}</span></div>
      <div class="row"><span class="label">End Date</span><span class="value">${lease.end_date || '—'}</span></div>
    </div>
    <div class="section">
      <div class="row"><span class="label">New Rent Amount</span><span class="total">AED ${Number(lease.rent_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span class="label">Security Deposit</span><span class="value">AED ${Number(lease.security_deposit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
    </div>
    <div class="footer">Leazify Property Management System — Approved on ${lease.approved_at ? new Date(lease.approved_at).toLocaleDateString() : '—'}</div>
    </body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  leaseNumber: string;
}

function RejectModal({ open, onClose, onConfirm, leaseNumber }: RejectModalProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={t.renew_reject_title} subtitle={`Lease ${leaseNumber}`} size="sm">
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-[12px] font-500 text-foreground mb-1.5">{t.renew_reject_reason}</label>
          <textarea
            className="w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/15 transition-all resize-none"
            rows={3}
            placeholder={t.renew_reject_placeholder}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_cancel}</button>
          <button
            onClick={() => { if (reason.trim()) { onConfirm(reason.trim()); setReason(''); } }}
            disabled={!reason.trim()}
            className="flex items-center gap-1 px-4 py-2.5 text-[12px] font-500 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-60 transition-all"
          >
            <XCircle size={14} /> {t.renew_reject_btn}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function LeaseRenewalsClient() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'create' | 'pending' | 'approved'>('pending');

  // ── Hierarchy selection ───────────────────────────────────────────────────
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [floors, setFloors] = useState<{ id: string; name: string }[]>([]);
  const [selProject, setSelProject] = useState('');
  const [selBuilding, setSelBuilding] = useState('');
  const [selFloor, setSelFloor] = useState('');

  // ── Renewal entries ───────────────────────────────────────────────────────
  const [renewalEntries, setRenewalEntries] = useState<RenewalEntry[]>([]);
  const [globalRentIncrease, setGlobalRentIncrease] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // ── Pending / Approved ────────────────────────────────────────────────────
  const [pendingLeases, setPendingLeases] = useState<RenewedLease[]>([]);
  const [approvedLeases, setApprovedLeases] = useState<RenewedLease[]>([]);
  const [leasesLoading, setLeasesLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; lease: RenewedLease | null }>({ open: false, lease: null });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Load projects on mount ────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('projects').select('id, name').order('name').then(({ data }) => setProjects(data || []));
    fetchRenewedLeases();
  }, []);

  // ── Cascade: project → buildings ─────────────────────────────────────────
  useEffect(() => {
    if (!selProject) { setBuildings([]); setFloors([]); setSelBuilding(''); setSelFloor(''); setRenewalEntries([]); return; }
    supabase.from('buildings').select('id, name').eq('project_id', selProject).order('name').then(({ data }) => setBuildings(data || []));
    setFloors([]); setSelBuilding(''); setSelFloor(''); setRenewalEntries([]);
  }, [selProject]);

  // ── Cascade: building → floors ────────────────────────────────────────────
  useEffect(() => {
    if (!selBuilding) { setFloors([]); setSelFloor(''); setRenewalEntries([]); return; }
    supabase.from('floors').select('id, name').eq('building_id', selBuilding).order('name').then(({ data }) => setFloors(data || []));
    setSelFloor(''); setRenewalEntries([]);
  }, [selBuilding]);

  // ── Reset entries when floor changes ─────────────────────────────────────
  useEffect(() => {
    setRenewalEntries([]);
  }, [selFloor]);

  const fetchRenewedLeases = useCallback(async () => {
    setLeasesLoading(true);
    const { data } = await supabase
      .from('leases')
      .select('*, persons:lessee_person_id(name), units(unit_name, unit_number)')
      .eq('invoice_source', 'renewal')
      .order('created_at', { ascending: false });
    const all = (data || []) as RenewedLease[];

    // Fetch original lease rent amounts for renewals that have original_lease_id
    const originalIds = all.map(l => l.original_lease_id).filter(Boolean) as string[];
    let originalRentMap: Record<string, number> = {};
    if (originalIds.length > 0) {
      const { data: origData } = await supabase
        .from('leases')
        .select('id, rent_amount')
        .in('id', originalIds);
      (origData || []).forEach((o: { id: string; rent_amount: number }) => {
        originalRentMap[o.id] = Number(o.rent_amount);
      });
    }

    const allWithOrigRent = all.map(l => ({
      ...l,
      original_rent: l.original_lease_id ? originalRentMap[l.original_lease_id] : undefined,
    }));

    setPendingLeases(allWithOrigRent.filter(l => l.approval_status === 'pending' || !l.approval_status));
    setApprovedLeases(allWithOrigRent.filter(l => l.approval_status === 'approved' || l.approval_status === 'rejected'));
    setLeasesLoading(false);
  }, []);

  // ── Load active leases for the selected scope ─────────────────────────────
  const fetchActiveLeases = useCallback(async () => {
    if (!selProject) return;
    setLoading(true);
    setSaveError('');
    setSaved(false);

    // Build the query — filter by floor if selected, else building, else project
    let query = supabase
      .from('leases')
      .select('*, units!inner(id, unit_name, unit_number, floor_id, floors!inner(id, building_id, buildings!inner(id, project_id))), persons:lessee_person_id(name)')
      .in('status', ['active', 'expired']);

    if (selFloor) {
      query = query.eq('units.floor_id', selFloor);
    } else if (selBuilding) {
      query = query.eq('units.floors.building_id', selBuilding);
    } else {
      query = query.eq('units.floors.buildings.project_id', selProject);
    }

    const { data, error } = await query;
    if (error) { setSaveError(error.message); setLoading(false); return; }

    const leases = data || [];
    const entries: RenewalEntry[] = leases.map((l: any) => {
      const newStart = addDays(l.end_date, 1);
      const newEnd = addDays(newStart, 364); // start + 365 days = start + 364 more days
      return {
        lease_id: l.id,
        lease_number: l.lease_number || '—',
        unit_id: l.unit_id,
        unit_name: l.units?.unit_name || l.units?.unit_number || '—',
        lessee: l.persons?.name || '—',
        current_rent: Number(l.rent_amount),
        current_sd: Number(l.security_deposit),
        current_to_pct: Number(l.turnover_rent_pct),
        prev_end_date: l.end_date,
        new_start_date: newStart,
        new_end_date: newEnd,
        rent_increase_pct: globalRentIncrease,
      };
    });

    setRenewalEntries(entries);
    setLoading(false);
  }, [selProject, selBuilding, selFloor, globalRentIncrease]);

  // ── Apply global rent increase to all entries ─────────────────────────────
  const applyGlobalIncrease = (pct: number) => {
    setGlobalRentIncrease(pct);
    setRenewalEntries(prev => prev.map(e => ({ ...e, rent_increase_pct: pct })));
  };

  const updateEntryIncrease = (idx: number, pct: number) => {
    setRenewalEntries(prev => prev.map((e, i) => i === idx ? { ...e, rent_increase_pct: pct } : e));
  };

  // ── Submit for approval ───────────────────────────────────────────────────
  const handleSubmitForApproval = async () => {
    if (renewalEntries.length === 0) { setSaveError('No units loaded for renewal'); return; }
    setSaving(true);
    setSaveError('');

    const leaseIds = renewalEntries.map(e => e.lease_id);
    const { data: originalLeases } = await supabase.from('leases').select('*').in('id', leaseIds);
    const originalMap: Record<string, any> = {};
    (originalLeases || []).forEach(l => { originalMap[l.id] = l; });

    for (const entry of renewalEntries) {
      const original = originalMap[entry.lease_id];
      if (!original) continue;
      const newRent = entry.current_rent * (1 + entry.rent_increase_pct / 100);
      const renewalLeaseNum = `RNW-${original.lease_number || entry.lease_id.slice(0, 8)}-${new Date().getFullYear()}`;

      await supabase.from('leases').insert({
        lease_number: renewalLeaseNum,
        unit_id: original.unit_id,
        lessee_person_id: original.lessee_person_id,
        rent_amount: newRent,
        security_deposit: original.security_deposit,
        turnover_rent_pct: original.turnover_rent_pct,
        amc_amount: original.amc_amount,
        amc_payment_term: original.amc_payment_term,
        payment_terms: original.payment_terms,
        start_date: entry.new_start_date,
        end_date: entry.new_end_date,
        status: 'draft',
        approval_status: 'pending',
        invoice_source: 'renewal',
        original_lease_id: entry.lease_id,
        notes: `Renewal of lease ${original.lease_number}. Rent revised by ${entry.rent_increase_pct}%.`,
      });
    }

    setSaving(false);
    setSaved(true);
    fetchRenewedLeases();
    setActiveTab('pending');
  };

  const handleApprove = async (renewedLease: RenewedLease) => {
    setActionLoading(renewedLease.id);
    await supabase.from('leases').update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      status: 'active',
    }).eq('id', renewedLease.id);
    if (renewedLease.original_lease_id) {
      await supabase.from('leases').update({ status: 'renewed' }).eq('id', renewedLease.original_lease_id);
    }
    setActionLoading(null);
    fetchRenewedLeases();
  };

  const handleReject = async (renewedLease: RenewedLease, reason: string) => {
    setActionLoading(renewedLease.id);
    await supabase.from('leases').update({
      approval_status: 'rejected',
      rejection_reason: reason,
      status: 'draft',
    }).eq('id', renewedLease.id);
    setActionLoading(null);
    setRejectModal({ open: false, lease: null });
    fetchRenewedLeases();
  };

  const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const readonlyCls = 'w-full px-3.5 py-2.5 text-[13px] bg-secondary/60 border border-border rounded-lg text-muted-foreground cursor-not-allowed';

  const tabs = [
    { id: 'pending', label: t.renew_tab_pending, icon: Clock, count: pendingLeases.length },
    { id: 'create', label: t.renew_tab_create, icon: RefreshCw, count: null },
    { id: 'approved', label: t.renew_tab_approved, icon: CheckCircle, count: approvedLeases.length },
  ] as const;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.renew_title}</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.renew_subtitle}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 border border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-500 rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon size={13} />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 text-[10px] font-700 rounded-full ${tab.id === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-muted-foreground'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PENDING APPROVAL TAB ── */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {leasesLoading ? <LoadingSkeleton rows={4} /> : pendingLeases.length === 0 ? (
            <EmptyState icon={Clock} title={t.renew_pending_title} description={t.renew_pending_desc} action={{ label: t.renew_tab_create, onClick: () => setActiveTab('create') }} />
          ) : (
            <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-amber-500" />
                  <p className="text-[13px] font-600 text-foreground">{pendingLeases.length} {t.renew_pending_awaiting}</p>
                </div>
                <button onClick={fetchRenewedLeases} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
                  <RefreshCw size={12} /> <span className="hidden sm:inline">{t.btn_refresh}</span>
                </button>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {pendingLeases.map(lease => (
                  <div key={lease.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-600 text-primary">{lease.lease_number}</span>
                      <span className="font-600 tabular-nums text-[13px]">AED {Number(lease.rent_amount).toLocaleString()}</span>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {lease.persons?.name || '—'} · {lease.units?.unit_name || lease.units?.unit_number || '—'}
                    </div>
                    {lease.original_rent !== undefined && (
                      <div className="text-[11px] text-muted-foreground">
                        Old Rent: AED {lease.original_rent.toLocaleString()} →{' '}
                        New: AED {Number(lease.rent_amount).toLocaleString()}{' '}
                        ({lease.original_rent > 0 ? `+${(((Number(lease.rent_amount) - lease.original_rent) / lease.original_rent) * 100).toFixed(1)}%` : '—'})
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground">{lease.start_date || '—'} → {lease.end_date || '—'}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleApprove(lease)} disabled={actionLoading === lease.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-60 transition-colors">
                        <CheckCircle size={11} /> {actionLoading === lease.id ? '...' : t.btn_approve}
                      </button>
                      <button onClick={() => setRejectModal({ open: true, lease })} disabled={actionLoading === lease.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-60 transition-colors">
                        <XCircle size={11} /> {t.btn_reject}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[13px]" style={{ minWidth: '960px' }}>
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {[t.renew_col_lease_no, t.renew_col_lessee, t.renew_col_unit, 'Old Rent', 'New Rent', '% Increase', t.renew_col_period, t.renew_col_actions].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingLeases.map(lease => {
                      const oldRent = lease.original_rent;
                      const newRent = Number(lease.rent_amount);
                      const pctIncrease = oldRent && oldRent > 0 ? ((newRent - oldRent) / oldRent) * 100 : null;
                      return (
                        <tr key={lease.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-[12px] text-primary font-600">{lease.lease_number}</td>
                          <td className="px-4 py-3 font-500">{lease.persons?.name || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{lease.units?.unit_name || lease.units?.unit_number || '—'}</td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">{oldRent !== undefined ? `AED ${oldRent.toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-3 tabular-nums font-600">AED {newRent.toLocaleString()}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {pctIncrease !== null ? (
                              <span className={`text-[12px] font-600 ${pctIncrease > 0 ? 'text-green-600' : pctIncrease < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {pctIncrease > 0 ? '+' : ''}{pctIncrease.toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{lease.start_date || '—'} → {lease.end_date || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleApprove(lease)} disabled={actionLoading === lease.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-60 transition-colors whitespace-nowrap">
                                <CheckCircle size={11} /> {actionLoading === lease.id ? '...' : t.btn_approve}
                              </button>
                              <button onClick={() => setRejectModal({ open: true, lease })} disabled={actionLoading === lease.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-60 transition-colors whitespace-nowrap">
                                <XCircle size={11} /> {t.btn_reject}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE RENEWALS TAB ── */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {saveError && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive flex items-center gap-2"><AlertCircle size={13} />{saveError}</div>}
          {saved && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-700">
              <CheckCircle size={14} /> {t.renew_submitted_success}
            </div>
          )}

          {/* ── Project Hierarchy Selection ── */}
          <div className="bg-white rounded-xl border border-border shadow-card p-4 sm:p-5">
            <h4 className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 size={13} /> Project Hierarchy Selection
            </h4>

            {/* Breadcrumb trail */}
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-4 flex-wrap">
              <span className={selProject ? 'text-primary font-500' : ''}>Project</span>
              <ChevronRight size={12} />
              <span className={selBuilding ? 'text-primary font-500' : ''}>Building</span>
              <ChevronRight size={12} />
              <span className={selFloor ? 'text-primary font-500' : 'italic'}>Floor (optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Project */}
              <div>
                <label className="block text-[12px] font-500 text-foreground mb-1 flex items-center gap-1.5">
                  <Building2 size={12} className="text-primary" /> Project <span className="text-destructive">*</span>
                </label>
                <select className={inputCls} value={selProject} onChange={e => setSelProject(e.target.value)}>
                  <option value="">Select project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Building */}
              <div>
                <label className="block text-[12px] font-500 text-foreground mb-1 flex items-center gap-1.5">
                  <Layers size={12} className="text-primary" /> Building <span className="text-destructive">*</span>
                </label>
                <select className={inputCls} value={selBuilding} onChange={e => setSelBuilding(e.target.value)} disabled={!selProject}>
                  <option value="">Select building…</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Floor (optional) */}
              <div>
                <label className="block text-[12px] font-500 text-foreground mb-1 flex items-center gap-1.5">
                  <Home size={12} className="text-primary" /> Floor <span className="text-[11px] text-muted-foreground font-400">(optional)</span>
                </label>
                <select className={inputCls} value={selFloor} onChange={e => setSelFloor(e.target.value)} disabled={!selBuilding}>
                  <option value="">All floors</option>
                  {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={fetchActiveLeases}
                disabled={!selBuilding || loading}
                className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
              >
                <Search size={14} /> Load Units for Renewal
              </button>
            </div>
          </div>

          {/* ── Renewal Table ── */}
          {loading ? <LoadingSkeleton rows={4} /> : renewalEntries.length === 0 ? (
            <EmptyState icon={RefreshCw} title="No units loaded" description="Select a project and building above, then click Load Units for Renewal to see active leases." />
          ) : (
            <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
              {/* Header with global rent increase */}
              <div className="px-4 sm:px-5 py-4 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-600 text-foreground">{renewalEntries.length} unit{renewalEntries.length !== 1 ? 's' : ''} ready for renewal</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Lease dates are auto-calculated and cannot be modified</p>
                  </div>

                  {/* Global rent increase control */}
                  <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <Percent size={14} className="text-primary shrink-0" />
                    <div>
                      <p className="text-[11px] font-600 text-primary uppercase tracking-wide">Apply Rent Increase to All</p>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          value={globalRentIncrease}
                          onChange={e => setGlobalRentIncrease(Number(e.target.value))}
                          className="w-20 px-2 py-1 text-[13px] font-600 border border-primary/30 rounded-lg outline-none focus:border-primary text-center bg-white"
                          placeholder="0"
                        />
                        <span className="text-[12px] text-muted-foreground">%</span>
                        <button
                          onClick={() => applyGlobalIncrease(globalRentIncrease)}
                          className="px-3 py-1 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info banner about read-only dates */}
              <div className="px-4 sm:px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <Lock size={12} className="text-blue-500 shrink-0" />
                <p className="text-[11px] text-blue-700">
                  <strong>Start date</strong> = day after previous lease ends. <strong>End date</strong> = 365 days from start. Both are system-calculated and locked.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]" style={{ minWidth: '1050px' }}>
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {['Lease #', 'Unit', 'Lessee', 'Prev. End Date', 'New Start Date 🔒', 'New End Date 🔒', 'Current Rent', 'Increase %', 'New Rent'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {renewalEntries.map((entry, idx) => {
                      const newRent = entry.current_rent * (1 + entry.rent_increase_pct / 100);
                      return (
                        <tr key={entry.lease_id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-[12px] text-primary font-600 whitespace-nowrap">{entry.lease_number}</td>
                          <td className="px-4 py-3 font-500">{entry.unit_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.lessee}</td>
                          <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{entry.prev_end_date}</td>
                          {/* Read-only start date */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Lock size={11} className="text-muted-foreground shrink-0" />
                              <span className="text-[12px] font-500 text-foreground bg-secondary/60 px-2 py-1 rounded-md whitespace-nowrap">{entry.new_start_date}</span>
                            </div>
                          </td>
                          {/* Read-only end date */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Lock size={11} className="text-muted-foreground shrink-0" />
                              <span className="text-[12px] font-500 text-foreground bg-secondary/60 px-2 py-1 rounded-md whitespace-nowrap">{entry.new_end_date}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 tabular-nums font-600">AED {entry.current_rent.toLocaleString()}</td>
                          {/* Per-unit rent increase override */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min={0}
                                max={100}
                                value={entry.rent_increase_pct}
                                onChange={e => updateEntryIncrease(idx, Number(e.target.value))}
                                className="w-20 px-2 py-1 text-[12px] border border-border rounded-lg outline-none focus:border-primary text-center"
                              />
                              <span className="text-[11px] text-muted-foreground">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 tabular-nums font-600 text-primary whitespace-nowrap">
                            AED {newRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer actions */}
              <div className="px-4 sm:px-5 py-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-[12px] text-muted-foreground">
                  {renewalEntries.length} unit{renewalEntries.length !== 1 ? 's' : ''} · Avg increase: {(renewalEntries.reduce((s, e) => s + e.rent_increase_pct, 0) / (renewalEntries.length || 1)).toFixed(1)}%
                </p>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <button
                    onClick={() => generateRenewalPDF(renewalEntries)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 transition-all"
                  >
                    <Download size={14} /> Preview PDF
                  </button>
                  <button
                    onClick={handleSubmitForApproval}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
                  >
                    <Clock size={14} /> {saving ? 'Submitting…' : 'Submit for Approval'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── APPROVED / REJECTED TAB ── */}
      {activeTab === 'approved' && (
        <div className="space-y-4">
          {leasesLoading ? <LoadingSkeleton rows={4} /> : approvedLeases.length === 0 ? (
            <EmptyState icon={CheckCircle} title={t.renew_approved_title} description={t.renew_approved_desc} />
          ) : (
            <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b border-border">
                <p className="text-[13px] font-600 text-foreground">{approvedLeases.length} {t.renew_processed_count}</p>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {approvedLeases.map(lease => (
                  <div key={lease.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-600 text-primary">{lease.lease_number}</span>
                      {lease.approval_status === 'approved' ? (
                        <Badge variant="success" size="sm"><Lock size={9} className="inline mr-1" />Active</Badge>
                      ) : (
                        <Badge variant="error" size="sm">Rejected</Badge>
                      )}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {lease.persons?.name || '—'} · {lease.units?.unit_name || lease.units?.unit_number || '—'}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-600 tabular-nums text-[13px]">AED {Number(lease.rent_amount).toLocaleString()}</span>
                      {lease.approval_status === 'approved' && (
                        <button onClick={() => generateApprovedLeasePDF(lease)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                          <FileText size={11} /> {t.renew_download_pdf}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[13px]" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {[t.renew_col_lease_no, t.renew_col_lessee, t.renew_col_unit, t.renew_col_new_rent, t.renew_col_period, t.lbl_status, t.renew_col_actions].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {approvedLeases.map(lease => (
                      <tr key={lease.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-[12px] text-primary font-600">{lease.lease_number}</td>
                        <td className="px-4 py-3 font-500">{lease.persons?.name || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{lease.units?.unit_name || lease.units?.unit_number || '—'}</td>
                        <td className="px-4 py-3 tabular-nums font-600">AED {Number(lease.rent_amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{lease.start_date || '—'} → {lease.end_date || '—'}</td>
                        <td className="px-4 py-3">
                          {lease.approval_status === 'approved' ? (
                            <Badge variant="success" size="sm"><Lock size={9} className="inline mr-1" />Active</Badge>
                          ) : (
                            <div>
                              <Badge variant="error" size="sm">Rejected</Badge>
                              {lease.rejection_reason && <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[160px] truncate" title={lease.rejection_reason}>{lease.rejection_reason}</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lease.approval_status === 'approved' ? (
                            <button onClick={() => generateApprovedLeasePDF(lease)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap">
                              <FileText size={11} /> {t.renew_download_pdf}
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <RejectModal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, lease: null })}
        onConfirm={reason => rejectModal.lease && handleReject(rejectModal.lease, reason)}
        leaseNumber={rejectModal.lease?.lease_number || ''}
      />
    </div>
  );
}