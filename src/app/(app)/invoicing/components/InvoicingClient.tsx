'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, FileText, TrendingUp, Settings, Search, Filter, RefreshCw, Eye, X, CheckCircle, Clock, Download, Upload, Lock, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { logAuditEvent } from '@/lib/auditLog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoRefresh } from '@/contexts/DataRefreshContext';
import { formatCurrencyFull } from '@/lib/currency';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type_ext: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  vat_pct: number;
  due_date: string;
  status: string;
  invoice_period_start: string;
  invoice_period_end: string;
  created_at: string;
  lease_id?: string;
  invoice_source?: string;
  units?: { unit_name: string; unit_number: string };
  tenants?: { full_name: string };
}

interface Lease {
  id: string;
  lease_number: string | null;
  unit_id: string;
  rent_amount: number;
  security_deposit: number;
  amc_amount: number;
  amc_payment_term: string;
  status: string;
  start_date: string;
  end_date: string;
  units?: {
    unit_name: string;
    unit_number: string;
    floors?: { name: string; buildings?: { name: string; projects?: { name: string; id: string } } };
  };
  persons?: { name: string };
}

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

interface VatConfig {
  id: string;
  project_id: string;
  vat_number: string;
  rent_vat_pct: number;
  security_deposit_vat_pct: number;
  turnover_rent_vat_pct: number;
  amc_vat_pct: number;
  misc_vat_pct: number;
}

interface HierarchySelection {
  projectId: string;
  buildingId: string;
  floorId: string;
  unitId: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const statusColors: Record<string, string> = { draft: 'default', sent: 'info', paid: 'success', overdue: 'error', cancelled: 'default', issued: 'info' };
const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genInvoiceNumber(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
}

// ─── Hierarchy Selector ───────────────────────────────────────────────────────

function HierarchySelector({
  value, onChange, label
}: {
  value: HierarchySelection;
  onChange: (v: HierarchySelection) => void;
  label?: string;
}) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      let projectList = data || [];
      if (assignedProjectIds !== null && assignedProjectIds.length >= 0) {
        projectList = projectList.filter((p: any) => assignedProjectIds.includes(p.id));
      }
      setProjects(projectList);
    });
  }, [assignedProjectIds]);

  useEffect(() => {
    if (!value.projectId) { setBuildings([]); setFloors([]); setUnits([]); return; }
    supabase.from('buildings').select('id, name').eq('project_id', value.projectId).order('name')
      .then(({ data }) => setBuildings(data || []));
    onChange({ ...value, buildingId: '', floorId: '', unitId: '' });
  }, [value.projectId]);

  useEffect(() => {
    if (!value.buildingId) { setFloors([]); setUnits([]); return; }
    supabase.from('floors').select('id, name').eq('building_id', value.buildingId).order('name')
      .then(({ data }) => setFloors(data || []));
    setUnits([]);
  }, [value.buildingId]);

  useEffect(() => {
    if (!value.floorId) { setUnits([]); return; }
    supabase.from('units').select('id, unit_name, unit_number').eq('floor_id', value.floorId).order('unit_number')
      .then(({ data }) => setUnits(data || []));
    onChange({ ...value, unitId: '' });
  }, [value.floorId]);

  const sel = 'w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';

  return (
    <div className="space-y-3">
      {label && <p className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider">{label}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_lbl_project}</label>
          <select className={sel} value={value.projectId} onChange={e => onChange({ ...value, projectId: e.target.value, buildingId: '', floorId: '', unitId: '' })}>
            <option value="">{t.inv_lbl_all_projects}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_lbl_building}</label>
          <select className={sel} value={value.buildingId} onChange={e => onChange({ ...value, buildingId: e.target.value, floorId: '', unitId: '' })} disabled={!value.projectId}>
            <option value="">{t.inv_lbl_all_buildings}</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_lbl_floor}</label>
          <select className={sel} value={value.floorId} onChange={e => onChange({ ...value, floorId: e.target.value, unitId: '' })} disabled={!value.buildingId}>
            <option value="">{t.inv_lbl_all_floors}</option>
            {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_lbl_unit}</label>
          <select className={sel} value={value.unitId} onChange={e => onChange({ ...value, unitId: e.target.value })} disabled={!value.floorId}>
            <option value="">{t.inv_lbl_all_units}</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.unit_name || u.unit_number}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── VAT Config Modal ─────────────────────────────────────────────────────────

function VatConfigModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selProject, setSelProject] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [rates, setRates] = useState({ rent: 5, security_deposit: 0, turnover_rent: 5, amc: 5, misc: 5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      let projectList = data || [];
      if (assignedProjectIds !== null && assignedProjectIds.length >= 0) {
        projectList = projectList.filter((p: any) => assignedProjectIds.includes(p.id));
      }
      setProjects(projectList);
    });
  }, [open, assignedProjectIds]);

  useEffect(() => {
    if (!selProject) return;
    supabase.from('vat_config').select('*').eq('project_id', selProject).single().then(({ data }) => {
      if (data) {
        setVatNumber(data.vat_number || '');
        setRates({ rent: data.rent_vat_pct, security_deposit: data.security_deposit_vat_pct, turnover_rent: data.turnover_rent_vat_pct, amc: data.amc_vat_pct, misc: data.misc_vat_pct });
      }
    });
  }, [selProject]);

  const handleSave = async () => {
    if (!selProject) { setError(t.inv_select_project); return; }
    setSaving(true);
    const { error: e } = await supabase.from('vat_config').upsert({
      project_id: selProject, vat_number: vatNumber,
      rent_vat_pct: rates.rent, security_deposit_vat_pct: rates.security_deposit,
      turnover_rent_vat_pct: rates.turnover_rent, amc_vat_pct: rates.amc, misc_vat_pct: rates.misc,
    }, { onConflict: 'project_id' });
    setSaving(false);
    if (e) { setError(e.message); return; }
    onSaved(); onClose();
  };

  const inp = 'w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
  const lbl = 'block text-[11px] font-500 text-foreground mb-1';

  return (
    <Modal open={open} onClose={onClose} title={t.inv_vat_modal_title} subtitle={t.inv_vat_modal_subtitle} size="md">
      <div className="p-5 space-y-4">
        {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} />{error}</div>}
        <div>
          <label className={lbl}>{t.inv_lbl_project} *</label>
          <select className={inp} value={selProject} onChange={e => setSelProject(e.target.value)}>
            <option value="">{t.inv_select_project}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>{t.inv_vat_number}</label>
          <input className={`${inp} font-mono`} value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="e.g. 100234567890003" />
        </div>
        <hr className="border-border" />
        <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{t.inv_vat_rates}</p>
        <div className="grid grid-cols-2 gap-3">
          {([['rent', t.inv_vat_rent], ['security_deposit', t.inv_vat_sd], ['turnover_rent', t.inv_vat_turnover], ['amc', t.inv_vat_amc], ['misc', t.inv_vat_misc]] as const).map(([k, l]) => (
            <div key={k}>
              <label className={lbl}>{l}</label>
              <input type="number" step="0.01" min="0" max="100" className={inp} value={(rates as any)[k]} onChange={e => setRates(r => ({ ...r, [k]: Number(e.target.value) }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_cancel}</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? t.btn_saving : t.inv_save_vat}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Invoice Detail Modal ─────────────────────────────────────────────────────

function InvoiceDetailModal({ invoice, open, onClose, onUpdated }: { invoice: Invoice | null; open: boolean; onClose: () => void; onUpdated: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  if (!invoice) return null;

  const updateStatus = async (newStatus: string) => {
    setUpdating(true); setUpdateError('');
    const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id);
    setUpdating(false);
    if (error) { setUpdateError(error.message); return; }
    onUpdated(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`${t.inv_detail_title} ${invoice.invoice_number}`} subtitle={t.inv_detail_subtitle} size="md">
      <div className="p-5 space-y-4">
        {updateError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} />{updateError}</div>}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-muted-foreground text-[12px]">{t.inv_col_unit}</span><p className="font-500 mt-0.5">{invoice.units?.unit_name || invoice.units?.unit_number || '—'}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.inv_col_tenant}</span><p className="font-500 mt-0.5">{invoice.tenants?.full_name || '—'}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.inv_col_type}</span><p className="font-500 mt-0.5 capitalize">{(invoice.invoice_type_ext || '').replace(/_/g, ' ')}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.inv_col_due_date}</span><p className="font-500 mt-0.5">{invoice.due_date || '—'}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.inv_detail_base_amount}</span><p className="font-500 mt-0.5">{formatCurrencyFull(Number(invoice.amount), (invoice as any).currency || 'AED')}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.inv_detail_vat} ({invoice.vat_pct || 0}%)</span><p className="font-500 mt-0.5">{formatCurrencyFull(Number(invoice.tax_amount), (invoice as any).currency || 'AED')}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.inv_detail_total}</span><p className="font-700 mt-0.5 text-primary">{formatCurrencyFull(Number(invoice.total_amount), (invoice as any).currency || 'AED')}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.inv_col_status}</span><div className="mt-1"><Badge variant={statusColors[invoice.status] as any || 'default'} size="sm">{invoice.status}</Badge></div></div>
        </div>
        {(invoice.invoice_period_start || invoice.invoice_period_end) && (
          <div className="p-3 bg-secondary/50 rounded-lg text-[13px]">
            <span className="text-muted-foreground">{t.inv_col_period}: </span>
            <span className="font-500">{invoice.invoice_period_start} → {invoice.invoice_period_end}</span>
          </div>
        )}
        <hr className="border-border" />
        <div>
          <p className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-2">{t.inv_update_status}</p>
          <div className="flex flex-wrap gap-2">
            {invoiceStatuses.filter(s => s !== invoice.status).map(s => (
              <button key={s} onClick={() => updateStatus(s)} disabled={updating}
                className="px-3 py-1.5 text-[12px] font-500 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 transition-all capitalize">{s}</button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Lease Invoice Generation Panel ──────────────────────────────────────────

function LeaseInvoicePanel({ onGenerated }: { onGenerated: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [hierarchy, setHierarchy] = useState<HierarchySelection>({ projectId: '', buildingId: '', floorId: '', unitId: '' });
  const [invoiceType, setInvoiceType] = useState<'rent' | 'security_deposit'>('rent');
  const [dueDate, setDueDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [leases, setLeases] = useState<Lease[]>([]);
  const [existingInvoices, setExistingInvoices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ generated: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const [vatConfigs, setVatConfigs] = useState<Record<string, VatConfig>>({});

  const fetchLeases = useCallback(async () => {
    setLoading(true); setError(''); setResult(null);
    let query = supabase.from('leases')
      .select('*, units(unit_name, unit_number, floors(name, buildings(name, projects(name, id)))), persons(name)')
      .eq('status', 'active');

    if (hierarchy.unitId) query = query.eq('unit_id', hierarchy.unitId);
    else if (hierarchy.floorId) {
      const { data: unitIds } = await supabase.from('units').select('id').eq('floor_id', hierarchy.floorId);
      if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
    } else if (hierarchy.buildingId) {
      const { data: floors } = await supabase.from('floors').select('id').eq('building_id', hierarchy.buildingId);
      if (floors?.length) {
        const { data: unitIds } = await supabase.from('units').select('id').in('floor_id', floors.map(f => f.id));
        if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
      }
    } else if (hierarchy.projectId) {
      const { data: buildings } = await supabase.from('buildings').select('id').eq('project_id', hierarchy.projectId);
      if (buildings?.length) {
        const { data: floors } = await supabase.from('floors').select('id').in('building_id', buildings.map(b => b.id));
        if (floors?.length) {
          const { data: unitIds } = await supabase.from('units').select('id').in('floor_id', floors.map(f => f.id));
          if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
        }
      }
    }

    const { data: leasesData, error: lErr } = await query;
    if (lErr) { setError(lErr.message); setLoading(false); return; }
    let leaseList = leasesData || [];
    setLeases(leaseList);

    // Fetch existing invoices for deduplication
    if (leaseList.length > 0) {
      const { data: existingInvs } = await supabase.from('invoices')
        .select('lease_id, invoice_type_ext')
        .in('lease_id', leaseList.map(l => l.id))
        .eq('invoice_type_ext', invoiceType);
      const keys = new Set((existingInvs || []).map(i => `${i.lease_id}:${i.invoice_type_ext}`));
      setExistingInvoices(keys);

      // Fetch VAT configs for all projects
      const projectIds = [...new Set(leaseList.map(l => l.units?.floors?.buildings?.projects?.id).filter(Boolean))];
      if (projectIds.length > 0) {
        const { data: vatData } = await supabase.from('vat_config').select('*').in('project_id', projectIds);
        const vatMap: Record<string, VatConfig> = {};
        (vatData || []).forEach(v => { vatMap[v.project_id] = v; });
        setVatConfigs(vatMap);
      }
    }
    setLoading(false);
  }, [hierarchy, invoiceType]);

  const pendingLeases = leases.filter(l => !existingInvoices.has(`${l.id}:${invoiceType}`));
  const alreadyGenerated = leases.filter(l => existingInvoices.has(`${l.id}:${invoiceType}`));

  const handleGenerate = async () => {
    if (pendingLeases.length === 0) return;
    setGenerating(true); setError(''); setResult(null);
    let generated = 0;
    for (const lease of pendingLeases) {
      const projectId = lease.units?.floors?.buildings?.projects?.id;
      const vatCfg = projectId ? vatConfigs[projectId] : null;
      const vatPct = invoiceType === 'rent' ? (vatCfg?.rent_vat_pct ?? 0) : (vatCfg?.security_deposit_vat_pct ?? 0);
      const baseAmount = invoiceType === 'rent' ? Number(lease.rent_amount) : Number(lease.security_deposit);
      const taxAmount = baseAmount * vatPct / 100;
      const totalAmount = baseAmount + taxAmount;
      const invNum = genInvoiceNumber(invoiceType === 'rent' ? 'INV-RENT' : 'INV-SD');

      const { error: insErr } = await supabase.from('invoices').insert({
        lease_id: lease.id,
        unit_id: lease.unit_id,
        invoice_number: invNum,
        invoice_type: 'rent',
        invoice_type_ext: invoiceType,
        invoice_source: 'lease',
        amount: baseAmount,
        vat_pct: vatPct,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_terms: 'immediate',
        due_date: dueDate || null,
        invoice_period_start: periodStart || null,
        invoice_period_end: periodEnd || null,
        status: 'draft',
      });
      if (!insErr) {
        generated++;
        await logAuditEvent({ entityType: 'invoice', entityId: invNum, entityLabel: invNum, action: 'generated', afterValues: { type: invoiceType, lease_id: lease.id, amount: baseAmount } });
      }
    }
    setGenerating(false);
    setResult({ generated, skipped: alreadyGenerated.length });
    onGenerated();
    fetchLeases();
  };

  const inp = 'w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-700 text-foreground mb-1">{t.inv_lease_invoice_title}</h3>
        <p className="text-[12px] text-muted-foreground">{t.inv_lease_invoice_desc}</p>
      </div>

      <HierarchySelector value={hierarchy} onChange={setHierarchy} label={t.inv_hierarchy_label} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_invoice_type}</label>
          <select className={inp} value={invoiceType} onChange={e => setInvoiceType(e.target.value as any)}>
            <option value="rent">{t.inv_rent_invoice}</option>
            <option value="security_deposit">{t.inv_sd_invoice}</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_due_date}</label>
          <input type="date" className={inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_period_start}</label>
          <input type="date" className={inp} value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_period_end}</label>
          <input type="date" className={inp} value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
        </div>
      </div>

      <button onClick={fetchLeases} disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 disabled:opacity-60 transition-all">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        {loading ? t.inv_loading_leases : t.inv_find_leases}
      </button>

      {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><AlertCircle size={13} />{error}</div>}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-[13px]">
          <p className="font-700 text-green-800">✓ {result.generated} {t.inv_generated_result}</p>
          {result.skipped > 0 && <p className="text-green-700">— {result.skipped} {t.inv_skipped_result}</p>}
        </div>
      )}

      {leases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-600 text-foreground">{leases.length} {t.inv_active_leases_found}</p>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 text-amber-600"><Clock size={12} />{pendingLeases.length} {t.inv_pending}</span>
              <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} />{alreadyGenerated.length} {t.inv_already_generated}</span>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[700px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    {[t.inv_col_unit, t.inv_col_tenant, t.inv_col_project, t.inv_col_amount, t.inv_col_status].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leases.map(l => {
                    const isGenerated = existingInvoices.has(`${l.id}:${invoiceType}`);
                    const amount = invoiceType === 'rent' ? l.rent_amount : l.security_deposit;
                    return (
                      <tr key={l.id} className={isGenerated ? 'bg-green-50/50' : 'hover:bg-secondary/20'}>
                        <td className="px-3 py-2 font-500">{l.units?.unit_name || l.units?.unit_number || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.persons?.name || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.units?.floors?.buildings?.projects?.name || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{amount ? formatCurrencyFull(Number(amount), (l.units?.floors?.buildings?.projects as any)?.currency || 'AED') : '—'}</td>
                        <td className="px-3 py-2">
                          {isGenerated
                            ? <Badge variant="success" size="sm"><CheckCircle size={9} className="inline mr-1" />{t.inv_generated_badge}</Badge>
                            : <Badge variant="warning" size="sm"><Clock size={9} className="inline mr-1" />{t.inv_pending_badge}</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {pendingLeases.length > 0 && (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-600 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {generating ? t.inv_generating_btn : `${t.inv_generate_btn} (${pendingLeases.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AMC Invoice Generation Panel ────────────────────────────────────────────

function AmcInvoicePanel({ onGenerated }: { onGenerated: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [hierarchy, setHierarchy] = useState<HierarchySelection>({ projectId: '', buildingId: '', floorId: '', unitId: '' });
  const [dueDate, setDueDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [leases, setLeases] = useState<Lease[]>([]);
  const [existingInvoices, setExistingInvoices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ generated: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const [vatConfigs, setVatConfigs] = useState<Record<string, VatConfig>>({});

  const fetchLeases = useCallback(async () => {
    setLoading(true); setError(''); setResult(null);
    let query = supabase.from('leases')
      .select('*, units(unit_name, unit_number, floors(name, buildings(name, projects(name, id)))), persons(name)')
      .eq('status', 'active')
      .gt('amc_amount', 0);

    if (hierarchy.unitId) query = query.eq('unit_id', hierarchy.unitId);
    else if (hierarchy.floorId) {
      const { data: unitIds } = await supabase.from('units').select('id').eq('floor_id', hierarchy.floorId);
      if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
    } else if (hierarchy.buildingId) {
      const { data: floors } = await supabase.from('floors').select('id').eq('building_id', hierarchy.buildingId);
      if (floors?.length) {
        const { data: unitIds } = await supabase.from('units').select('id').in('floor_id', floors.map(f => f.id));
        if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
      }
    } else if (hierarchy.projectId) {
      const { data: buildings } = await supabase.from('buildings').select('id').eq('project_id', hierarchy.projectId);
      if (buildings?.length) {
        const { data: floors } = await supabase.from('floors').select('id').in('building_id', buildings.map(b => b.id));
        if (floors?.length) {
          const { data: unitIds } = await supabase.from('units').select('id').in('floor_id', floors.map(f => f.id));
          if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
        }
      }
    }

    const { data: leasesData, error: lErr } = await query;
    if (lErr) { setError(lErr.message); setLoading(false); return; }
    let leaseList = leasesData || [];
    setLeases(leaseList);

    if (leaseList.length > 0) {
      const { data: existingInvs } = await supabase.from('invoices')
        .select('lease_id, invoice_type_ext')
        .in('lease_id', leaseList.map(l => l.id))
        .eq('invoice_type_ext', 'amc');
      const keys = new Set((existingInvs || []).map(i => `${i.lease_id}:amc`));
      setExistingInvoices(keys);

      const projectIds = [...new Set(leaseList.map(l => l.units?.floors?.buildings?.projects?.id).filter(Boolean))];
      if (projectIds.length > 0) {
        const { data: vatData } = await supabase.from('vat_config').select('*').in('project_id', projectIds);
        const vatMap: Record<string, VatConfig> = {};
        (vatData || []).forEach(v => { vatMap[v.project_id] = v; });
        setVatConfigs(vatMap);
      }
    }
    setLoading(false);
  }, [hierarchy]);

  const pendingLeases = leases.filter(l => !existingInvoices.has(`${l.id}:amc`));
  const alreadyGenerated = leases.filter(l => existingInvoices.has(`${l.id}:amc`));

  const handleGenerate = async () => {
    if (pendingLeases.length === 0) return;
    setGenerating(true); setError(''); setResult(null);
    let generated = 0;
    for (const lease of pendingLeases) {
      const projectId = lease.units?.floors?.buildings?.projects?.id;
      const vatCfg = projectId ? vatConfigs[projectId] : null;
      const vatPct = vatCfg?.amc_vat_pct ?? 0;
      const baseAmount = Number(lease.amc_amount);
      const taxAmount = baseAmount * vatPct / 100;
      const totalAmount = baseAmount + taxAmount;
      const invNum = genInvoiceNumber('INV-AMC');

      const { error: insErr } = await supabase.from('invoices').insert({
        lease_id: lease.id,
        unit_id: lease.unit_id,
        invoice_number: invNum,
        invoice_type: 'other',
        invoice_type_ext: 'amc',
        invoice_source: 'amc',
        amount: baseAmount,
        vat_pct: vatPct,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_terms: 'immediate',
        due_date: dueDate || null,
        invoice_period_start: periodStart || null,
        invoice_period_end: periodEnd || null,
        status: 'draft',
      });
      if (!insErr) {
        generated++;
        await logAuditEvent({ entityType: 'invoice', entityId: invNum, entityLabel: invNum, action: 'generated', afterValues: { type: 'amc', lease_id: lease.id, amount: baseAmount } });
      }
    }
    setGenerating(false);
    setResult({ generated, skipped: alreadyGenerated.length });
    onGenerated();
    fetchLeases();
  };

  const inp = 'w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-700 text-foreground mb-1">{t.inv_amc_title}</h3>
        <p className="text-[12px] text-muted-foreground">{t.inv_amc_desc}</p>
      </div>

      <HierarchySelector value={hierarchy} onChange={setHierarchy} label={t.inv_hierarchy_label} />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_due_date}</label>
          <input type="date" className={inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_period_start}</label>
          <input type="date" className={inp} value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_period_end}</label>
          <input type="date" className={inp} value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
        </div>
      </div>

      <button onClick={fetchLeases} disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 disabled:opacity-60 transition-all">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        {loading ? t.inv_loading_leases : t.inv_find_amc}
      </button>

      {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><AlertCircle size={13} />{error}</div>}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-[13px]">
          <p className="font-700 text-green-800">✓ {result.generated} {t.inv_generated_result}</p>
          {result.skipped > 0 && <p className="text-green-700">— {result.skipped} {t.inv_skipped_result}</p>}
        </div>
      )}

      {leases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-600 text-foreground">{leases.length} {t.inv_active_leases_amc}</p>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 text-amber-600"><Clock size={12} />{pendingLeases.length} {t.inv_pending}</span>
              <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} />{alreadyGenerated.length} {t.inv_already_generated}</span>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[700px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    {[t.inv_col_unit, t.inv_col_tenant, t.inv_col_project, t.inv_col_amc_amount, t.inv_col_payment_term, t.inv_col_status].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leases.map(l => {
                    const isGenerated = existingInvoices.has(`${l.id}:amc`);
                    return (
                      <tr key={l.id} className={isGenerated ? 'bg-green-50/50' : 'hover:bg-secondary/20'}>
                        <td className="px-3 py-2 font-500">{l.units?.unit_name || l.units?.unit_number || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.persons?.name || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.units?.floors?.buildings?.projects?.name || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{Number(l.amc_amount).toLocaleString()}</td>
                        <td className="px-3 py-2 text-muted-foreground capitalize">{(l.amc_payment_term || '').replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2">
                          {isGenerated
                            ? <Badge variant="success" size="sm"><CheckCircle size={9} className="inline mr-1" />{t.inv_generated_badge}</Badge>
                            : <Badge variant="warning" size="sm"><Clock size={9} className="inline mr-1" />{t.inv_pending_badge}</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {pendingLeases.length > 0 && (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-600 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {generating ? t.inv_generating_btn : `${t.inv_generate_btn} (${pendingLeases.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Turnover Rent Panel ──────────────────────────────────────────────────────

interface TurnoverRow {
  unit_id: string;
  unit_name: string;
  unit_number: string;
  project_name: string;
  lease_id: string;
  turnover_rent_pct: number;
  monthly_sales: number;
  calculated_amount: number;
  existing_entry_id?: string;
  approval_status?: string;
  invoice_id?: string;
}

function TurnoverRentPanel({ onGenerated }: { onGenerated: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [hierarchy, setHierarchy] = useState<HierarchySelection>({ projectId: '', buildingId: '', floorId: '', unitId: '' });
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [step, setStep] = useState<'select' | 'upload' | 'review'>('select');
  const [csvRows, setCsvRows] = useState<TurnoverRow[]>([]);
  const [editedRows, setEditedRows] = useState<TurnoverRow[]>([]);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedForInvoice, setSelectedForInvoice] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ generated: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Generate CSV template
  const handleGenerateCsv = async () => {
    setLoadingCsv(true); setError('');
    // Find all MALL units with active leases in the selected hierarchy
    let unitQuery = supabase.from('units').select('id, unit_name, unit_number, floor_id, floors(name, buildings(name, project_id, projects(name)))').eq('usage_type', 'mall');

    if (hierarchy.unitId) unitQuery = unitQuery.eq('id', hierarchy.unitId);
    else if (hierarchy.floorId) unitQuery = unitQuery.eq('floor_id', hierarchy.floorId);
    else if (hierarchy.buildingId) {
      const { data: floors } = await supabase.from('floors').select('id').eq('building_id', hierarchy.buildingId);
      if (floors?.length) unitQuery = unitQuery.in('floor_id', floors.map(f => f.id));
    } else if (hierarchy.projectId) {
      const { data: buildings } = await supabase.from('buildings').select('id').eq('project_id', hierarchy.projectId);
      if (buildings?.length) {
        const { data: floors } = await supabase.from('floors').select('id').in('building_id', buildings.map(b => b.id));
        if (floors?.length) unitQuery = unitQuery.in('floor_id', floors.map(f => f.id));
      }
    }

    const { data: mallUnits, error: uErr } = await unitQuery;
    if (uErr) { setError(uErr.message); setLoadingCsv(false); return; }

    if (!mallUnits?.length) { setError('No MALL category units found in the selected hierarchy.'); setLoadingCsv(false); return; }

    // Find active leases for these units
    const { data: activeLeases } = await supabase.from('leases')
      .select('id, unit_id, turnover_rent_pct')
      .in('unit_id', mallUnits.map(u => u.id))
      .eq('status', 'active');

    const leaseMap: Record<string, { lease_id: string; turnover_rent_pct: number }> = {};
    (activeLeases || []).forEach(l => { leaseMap[l.unit_id] = { lease_id: l.id, turnover_rent_pct: l.turnover_rent_pct || 0 }; });

    // Check existing entries for this month/year
    const { data: existingEntries } = await supabase.from('turnover_rent')
      .select('id, unit_id, monthly_sales, approval_status, invoice_id')
      .in('unit_id', mallUnits.map(u => u.id))
      .eq('month', selMonth).eq('year', selYear);
    const existingMap: Record<string, any> = {};
    (existingEntries || []).forEach(e => { existingMap[e.unit_id] = e; });

    const rows: TurnoverRow[] = mallUnits
      .filter(u => leaseMap[u.id])
      .map(u => {
        const lease = leaseMap[u.id];
        const existing = existingMap[u.id];
        const sales = existing?.monthly_sales || 0;
        const pct = lease.turnover_rent_pct;
        return {
          unit_id: u.id,
          unit_name: u.unit_name || u.unit_number || '',
          unit_number: u.unit_number || '',
          project_name: (u as any).floors?.buildings?.projects?.name || '',
          lease_id: lease.lease_id,
          turnover_rent_pct: pct,
          monthly_sales: sales,
          calculated_amount: sales * pct / 100,
          existing_entry_id: existing?.id,
          approval_status: existing?.approval_status,
          invoice_id: existing?.invoice_id,
        };
      });

    if (!rows.length) { setError('No MALL units with active leases found.'); setLoadingCsv(false); return; }

    setCsvRows(rows);
    setEditedRows(rows.map(r => ({ ...r })));
    setLoadingCsv(false);

    // Download CSV
    const header = 'unit_id,unit_name,unit_number,project_name,turnover_rent_pct,monthly_sales';
    const csvContent = [header, ...rows.map(r => `${r.unit_id},"${r.unit_name}","${r.unit_number}","${r.project_name}",${r.turnover_rent_pct},${r.monthly_sales}`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `turnover_${selYear}_${String(selMonth).padStart(2, '0')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setStep('upload');
  };

  // Step 2: Parse uploaded CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n');
      const header = lines[0].split(',');
      const unitIdIdx = header.indexOf('unit_id');
      const salesIdx = header.indexOf('monthly_sales');
      if (unitIdIdx === -1 || salesIdx === -1) { setError('CSV must have unit_id and monthly_sales columns'); return; }

      const updatedRows = editedRows.map(row => {
        const matchLine = lines.slice(1).find(l => {
          const cols = l.split(',');
          return cols[unitIdIdx]?.trim() === row.unit_id;
        });
        if (matchLine) {
          const cols = matchLine.split(',');
          const sales = parseFloat(cols[salesIdx]) || 0;
          return { ...row, monthly_sales: sales, calculated_amount: sales * row.turnover_rent_pct / 100 };
        }
        return row;
      });
      setEditedRows(updatedRows);
      setStep('review');
    };
    reader.readAsText(file);
  };

  // Save turnover data
  const handleSaveData = async () => {
    setSaving(true); setError('');
    for (const row of editedRows) {
      const calcAmount = row.monthly_sales * row.turnover_rent_pct / 100;
      const payload = {
        unit_id: row.unit_id,
        lease_id: row.lease_id,
        month: selMonth,
        year: selYear,
        monthly_sales: row.monthly_sales,
        turnover_rent_pct: row.turnover_rent_pct,
        calculated_amount: calcAmount,
        status: 'draft',
        approval_status: 'pending',
      };
      if (row.existing_entry_id) {
        await supabase.from('turnover_rent').update(payload).eq('id', row.existing_entry_id);
      } else {
        await supabase.from('turnover_rent').upsert(payload, { onConflict: 'unit_id,month,year' });
      }
    }
    // Refresh rows
    const { data: refreshed } = await supabase.from('turnover_rent')
      .select('id, unit_id, monthly_sales, approval_status, invoice_id, calculated_amount')
      .in('unit_id', editedRows.map(r => r.unit_id))
      .eq('month', selMonth).eq('year', selYear);
    const refreshMap: Record<string, any> = {};
    (refreshed || []).forEach(r => { refreshMap[r.unit_id] = r; });
    setEditedRows(prev => prev.map(r => {
      const ref = refreshMap[r.unit_id];
      return ref ? { ...r, existing_entry_id: ref.id, approval_status: ref.approval_status, invoice_id: ref.invoice_id, calculated_amount: ref.calculated_amount } : r;
    }));
    setSaving(false);
  };

  // Generate invoices for selected approved rows
  const handleGenerateInvoices = async () => {
    const toGenerate = editedRows.filter(r => selectedForInvoice.has(r.unit_id) && !r.invoice_id);
    if (!toGenerate.length) return;
    setGenerating(true); setError('');
    let generated = 0;
    for (const row of toGenerate) {
      const invNum = genInvoiceNumber('INV-TO');
      const { data: invData } = await supabase.from('invoices').insert({
        invoice_number: invNum,
        invoice_type: 'rent',
        invoice_type_ext: 'turnover_rent',
        invoice_source: 'turnover_rent',
        unit_id: row.unit_id,
        lease_id: row.lease_id,
        amount: row.calculated_amount,
        tax_amount: 0,
        total_amount: row.calculated_amount,
        vat_pct: 0,
        due_date: `${selYear}-${String(selMonth).padStart(2, '0')}-28`,
        status: 'issued',
        invoice_period_start: `${selYear}-${String(selMonth).padStart(2, '0')}-01`,
        invoice_period_end: `${selYear}-${String(selMonth).padStart(2, '0')}-28`,
      }).select('id').single();

      if (invData?.id && row.existing_entry_id) {
        await supabase.from('turnover_rent').update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          status: 'invoiced',
          invoice_id: invData.id,
        }).eq('id', row.existing_entry_id);
        generated++;
      }
    }
    setGenerating(false);
    setResult({ generated });
    setSelectedForInvoice(new Set());
    onGenerated();
    handleSaveData();
  };

  const inp = 'w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-700 text-foreground mb-1">{t.inv_turnover_title}</h3>
        <p className="text-[12px] text-muted-foreground">{t.inv_turnover_desc}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-[12px]">
        {(['select', 'upload', 'review'] as const).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-500 ${step === s ? 'bg-primary text-white' : step > s || (step === 'review' && s === 'upload') ? 'bg-green-100 text-green-700' : 'bg-secondary text-foreground'}`}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-700 bg-white/30">{i + 1}</span>
              {s === 'select' ? t.inv_turnover_step1 : s === 'upload' ? t.inv_turnover_step2 : t.inv_turnover_step3}
            </div>
            {i < 2 && <ChevronRight size={14} className="text-muted-foreground" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1 */}
      {step === 'select' && (
        <div className="space-y-4">
          <HierarchySelector value={hierarchy} onChange={setHierarchy} label={t.inv_hierarchy_label} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_month}</label>
              <select className={inp} value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_year}</label>
              <select className={inp} value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><AlertCircle size={13} />{error}</div>}
          <button onClick={handleGenerateCsv} disabled={loadingCsv}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-600 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {loadingCsv ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {loadingCsv ? t.inv_downloading : t.inv_download_csv}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-[13px] text-blue-800">
            <p className="font-600 mb-1">{t.inv_csv_downloaded}</p>
            <p>{t.inv_csv_fill_hint}</p>
          </div>
          {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><AlertCircle size={13} />{error}</div>}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-[13px] font-500 text-foreground">{t.inv_upload_csv}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{t.inv_upload_hint}</p>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('select')} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_back}</button>
            <button onClick={() => setStep('review')} className="px-4 py-2.5 text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 transition-all">{t.inv_skip_manual}</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 'review' && editedRows.length > 0 && (
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><AlertCircle size={13} />{error}</div>}
          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-[13px]">
              <p className="font-700 text-green-800">✓ {result.generated} {t.inv_generated_result}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[13px] font-600 text-foreground">{MONTHS[selMonth - 1]} {selYear} — {editedRows.length} MALL unit(s)</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedForInvoice(new Set(editedRows.filter(r => !r.invoice_id).map(r => r.unit_id)))}
                className="text-[11px] text-primary underline">{t.inv_select_all}</button>
              <button onClick={() => setSelectedForInvoice(new Set())}
                className="text-[11px] text-muted-foreground underline">{t.inv_clear}</button>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[700px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    {[t.inv_col_unit, t.inv_col_project, t.inv_col_to_pct, t.inv_col_monthly_sales, t.inv_col_calculated, t.inv_col_status].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {editedRows.map((row, idx) => (
                    <tr key={row.unit_id} className={row.invoice_id ? 'bg-green-50/50' : 'hover:bg-secondary/20'}>
                      <td className="px-3 py-2">
                        {!row.invoice_id && (
                          <input type="checkbox" checked={selectedForInvoice.has(row.unit_id)}
                            onChange={e => {
                              const next = new Set(selectedForInvoice);
                              e.target.checked ? next.add(row.unit_id) : next.delete(row.unit_id);
                              setSelectedForInvoice(next);
                            }}
                            className="rounded border-border" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-500">{row.unit_name || row.unit_number}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.project_name}</td>
                      <td className="px-3 py-2 tabular-nums">{row.turnover_rent_pct}%</td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0"
                          className="w-32 px-2 py-1 text-[12px] bg-background border border-border rounded outline-none focus:border-primary"
                          value={editedRows[idx].monthly_sales}
                          onChange={e => {
                            const sales = parseFloat(e.target.value) || 0;
                            setEditedRows(prev => prev.map((r, i) => i === idx ? { ...r, monthly_sales: sales, calculated_amount: sales * r.turnover_rent_pct / 100 } : r));
                          }} />
                      </td>
                      <td className="px-3 py-2 tabular-nums font-600 text-primary">AED {Number(row.calculated_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2">
                        {row.invoice_id
                          ? <Badge variant="success" size="sm"><Lock size={9} className="inline mr-1" />{t.inv_invoiced_badge}</Badge>
                          : row.approval_status === 'approved'
                            ? <Badge variant="info" size="sm">{t.inv_approved_badge}</Badge>
                            : <Badge variant="warning" size="sm">{t.inv_pending_badge}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep('upload')} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_back}</button>
            <button onClick={() => setStep('review')} className="px-4 py-2.5 text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 transition-all">{t.inv_skip_manual}</button>
            <button onClick={handleSaveData} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 disabled:opacity-60 transition-all">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              {saving ? t.inv_saving : t.inv_save_sales}
            </button>
            {selectedForInvoice.size > 0 && (
              <button onClick={handleGenerateInvoices} disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-600 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {generating ? t.inv_generating_btn : `${t.inv_generate_btn} (${selectedForInvoice.size})`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Invoice Creation Panel ─────────────────────────────────────────────

interface BulkEntry {
  lease_id: string;
  lease_number: string;
  unit_name: string;
  lessee: string;
  current_rent: number;
  current_sd: number;
  current_to_pct: number;
  rent_revision_pct: number;
  sd_revision_pct: number;
  to_revision_pct: number;
}

function BulkInvoicePanel({ onGenerated }: { onGenerated: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [hierarchy, setHierarchy] = useState<HierarchySelection>({ projectId: '', buildingId: '', floorId: '', unitId: '' });
  const [selUsageType, setSelUsageType] = useState('all');
  const [invoiceType, setInvoiceType] = useState<'rent' | 'security_deposit'>('rent');
  const [dueDate, setDueDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [entries, setEntries] = useState<BulkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ generated: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const [vatConfigs, setVatConfigs] = useState<Record<string, VatConfig>>({});
  const [existingInvoices, setExistingInvoices] = useState<Set<string>>(new Set());

  const fetchLeases = useCallback(async () => {
    if (!hierarchy.projectId) { setError('Please select at least a project'); return; }
    setLoading(true); setError(''); setResult(null);

    let query = supabase.from('leases')
      .select('*, units(unit_name, unit_number, usage_type, floors(name, buildings(name, projects(name, id)))), persons(name)')
      .eq('status', 'active');

    if (hierarchy.unitId) query = query.eq('unit_id', hierarchy.unitId);
    else if (hierarchy.floorId) {
      const { data: unitIds } = await supabase.from('units').select('id').eq('floor_id', hierarchy.floorId);
      if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
    } else if (hierarchy.buildingId) {
      const { data: floors } = await supabase.from('floors').select('id').eq('building_id', hierarchy.buildingId);
      if (floors?.length) {
        const { data: unitIds } = await supabase.from('units').select('id').in('floor_id', floors.map(f => f.id));
        if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
      }
    } else if (hierarchy.projectId) {
      const { data: buildings } = await supabase.from('buildings').select('id').eq('project_id', hierarchy.projectId);
      if (buildings?.length) {
        const { data: floors } = await supabase.from('floors').select('id').in('building_id', buildings.map(b => b.id));
        if (floors?.length) {
          const { data: unitIds } = await supabase.from('units').select('id').in('floor_id', floors.map(f => f.id));
          if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
        }
      }
    }

    const { data: leasesData, error: lErr } = await query;
    if (lErr) { setError(lErr.message); setLoading(false); return; }

    let leaseList = (leasesData || []) as any[];
    if (selUsageType !== 'all') {
      leaseList = leaseList.filter(l => l.units?.usage_type === selUsageType);
    }

    // Fetch existing invoices for deduplication
    if (leaseList.length > 0) {
      const { data: existingInvs } = await supabase.from('invoices')
        .select('lease_id, invoice_type_ext')
        .in('lease_id', leaseList.map((l: any) => l.id))
        .eq('invoice_type_ext', invoiceType);
      const keys = new Set((existingInvs || []).map(i => `${i.lease_id}:${i.invoice_type_ext}`));
      setExistingInvoices(keys);

      const projectIds = [...new Set(leaseList.map((l: any) => l.units?.floors?.buildings?.projects?.id).filter(Boolean))];
      if (projectIds.length > 0) {
        const { data: vatData } = await supabase.from('vat_config').select('*').in('project_id', projectIds as string[]);
        const vatMap: Record<string, VatConfig> = {};
        (vatData || []).forEach((v: VatConfig) => { vatMap[v.project_id] = v; });
        setVatConfigs(vatMap);
      }
    }

    setEntries(leaseList.map((l: any) => ({
      lease_id: l.id,
      lease_number: l.lease_number || '—',
      unit_name: l.units?.unit_name || l.units?.unit_number || '—',
      lessee: l.persons?.name || '—',
      current_rent: Number(l.rent_amount),
      current_sd: Number(l.security_deposit),
      current_to_pct: Number(l.turnover_rent_pct),
      rent_revision_pct: 0,
      sd_revision_pct: 0,
      to_revision_pct: 0,
    })));
    setLoading(false);
  }, [hierarchy, selUsageType, invoiceType]);

  const updateEntry = (idx: number, field: keyof BulkEntry, value: any) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const pendingEntries = entries.filter(e => !existingInvoices.has(`${e.lease_id}:${invoiceType}`));
  const alreadyGenerated = entries.filter(e => existingInvoices.has(`${e.lease_id}:${invoiceType}`));

  const handleGenerate = async () => {
    if (pendingEntries.length === 0) return;
    setGenerating(true); setError(''); setResult(null);
    let generated = 0;

    for (const entry of pendingEntries) {
      const baseAmount = invoiceType === 'rent'
        ? entry.current_rent * (1 + entry.rent_revision_pct / 100)
        : entry.current_sd * (1 + entry.sd_revision_pct / 100);

      const invNum = genInvoiceNumber(invoiceType === 'rent' ? 'INV-RENT' : 'INV-SD');
      const { error: insErr } = await supabase.from('invoices').insert({
        lease_id: entry.lease_id,
        invoice_number: invNum,
        invoice_type: 'rent',
        invoice_type_ext: invoiceType,
        invoice_source: 'bulk',
        amount: baseAmount,
        vat_pct: 0,
        tax_amount: 0,
        total_amount: baseAmount,
        payment_terms: 'immediate',
        due_date: dueDate || null,
        invoice_period_start: periodStart || null,
        invoice_period_end: periodEnd || null,
        status: 'draft',
      });
      if (!insErr) generated++;
    }

    setGenerating(false);
    setResult({ generated, skipped: alreadyGenerated.length });
    onGenerated();
    fetchLeases();
  };

  const inp = 'w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-700 text-foreground mb-1">{t.inv_bulk_title}</h3>
        <p className="text-[12px] text-muted-foreground">{t.inv_bulk_desc}</p>
      </div>

      <HierarchySelector value={hierarchy} onChange={setHierarchy} label={t.inv_hierarchy_label} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_usage_type}</label>
          <select className={inp} value={selUsageType} onChange={e => setSelUsageType(e.target.value)}>
            <option value="all">{t.inv_all_types}</option>
            {['office', 'retail', 'mall', 'residential'].map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_invoice_type}</label>
          <select className={inp} value={invoiceType} onChange={e => setInvoiceType(e.target.value as any)}>
            <option value="rent">{t.inv_rent_invoice}</option>
            <option value="security_deposit">{t.inv_sd_invoice}</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_due_date}</label>
          <input type="date" className={inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_period_start}</label>
          <input type="date" className={inp} value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-foreground mb-1">{t.inv_period_end}</label>
          <input type="date" className={inp} value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
        </div>
      </div>

      <button onClick={fetchLeases} disabled={loading || !hierarchy.projectId}
        className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 disabled:opacity-60 transition-all">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        {loading ? t.inv_loading_leases : t.inv_find_leases}
      </button>

      {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><AlertCircle size={13} />{error}</div>}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-[13px]">
          <p className="font-700 text-green-800">✓ {result.generated} {t.inv_generated_result}</p>
          {result.skipped > 0 && <p className="text-green-700">— {result.skipped} {t.inv_skipped_result}</p>}
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-600 text-foreground">{entries.length} {t.inv_bulk_leases_found}</p>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 text-amber-600"><Clock size={12} />{pendingEntries.length} {t.inv_pending}</span>
              <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} />{alreadyGenerated.length} {t.inv_already_generated}</span>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]" style={{ minWidth: '900px' }}>
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    {[t.inv_col_lease_no, t.inv_col_unit, t.inv_col_tenant, t.inv_col_current_rent, t.inv_col_rent_rev, t.inv_col_new_rent, t.inv_col_current_sd, t.inv_col_sd_rev, t.inv_col_status].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry, idx) => {
                    const isGenerated = existingInvoices.has(`${entry.lease_id}:${invoiceType}`);
                    const newRent = entry.current_rent * (1 + entry.rent_revision_pct / 100);
                    return (
                      <tr key={entry.lease_id} className={isGenerated ? 'bg-green-50/50' : 'hover:bg-secondary/20'}>
                        <td className="px-3 py-2 font-mono text-[11px] text-primary font-600">{entry.lease_number}</td>
                        <td className="px-3 py-2 font-500">{entry.unit_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{entry.lessee}</td>
                        <td className="px-3 py-2 tabular-nums">AED {entry.current_rent.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          {!isGenerated ? (
                            <input type="number" step="0.01" value={entry.rent_revision_pct}
                              onChange={e => updateEntry(idx, 'rent_revision_pct', Number(e.target.value))}
                              className="w-16 px-2 py-1 text-[11px] border border-border rounded outline-none focus:border-primary text-center" />
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-600 text-primary">AED {newRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">AED {entry.current_sd.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          {!isGenerated ? (
                            <input type="number" step="0.01" value={entry.sd_revision_pct}
                              onChange={e => updateEntry(idx, 'sd_revision_pct', Number(e.target.value))}
                              className="w-16 px-2 py-1 text-[11px] border border-border rounded outline-none focus:border-primary text-center" />
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {isGenerated
                            ? <Badge variant="success" size="sm"><CheckCircle size={9} className="inline mr-1" />{t.inv_generated_badge}</Badge>
                            : <Badge variant="warning" size="sm"><Clock size={9} className="inline mr-1" />{t.inv_pending_badge}</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {pendingEntries.length > 0 && (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-600 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {generating ? t.inv_generating_btn : `${t.inv_generate_btn} (${pendingEntries.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Invoice List Panel ───────────────────────────────────────────────────────

function InvoiceListPanel({ refresh }: { refresh: number }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds, authLoading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchData = useCallback(async () => {
    // Wait for auth context to finish loading before fetching
    if (authLoading) return;

    setLoading(true); setFetchError('');
    // If staff user with no assigned projects, show nothing
    if (assignedProjectIds !== null && assignedProjectIds.length === 0) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from('invoices')
      .select('*, units(unit_name, unit_number, floors(buildings(project_id, projects(id, currency)))), tenants(full_name)')
      .order('created_at', { ascending: false });
    if (error) setFetchError(error.message);

    let invoiceList = (data || []) as Invoice[];

    // Filter by assigned projects for staff users
    if (assignedProjectIds !== null && assignedProjectIds.length > 0) {
      invoiceList = invoiceList.filter((inv: any) => {
        const projectId = inv.units?.floors?.buildings?.project_id;
        return projectId && assignedProjectIds.includes(projectId);
      });
    }

    // Auto-mark overdue: any invoice with due_date < today that is not paid/cancelled
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueIds = invoiceList
      .filter(inv => inv.due_date && inv.due_date < todayStr && !['paid', 'cancelled', 'overdue'].includes(inv.status))
      .map(inv => inv.id);

    if (overdueIds.length > 0) {
      await supabase.from('invoices').update({ status: 'overdue' }).in('id', overdueIds);
      // Update local list to reflect new status immediately
      invoiceList = invoiceList.map(inv =>
        overdueIds.includes(inv.id) ? { ...inv, status: 'overdue' } : inv
      );
    }

    setInvoices(invoiceList);
    setLoading(false);
  }, [assignedProjectIds, authLoading]);

  // Refetch when navigating back to this page
  useAutoRefresh('invoices', fetchData);

  useEffect(() => { fetchData(); }, [fetchData, refresh]);

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) || inv.units?.unit_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchType = filterType === 'all' || inv.invoice_type_ext === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const totalOutstanding = invoices.filter(i => ['draft', 'sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total_amount), 0);
  const totalCollected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: t.inv_list_total, value: invoices.length.toString(), color: 'text-foreground' },
          { label: t.inv_list_outstanding, value: `${totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-amber-600' },
          { label: t.inv_list_collected, value: `${totalCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-green-600' },
          { label: t.inv_list_overdue, value: invoices.filter(i => i.status === 'overdue').length.toString(), color: 'text-destructive' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-border shadow-card p-4">
            <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{c.label}</p>
            <p className={`text-[20px] font-700 mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {fetchError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive"><X size={14} />{fetchError}<button onClick={fetchData} className="ml-auto text-[12px] underline">{t.btn_retry}</button></div>}

      <div className="bg-white rounded-xl border border-border shadow-card p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder={t.inv_search_placeholder} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-muted-foreground" />
          {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 text-[11px] font-500 rounded-lg border transition-all ${filterStatus === s ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'rent', 'security_deposit', 'amc', 'turnover_rent'].map(tp => (
            <button key={tp} onClick={() => setFilterType(tp)}
              className={`px-2.5 py-1 text-[11px] font-500 rounded-lg border transition-all ${filterType === tp ? 'bg-secondary text-foreground border-foreground/30' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
              {tp === 'all' ? t.inv_all_types : tp.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
        <button onClick={fetchData} className="ml-auto flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
          <RefreshCw size={13} /> {t.btn_refresh}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6"><LoadingSkeleton rows={5} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title={t.inv_empty_title} description={t.inv_empty_desc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[900px]">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  {[t.inv_col_invoice_no, t.inv_col_unit, t.inv_col_type, t.inv_col_period, t.inv_col_amount, t.inv_col_vat, t.inv_col_total, t.inv_col_status, t.inv_col_due_date, ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(inv => {
                  const invCurrency = (inv as any).units?.floors?.buildings?.projects?.currency || 'AED';
                  return (
                  <tr key={inv.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] text-primary font-600">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-500">{inv.units?.unit_name || inv.units?.unit_number || '—'}</td>
                    <td className="px-4 py-3 capitalize text-[12px]">{(inv.invoice_type_ext || '').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                      {inv.invoice_period_start ? `${inv.invoice_period_start} → ${inv.invoice_period_end}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrencyFull(Number(inv.amount), invCurrency)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{inv.vat_pct || 0}%</td>
                    <td className="px-4 py-3 tabular-nums font-600">{formatCurrencyFull(Number(inv.total_amount), invCurrency)}</td>
                    <td className="px-4 py-3"><Badge variant={statusColors[inv.status] as any || 'default'} size="sm">{inv.status}</Badge></td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{inv.due_date || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedInvoice({ ...inv, currency: invCurrency } as any)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceDetailModal invoice={selectedInvoice} open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} onUpdated={fetchData} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SidebarTab = 'list' | 'lease' | 'amc' | 'turnover' | 'bulk';

export default function InvoicingClient() {
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const [activeTab, setActiveTab] = useState<SidebarTab>('list');
  const [showVat, setShowVat] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const handleGenerated = () => setRefreshCount(c => c + 1);

  const sidebarItems: { id: SidebarTab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'list', label: t.inv_sidebar_all, icon: FileText, description: t.inv_sidebar_all_desc },
    { id: 'lease', label: t.inv_sidebar_lease, icon: DollarSign, description: t.inv_sidebar_lease_desc },
    { id: 'amc', label: t.inv_sidebar_amc, icon: Settings, description: t.inv_sidebar_amc_desc },
    { id: 'turnover', label: t.inv_sidebar_turnover, icon: TrendingUp, description: t.inv_sidebar_turnover_desc },
    { id: 'bulk', label: t.inv_sidebar_bulk, icon: RefreshCw, description: t.inv_sidebar_bulk_desc },
  ];

  const active = sidebarItems.find(i => i.id === activeTab)!;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.inv_title}</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.inv_subtitle}</p>
        </div>
        <button onClick={() => setShowVat(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 active:scale-95 transition-all shrink-0">
          <DollarSign size={14} /> <span className="hidden sm:inline">{t.inv_vat_config}</span><span className="sm:hidden">VAT</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Sidebar — horizontal scrollable tabs on mobile */}
        <div className="lg:w-64 lg:shrink-0">
          <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{t.inv_creation_label}</p>
            </div>
            {/* Mobile: horizontal scroll tabs */}
            <div className="flex lg:hidden overflow-x-auto p-2 gap-1">
              {sidebarItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-left transition-all whitespace-nowrap shrink-0 ${activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary/60'}`}>
                  <item.icon size={14} className={activeTab === item.id ? 'text-primary' : 'text-muted-foreground'} />
                  <span className="text-[12px] font-500">{item.label}</span>
                </button>
              ))}
            </div>
            {/* Desktop: vertical nav */}
            <nav className="hidden lg:block p-2 space-y-0.5">
              {sidebarItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all ${activeTab === item.id ? 'bg-primary/8 text-primary' : 'text-foreground hover:bg-secondary/60'}`}>
                  <item.icon size={16} className={`mt-0.5 shrink-0 ${activeTab === item.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className={`text-[13px] font-500 leading-tight ${activeTab === item.id ? 'text-primary' : ''}`}>{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeTab !== 'list' && (
            <div className="bg-white rounded-xl border border-border shadow-card p-4 sm:p-6 mb-4 sm:mb-5">
              {activeTab === 'lease' && <LeaseInvoicePanel onGenerated={handleGenerated} />}
              {activeTab === 'amc' && <AmcInvoicePanel onGenerated={handleGenerated} />}
              {activeTab === 'turnover' && <TurnoverRentPanel onGenerated={handleGenerated} />}
              {activeTab === 'bulk' && <BulkInvoicePanel onGenerated={handleGenerated} />}
            </div>
          )}
          <InvoiceListPanel refresh={refreshCount} />
        </div>
      </div>

      <VatConfigModal open={showVat} onClose={() => setShowVat(false)} onSaved={() => {}} />
    </div>
  );
}
