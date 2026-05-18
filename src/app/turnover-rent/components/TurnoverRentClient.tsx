'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Upload, CheckCircle, RefreshCw, XCircle, Clock, Lock, FileText } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';

interface TurnoverEntry {
  id: string;
  unit_id: string;
  month: number;
  year: number;
  monthly_sales: number;
  turnover_rent_pct: number;
  calculated_amount: number;
  status: string;
  approval_status?: string;
  approved_at?: string;
  rejection_reason?: string;
  invoice_id?: string;
  units?: { unit_name: string; unit_number: string; floors?: { buildings?: { projects?: { name: string } } } };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function generateTurnoverInvoicePDF(entry: TurnoverEntry) {
  const unitLabel = entry.units?.unit_name || entry.units?.unit_number || '—';
  const project = entry.units?.floors?.buildings?.projects?.name || '—';
  const html = `<!DOCTYPE html><html><head><title>Turnover Rent Invoice</title>
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
      <div><h1>TURNOVER RENT INVOICE</h1><p style="color:#6b7280;font-size:13px;margin:4px 0">T/O-${entry.year}-${String(entry.month).padStart(2,'0')}-${entry.id.slice(-6).toUpperCase()}</p></div>
      <span class="badge">✓ APPROVED</span>
    </div>
    <div class="section">
      <div class="row"><span class="label">Unit</span><span class="value">${unitLabel}</span></div>
      <div class="row"><span class="label">Project</span><span class="value">${project}</span></div>
      <div class="row"><span class="label">Period</span><span class="value">${MONTHS[entry.month - 1]} ${entry.year}</span></div>
    </div>
    <div class="section">
      <div class="row"><span class="label">Monthly Sales</span><span class="value">AED ${Number(entry.monthly_sales).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span class="label">Turnover Rent %</span><span class="value">${entry.turnover_rent_pct}%</span></div>
      <div class="row"><span class="label total">Turnover Rent Amount</span><span class="total">AED ${Number(entry.calculated_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
    </div>
    <div class="footer">PropFlow Property Management System — Approved on ${entry.approved_at ? new Date(entry.approved_at).toLocaleDateString() : '—'}</div>
    </body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

function UploadModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selProject, setSelProject] = useState('');
  const [selBuilding, setSelBuilding] = useState('');
  const [selFloor, setSelFloor] = useState('');
  const [selUnit, setSelUnit] = useState('');
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [salesAmount, setSalesAmount] = useState('');
  const [turnoverPct, setTurnoverPct] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('projects').select('id, name').then(({ data }) => setProjects(data || []));
  }, [open]);

  useEffect(() => {
    if (!selProject) return;
    supabase.from('buildings').select('id, name').eq('project_id', selProject).then(({ data }) => setBuildings(data || []));
  }, [selProject]);

  useEffect(() => {
    if (!selBuilding) return;
    supabase.from('floors').select('id, name').eq('building_id', selBuilding).then(({ data }) => setFloors(data || []));
  }, [selBuilding]);

  useEffect(() => {
    if (!selFloor) return;
    supabase.from('units').select('id, unit_name, unit_number').eq('floor_id', selFloor).eq('usage_type', 'mall')
      .then(({ data }) => setUnits(data || []));
  }, [selFloor]);

  const handleSave = async () => {
    if (!selUnit || !salesAmount) return;
    setSaving(true);
    const calcAmount = Number(salesAmount) * Number(turnoverPct || 0) / 100;
    const { error } = await supabase.from('turnover_rent').upsert({
      unit_id: selUnit,
      month: selMonth,
      year: selYear,
      monthly_sales: Number(salesAmount),
      turnover_rent_pct: Number(turnoverPct) || 0,
      status: 'draft',
      approval_status: 'pending',
    }, { onConflict: 'unit_id,month,year' });
    setSaving(false);
    if (!error) { onSaved(); onClose(); }
  };

  const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  return (
    <Modal open={open} onClose={onClose} title="Upload Turnover Sales Data" subtitle="Only Mall usage type units are shown" size="md">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Project</label>
            <select className={inputCls} value={selProject} onChange={e => setSelProject(e.target.value)}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Building</label>
            <select className={inputCls} value={selBuilding} onChange={e => setSelBuilding(e.target.value)} disabled={!selProject}>
              <option value="">Select building</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Floor</label>
            <select className={inputCls} value={selFloor} onChange={e => setSelFloor(e.target.value)} disabled={!selBuilding}>
              <option value="">Select floor</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mall Unit</label>
            <select className={inputCls} value={selUnit} onChange={e => setSelUnit(e.target.value)} disabled={!selFloor}>
              <option value="">Select unit</option>
              {units.length === 0 && selFloor ? <option disabled>No mall units on this floor</option> : null}
              {units.map(u => <option key={u.id} value={u.id}>{u.unit_name || u.unit_number}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Month</label>
            <select className={inputCls} value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <select className={inputCls} value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Monthly Sales (AED)</label>
            <input type="number" step="0.01" className={inputCls} value={salesAmount} onChange={e => setSalesAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className={labelCls}>Turnover Rent %</label>
            <input type="number" step="0.01" className={inputCls} value={turnoverPct} onChange={e => setTurnoverPct(e.target.value)} placeholder="e.g. 5" />
          </div>
        </div>
        {salesAmount && turnoverPct && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-[12px] text-muted-foreground">Calculated Turnover Rent:</p>
            <p className="text-[18px] font-700 text-primary">AED {(Number(salesAmount) * Number(turnoverPct) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving || !selUnit || !salesAmount} className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? 'Saving...' : 'Save & Submit for Approval'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  entryLabel: string;
}

function RejectModal({ open, onClose, onConfirm, entryLabel }: RejectModalProps) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Reject Turnover Rent" subtitle={entryLabel} size="sm">
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-[12px] font-500 text-foreground mb-1.5">Rejection Reason *</label>
          <textarea
            className="w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/15 transition-all resize-none"
            rows={3}
            placeholder="Enter reason for rejection..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
          <button
            onClick={() => { if (reason.trim()) { onConfirm(reason.trim()); setReason(''); } }}
            disabled={!reason.trim()}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-60 transition-all"
          >
            <XCircle size={14} /> Reject
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function TurnoverRentClient() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'approved'>('pending');
  const [entries, setEntries] = useState<TurnoverEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; entry: TurnoverEntry | null }>({ open: false, entry: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('turnover_rent')
      .select('*, units(unit_name, unit_number, floors(buildings(projects(name))))')
      .eq('year', filterYear)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (filterMonth > 0) query = query.eq('month', filterMonth);
    const { data } = await query;
    setEntries(data || []);
    setLoading(false);
  }, [filterYear, filterMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingEntries = entries.filter(e => !e.approval_status || e.approval_status === 'pending');
  const processedEntries = entries.filter(e => e.approval_status === 'approved' || e.approval_status === 'rejected');

  const handleApprove = async (entry: TurnoverEntry) => {
    setActionLoading(entry.id);
    // Create invoice
    const invoiceNum = `INV-TO-${entry.year}-${String(entry.month).padStart(2, '0')}-${entry.id.slice(-6).toUpperCase()}`;
    const { data: invData } = await supabase.from('invoices').insert({
      invoice_number: invoiceNum,
      invoice_type_ext: 'turnover_rent',
      amount: entry.calculated_amount,
      tax_amount: 0,
      total_amount: entry.calculated_amount,
      vat_pct: 0,
      due_date: `${entry.year}-${String(entry.month).padStart(2, '0')}-28`,
      status: 'issued',
      approval_status: 'approved',
      invoice_source: 'turnover_rent',
      invoice_period_start: `${entry.year}-${String(entry.month).padStart(2, '0')}-01`,
      invoice_period_end: `${entry.year}-${String(entry.month).padStart(2, '0')}-28`,
    }).select('id').single();

    await supabase.from('turnover_rent').update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      status: 'invoiced',
      invoice_id: invData?.id || null,
    }).eq('id', entry.id);

    setActionLoading(null);
    fetchData();
  };

  const handleReject = async (entry: TurnoverEntry, reason: string) => {
    setActionLoading(entry.id);
    await supabase.from('turnover_rent').update({
      approval_status: 'rejected',
      rejection_reason: reason,
      status: 'draft',
    }).eq('id', entry.id);
    setActionLoading(null);
    setRejectModal({ open: false, entry: null });
    fetchData();
  };

  const totalSales = entries.reduce((s, e) => s + Number(e.monthly_sales), 0);
  const totalRent = entries.reduce((s, e) => s + Number(e.calculated_amount), 0);
  const approvedCount = processedEntries.filter(e => e.approval_status === 'approved').length;

  const tabs = [
    { id: 'pending', label: 'Pending Approval', icon: Clock, count: pendingEntries.length },
    { id: 'all', label: 'All Entries', icon: TrendingUp, count: null },
    { id: 'approved', label: 'Approved / Rejected', icon: CheckCircle, count: processedEntries.length },
  ] as const;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-700 text-foreground">Turnover Rent</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Mall usage type units — monthly sales-based rent calculation with approval workflow</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
          <Upload size={15} /> Upload Sales Data
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Monthly Sales', value: `AED ${totalSales.toLocaleString()}`, icon: TrendingUp, color: 'text-primary bg-primary/8' },
          { label: 'Total Turnover Rent', value: `AED ${totalRent.toLocaleString()}`, icon: TrendingUp, color: 'text-green-700 bg-green-100' },
          { label: 'Pending Approval', value: pendingEntries.length.toString(), icon: Clock, color: 'text-amber-700 bg-amber-100' },
          { label: 'Approved This Period', value: approvedCount.toString(), icon: CheckCircle, color: 'text-blue-700 bg-blue-100' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1">{card.label}</p>
            <p className="text-[24px] font-700 tabular-nums text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 w-fit border border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-500 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 text-[10px] font-700 rounded-full ${tab.id === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-muted-foreground'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border shadow-card p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-500 text-muted-foreground">Year:</label>
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
            className="px-3 py-1.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-500 text-muted-foreground">Month:</label>
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
            className="px-3 py-1.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary">
            <option value={0}>All Months</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <button onClick={fetchData} className="ml-auto flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── PENDING APPROVAL TAB ── */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          {loading ? (
            <div className="p-6"><LoadingSkeleton rows={4} /></div>
          ) : pendingEntries.length === 0 ? (
            <EmptyState icon={Clock} title="No pending entries" description="Upload sales data to create turnover rent entries for approval" action={{ label: 'Upload Sales Data', onClick: () => setShowUpload(true) }} />
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                <Clock size={15} className="text-amber-500" />
                <p className="text-[13px] font-600 text-foreground">{pendingEntries.length} entr{pendingEntries.length !== 1 ? 'ies' : 'y'} awaiting approval</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[800px]">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {['Unit', 'Project', 'Period', 'Monthly Sales', 'T/O Rent %', 'Calculated Rent', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-500">{entry.units?.unit_name || entry.units?.unit_number || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.units?.floors?.buildings?.projects?.name || '—'}</td>
                        <td className="px-4 py-3">{MONTHS[entry.month - 1]} {entry.year}</td>
                        <td className="px-4 py-3 tabular-nums font-500">AED {Number(entry.monthly_sales).toLocaleString()}</td>
                        <td className="px-4 py-3 tabular-nums">{entry.turnover_rent_pct}%</td>
                        <td className="px-4 py-3 tabular-nums font-600 text-primary">AED {Number(entry.calculated_amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(entry)}
                              disabled={actionLoading === entry.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-60 transition-colors whitespace-nowrap"
                            >
                              <CheckCircle size={11} /> {actionLoading === entry.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setRejectModal({ open: true, entry })}
                              disabled={actionLoading === entry.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-60 transition-colors whitespace-nowrap"
                            >
                              <XCircle size={11} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ALL ENTRIES TAB ── */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          {loading ? (
            <div className="p-6"><LoadingSkeleton rows={5} /></div>
          ) : entries.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No turnover rent data" description="Upload monthly sales data for mall units to calculate turnover rent" action={{ label: 'Upload Sales Data', onClick: () => setShowUpload(true) }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[900px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    {['Unit', 'Project', 'Period', 'Monthly Sales', 'T/O Rent %', 'Calculated Rent', 'Status', 'Approval'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-500">{entry.units?.unit_name || entry.units?.unit_number || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.units?.floors?.buildings?.projects?.name || '—'}</td>
                      <td className="px-4 py-3">{MONTHS[entry.month - 1]} {entry.year}</td>
                      <td className="px-4 py-3 tabular-nums font-500">AED {Number(entry.monthly_sales).toLocaleString()}</td>
                      <td className="px-4 py-3 tabular-nums">{entry.turnover_rent_pct}%</td>
                      <td className="px-4 py-3 tabular-nums font-600 text-primary">AED {Number(entry.calculated_amount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant={entry.status === 'invoiced' ? 'info' : entry.status === 'confirmed' ? 'success' : 'warning'} size="sm">
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {entry.approval_status === 'approved' ? (
                          <Badge variant="success" size="sm"><Lock size={9} className="inline mr-1" />Approved</Badge>
                        ) : entry.approval_status === 'rejected' ? (
                          <Badge variant="error" size="sm">Rejected</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── APPROVED / REJECTED TAB ── */}
      {activeTab === 'approved' && (
        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          {loading ? (
            <div className="p-6"><LoadingSkeleton rows={4} /></div>
          ) : processedEntries.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No processed entries" description="Approved and rejected turnover rent entries will appear here" />
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-[13px] font-600 text-foreground">{processedEntries.length} processed entr{processedEntries.length !== 1 ? 'ies' : 'y'}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[900px]">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {['Unit', 'Project', 'Period', 'Monthly Sales', 'Calculated Rent', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {processedEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-500">{entry.units?.unit_name || entry.units?.unit_number || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.units?.floors?.buildings?.projects?.name || '—'}</td>
                        <td className="px-4 py-3">{MONTHS[entry.month - 1]} {entry.year}</td>
                        <td className="px-4 py-3 tabular-nums font-500">AED {Number(entry.monthly_sales).toLocaleString()}</td>
                        <td className="px-4 py-3 tabular-nums font-600 text-primary">AED {Number(entry.calculated_amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {entry.approval_status === 'approved' ? (
                            <Badge variant="success" size="sm"><Lock size={9} className="inline mr-1" />Approved</Badge>
                          ) : (
                            <div>
                              <Badge variant="error" size="sm">Rejected</Badge>
                              {entry.rejection_reason && <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[160px] truncate" title={entry.rejection_reason}>{entry.rejection_reason}</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {entry.approval_status === 'approved' ? (
                            <button
                              onClick={() => generateTurnoverInvoicePDF(entry)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-600 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap"
                            >
                              <FileText size={11} /> Download PDF
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
            </>
          )}
        </div>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onSaved={fetchData} />
      <RejectModal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, entry: null })}
        onConfirm={reason => rejectModal.entry && handleReject(rejectModal.entry, reason)}
        entryLabel={rejectModal.entry ? `${rejectModal.entry.units?.unit_name || rejectModal.entry.units?.unit_number || '—'} — ${MONTHS[rejectModal.entry.month - 1]} ${rejectModal.entry.year}` : ''}
      />
    </div>
  );
}
