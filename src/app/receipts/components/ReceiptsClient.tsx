'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Receipt, Search, Filter, CreditCard, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight, Loader2, FileText, RefreshCw, Banknote, Landmark, Smartphone, Check } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type_ext: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  due_date: string | null;
  status: string;
  created_at: string;
  lease_id?: string;
  unit_id?: string;
  units?: { unit_name: string; unit_number: string; floors?: { name: string; buildings?: { name: string; projects?: { name: string; id: string } } } };
  leases?: { persons?: { name: string } };
  paid_amount?: number;
  balance?: number;
}

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  receipt_number?: string;
  cheque_number?: string;
  cheque_date?: string;
  bank_name?: string;
  transfer_reference?: string;
  online_transaction_id?: string;
  online_gateway?: string;
  notes?: string;
  is_reconciled?: boolean;
  created_at: string;
}

interface HierarchySelection {
  projectId: string;
  buildingId: string;
  floorId: string;
  unitId: string;
}

// ─── Payment method options from Master Lookup ────────────────────────────────
const PAYMENT_METHODS = ['Cash', 'Cheque', 'Bank Transfer', 'Online Payment'];

const paymentMethodKey = (m: string) => m.toLowerCase().replace(/\s+/g, '_');

// ─── Hierarchy Selector ───────────────────────────────────────────────────────

function HierarchySelector({ value, onChange }: { value: HierarchySelection; onChange: (v: HierarchySelection) => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('projects').select('id, name').order('name').then(({ data }) => setProjects(data || []));
  }, []);

  useEffect(() => {
    if (!value.projectId) { setBuildings([]); setFloors([]); setUnits([]); return; }
    supabase.from('buildings').select('id, name').eq('project_id', value.projectId).order('name')
      .then(({ data }) => setBuildings(data || []));
  }, [value.projectId]);

  useEffect(() => {
    if (!value.buildingId) { setFloors([]); setUnits([]); return; }
    supabase.from('floors').select('id, name').eq('building_id', value.buildingId).order('name')
      .then(({ data }) => setFloors(data || []));
  }, [value.buildingId]);

  useEffect(() => {
    if (!value.floorId) { setUnits([]); return; }
    supabase.from('units').select('id, unit_name, unit_number').eq('floor_id', value.floorId).order('unit_number')
      .then(({ data }) => setUnits(data || []));
  }, [value.floorId]);

  const sel = 'w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div>
        <label className="block text-[11px] font-500 text-foreground mb-1">{t.lbl_project}</label>
        <select className={sel} value={value.projectId} onChange={e => onChange({ projectId: e.target.value, buildingId: '', floorId: '', unitId: '' })}>
          <option value="">{t.lbl_all_projects}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-500 text-foreground mb-1">{t.lbl_building}</label>
        <select className={sel} value={value.buildingId} onChange={e => onChange({ ...value, buildingId: e.target.value, floorId: '', unitId: '' })} disabled={!value.projectId}>
          <option value="">{t.lbl_all_buildings}</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-500 text-foreground mb-1">{t.lbl_floor}</label>
        <select className={sel} value={value.floorId} onChange={e => onChange({ ...value, floorId: e.target.value, unitId: '' })} disabled={!value.buildingId}>
          <option value="">{t.lbl_all_floors}</option>
          {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-500 text-foreground mb-1">{t.lbl_unit}</label>
        <select className={sel} value={value.unitId} onChange={e => onChange({ ...value, unitId: e.target.value })} disabled={!value.floorId}>
          <option value="">{t.lbl_all_units}</option>
          {units.map(u => <option key={u.id} value={u.id}>{u.unit_name || u.unit_number}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({
  invoice,
  open,
  onClose,
  onSaved,
}: {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    reference_number: '',
    notes: '',
    // Cheque fields
    cheque_number: '',
    cheque_date: '',
    bank_name: '',
    // Bank Transfer fields
    transfer_reference: '',
    // Online Payment fields
    online_transaction_id: '',
    online_gateway: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && invoice) {
      setForm(f => ({
        ...f,
        amount: String(invoice.balance ?? invoice.total_amount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        reference_number: '',
        notes: '',
        cheque_number: '',
        cheque_date: '',
        bank_name: '',
        transfer_reference: '',
        online_transaction_id: '',
        online_gateway: '',
      }));
      setError('');
    }
  }, [open, invoice]);

  if (!invoice) return null;

  const balance = invoice.balance ?? invoice.total_amount;
  const enteredAmount = parseFloat(form.amount) || 0;
  const isOverPayment = enteredAmount > balance;

  const handleSave = async () => {
    setError('');
    if (!form.amount || enteredAmount <= 0) { setError(t.rec_enter_amount); return; }
    if (isOverPayment) { setError(t.rec_exceed_balance); return; }
    if (!form.payment_date) { setError(t.rec_payment_date); return; }

    // Validate method-specific fields
    if (form.payment_method === 'Cheque' && !form.cheque_number.trim()) { setError(t.rec_cheque_number); return; }
    if (form.payment_method === 'Bank Transfer' && !form.transfer_reference.trim()) { setError(t.rec_transfer_ref); return; }
    if (form.payment_method === 'Online Payment' && !form.online_transaction_id.trim()) { setError(t.rec_transaction_id); return; }

    setSaving(true);

    // Generate receipt number
    const receiptNum = `RCP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;

    const paymentData: any = {
      invoice_id: invoice.id,
      amount: enteredAmount,
      payment_date: form.payment_date,
      payment_method: paymentMethodKey(form.payment_method),
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      receipt_number: receiptNum,
    };

    if (form.payment_method === 'Cheque') {
      paymentData.cheque_number = form.cheque_number;
      paymentData.cheque_date = form.cheque_date || null;
      paymentData.bank_name = form.bank_name || null;
    } else if (form.payment_method === 'Bank Transfer') {
      paymentData.transfer_reference = form.transfer_reference;
      paymentData.bank_name = form.bank_name || null;
    } else if (form.payment_method === 'Online Payment') {
      paymentData.online_transaction_id = form.online_transaction_id;
      paymentData.online_gateway = form.online_gateway || null;
    }

    const { error: insErr } = await supabase.from('payments').insert(paymentData);
    if (insErr) { setError(insErr.message); setSaving(false); return; }

    // Update invoice status
    const newPaidAmount = (invoice.paid_amount || 0) + enteredAmount;
    const newBalance = invoice.total_amount - newPaidAmount;
    let newStatus = invoice.status;
    if (newBalance <= 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partially_paid';
    }

    await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id);

    setSaving(false);
    onSaved();
    onClose();
  };

  const inp = 'w-full px-3 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const lbl = 'block text-[11px] font-500 text-foreground mb-1';

  return (
    <Modal open={open} onClose={onClose} title={t.rec_record_payment} subtitle={`Invoice ${invoice.invoice_number}`} size="md">
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}

        {/* Invoice summary */}
        <div className="p-3 bg-secondary/50 rounded-xl grid grid-cols-3 gap-3 text-[12px]">
          <div><span className="text-muted-foreground block">{t.rec_invoice_total}</span><span className="font-600">AED {Number(invoice.total_amount).toLocaleString()}</span></div>
          <div><span className="text-muted-foreground block">{t.rec_paid}</span><span className="font-600 text-green-700">AED {Number(invoice.paid_amount || 0).toLocaleString()}</span></div>
          <div><span className="text-muted-foreground block">{t.rec_balance}</span><span className="font-700 text-primary">AED {Number(balance).toLocaleString()}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>{t.rec_payment_amount}</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              className={`${inp} ${isOverPayment ? 'border-destructive' : ''}`}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
            {isOverPayment && <p className="text-[11px] text-destructive mt-1">{t.rec_exceeds_balance}</p>}
          </div>
          <div>
            <label className={lbl}>{t.rec_payment_date}</label>
            <input type="date" className={inp} value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className={lbl}>{t.rec_payment_method}</label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(method => (
              <button
                key={method}
                type="button"
                onClick={() => setForm(f => ({ ...f, payment_method: method }))}
                className={`flex items-center gap-2 px-3 py-2.5 text-[12px] font-500 rounded-lg border transition-all ${
                  form.payment_method === method
                    ? 'bg-primary/10 border-primary text-primary' :'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {method === 'Cash' && <Banknote size={14} />}
                {method === 'Cheque' && <FileText size={14} />}
                {method === 'Bank Transfer' && <Landmark size={14} />}
                {method === 'Online Payment' && <Smartphone size={14} />}
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Cheque-specific fields */}
        {form.payment_method === 'Cheque' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <p className="text-[11px] font-600 text-amber-700 uppercase tracking-wider">{t.rec_cheque_details}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>{t.rec_cheque_number}</label>
                <input className={inp} value={form.cheque_number} onChange={e => setForm(f => ({ ...f, cheque_number: e.target.value }))} placeholder="e.g. 001234" />
              </div>
              <div>
                <label className={lbl}>{t.rec_cheque_date}</label>
                <input type="date" className={inp} value={form.cheque_date} onChange={e => setForm(f => ({ ...f, cheque_date: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>{t.rec_bank_name}</label>
                <input className={inp} value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. Emirates NBD" />
              </div>
            </div>
          </div>
        )}

        {/* Bank Transfer-specific fields */}
        {form.payment_method === 'Bank Transfer' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
            <p className="text-[11px] font-600 text-blue-700 uppercase tracking-wider">{t.rec_transfer_details}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>{t.rec_transfer_ref}</label>
                <input className={inp} value={form.transfer_reference} onChange={e => setForm(f => ({ ...f, transfer_reference: e.target.value }))} placeholder="e.g. TRF-20240101-001" />
              </div>
              <div>
                <label className={lbl}>{t.rec_bank_name}</label>
                <input className={inp} value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. ADCB" />
              </div>
            </div>
          </div>
        )}

        {/* Online Payment-specific fields */}
        {form.payment_method === 'Online Payment' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
            <p className="text-[11px] font-600 text-green-700 uppercase tracking-wider">{t.rec_online_details}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>{t.rec_transaction_id}</label>
                <input className={inp} value={form.online_transaction_id} onChange={e => setForm(f => ({ ...f, online_transaction_id: e.target.value }))} placeholder="e.g. TXN123456789" />
              </div>
              <div>
                <label className={lbl}>{t.rec_gateway}</label>
                <input className={inp} value={form.online_gateway} onChange={e => setForm(f => ({ ...f, online_gateway: e.target.value }))} placeholder="e.g. Stripe, PayTabs" />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={lbl}>{t.rec_ref_notes}</label>
          <input className={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_cancel}</button>
          <button
            onClick={handleSave}
            disabled={saving || isOverPayment}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? t.rec_saving : t.rec_record_payment}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Cheque Reconciliation View ───────────────────────────────────────────────

function ChequeReconciliationView() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterReconciled, setFilterReconciled] = useState<'all' | 'pending' | 'reconciled'>('pending');
  const [saving, setSaving] = useState<string | null>(null);

  const fetchChequePayments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('payments')
      .select(`
        *,
        invoices(invoice_number, total_amount, units(unit_name, unit_number, floors(name, buildings(name, projects(name)))))
      `)
      .eq('payment_method', 'cheque')
      .order('payment_date', { ascending: false });

    if (filterReconciled === 'pending') query = query.eq('is_reconciled', false);
    if (filterReconciled === 'reconciled') query = query.eq('is_reconciled', true);

    const { data, error } = await query;
    if (!error) setPayments(data || []);
    setLoading(false);
  }, [filterReconciled]);

  useEffect(() => { fetchChequePayments(); }, [fetchChequePayments]);

  const toggleReconcile = async (payment: any) => {
    setSaving(payment.id);
    const newVal = !payment.is_reconciled;
    await supabase.from('payments').update({
      is_reconciled: newVal,
      reconciled_at: newVal ? new Date().toISOString() : null,
    }).eq('id', payment.id);
    setSaving(null);
    fetchChequePayments();
  };

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const reconciledAmount = payments.filter(p => p.is_reconciled).reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = payments.filter(p => !p.is_reconciled).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-700 text-foreground mb-1">{t.rec_cheque_recon_title}</h3>
        <p className="text-[12px] text-muted-foreground">{t.rec_cheque_recon_desc}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t.rec_total_cheques, amount: totalAmount, color: 'bg-slate-50 border-slate-200', textColor: 'text-slate-700' },
          { label: t.rec_reconciled, amount: reconciledAmount, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
          { label: t.rec_pending_recon, amount: pendingAmount, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
        ].map(card => (
          <div key={card.label} className={`p-4 rounded-xl border ${card.color}`}>
            <p className="text-[11px] font-500 text-muted-foreground uppercase tracking-wider">{card.label}</p>
            <p className={`text-[18px] font-700 mt-1 ${card.textColor}`}>AED {card.amount.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{payments.filter(p => card.label === t.rec_reconciled ? p.is_reconciled : card.label === t.rec_pending_recon ? !p.is_reconciled : true).length} cheque(s)</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'pending', 'reconciled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterReconciled(f)}
            className={`px-3 py-1.5 text-[12px] font-500 rounded-lg border transition-all capitalize ${
              filterReconciled === f ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            {f === 'all' ? t.rec_all_cheques : f === 'pending' ? t.rec_pending_filter : t.rec_reconciled_filter}
          </button>
        ))}
        <button onClick={fetchChequePayments} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 border border-border rounded-lg hover:bg-secondary transition-all">
          <RefreshCw size={12} /> {t.btn_refresh}
        </button>
      </div>

      {loading ? <LoadingSkeleton rows={4} /> : payments.length === 0 ? (
        <EmptyState icon={FileText} title={t.rec_cheque_empty_title} description={t.rec_cheque_empty_desc} />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[900px]">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  {[t.rec_col_receipt, t.rec_col_invoice, t.rec_col_unit, t.rec_col_cheque_no, t.rec_col_cheque_date, t.rec_col_bank, t.lbl_amount, t.rec_col_payment_date, t.rec_col_recon_status, t.rec_col_recon_action].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id} className={`transition-colors ${p.is_reconciled ? 'bg-green-50/40' : 'hover:bg-secondary/20'}`}>
                    <td className="px-3 py-2.5 font-mono text-[12px] font-500">{p.receipt_number || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.invoices?.invoice_number || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {p.invoices?.units?.unit_name || p.invoices?.units?.unit_number || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono">{p.cheque_number || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.cheque_date || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.bank_name || '—'}</td>
                    <td className="px-3 py-2.5 font-600 tabular-nums">AED {Number(p.amount).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.payment_date}</td>
                    <td className="px-3 py-2.5">
                      {p.is_reconciled
                        ? <span className="flex items-center gap-1 text-[11px] font-500 text-green-700"><CheckCircle size={12} />{t.rec_reconciled_status}</span>
                        : <span className="flex items-center gap-1 text-[11px] font-500 text-amber-600"><Clock size={12} />{t.rec_pending_status}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => toggleReconcile(p)}
                        disabled={saving === p.id}
                        className={`px-3 py-1 text-[11px] font-500 rounded-lg border transition-all disabled:opacity-50 ${
                          p.is_reconciled
                            ? 'border-border text-muted-foreground hover:bg-secondary'
                            : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {saving === p.id ? '...' : p.is_reconciled ? t.rec_unreconcile : t.rec_mark_reconciled}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Receipts List View ───────────────────────────────────────────────────────

function ReceiptsListView() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [hierarchy, setHierarchy] = useState<HierarchySelection>({ projectId: '', buildingId: '', floorId: '', unitId: '' });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<Record<string, Payment[]>>({});

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setSearched(true);

    // Build unit ID list based on hierarchy
    let unitIds: string[] = [];
    if (hierarchy.unitId) {
      unitIds = [hierarchy.unitId];
    } else if (hierarchy.floorId) {
      const { data } = await supabase.from('units').select('id').eq('floor_id', hierarchy.floorId);
      unitIds = (data || []).map(u => u.id);
    } else if (hierarchy.buildingId) {
      const { data: floors } = await supabase.from('floors').select('id').eq('building_id', hierarchy.buildingId);
      if (floors?.length) {
        const { data: units } = await supabase.from('units').select('id').in('floor_id', floors.map(f => f.id));
        unitIds = (units || []).map(u => u.id);
      }
    } else if (hierarchy.projectId) {
      const { data: buildings } = await supabase.from('buildings').select('id').eq('project_id', hierarchy.projectId);
      if (buildings?.length) {
        const { data: floors } = await supabase.from('floors').select('id').in('building_id', buildings.map(b => b.id));
        if (floors?.length) {
          const { data: units } = await supabase.from('units').select('id').in('floor_id', floors.map(f => f.id));
          unitIds = (units || []).map(u => u.id);
        }
      }
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        units(unit_name, unit_number, floors(name, buildings(name, projects(name, id)))),
        leases(persons(name))
      `)
      .in('status', ['sent', 'overdue', 'partially_paid'])
      .order('due_date', { ascending: true });

    if (unitIds.length > 0) {
      query = query.in('unit_id', unitIds);
    }

    const { data: invoiceData, error } = await query;
    if (error) { setLoading(false); return; }

    // Fetch payments for each invoice to calculate paid amounts
    const invList = invoiceData || [];
    if (invList.length > 0) {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('invoice_id, amount')
        .in('invoice_id', invList.map(i => i.id));

      const paidMap: Record<string, number> = {};
      (paymentsData || []).forEach(p => {
        paidMap[p.invoice_id] = (paidMap[p.invoice_id] || 0) + Number(p.amount);
      });

      const enriched = invList.map(inv => ({
        ...inv,
        paid_amount: paidMap[inv.id] || 0,
        balance: Number(inv.total_amount) - (paidMap[inv.id] || 0),
      }));

      setInvoices(enriched);
    } else {
      setInvoices([]);
    }

    setLoading(false);
  }, [hierarchy]);

  const loadPayments = async (invoiceId: string) => {
    if (invoicePayments[invoiceId]) return;
    const { data } = await supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('payment_date', { ascending: false });
    setInvoicePayments(prev => ({ ...prev, [invoiceId]: data || [] }));
  };

  const toggleExpand = (invoiceId: string) => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
    } else {
      setExpandedInvoice(invoiceId);
      loadPayments(invoiceId);
    }
  };

  const openPayModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowPayModal(true);
  };

  const handlePaymentSaved = () => {
    // Refresh invoice list and clear cached payments for this invoice
    if (selectedInvoice) {
      setInvoicePayments(prev => {
        const updated = { ...prev };
        delete updated[selectedInvoice.id];
        return updated;
      });
    }
    fetchInvoices();
  };

  const statusBadge: Record<string, string> = {
    draft: 'default', sent: 'info', overdue: 'error', partially_paid: 'warning',
  };

  const totalBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-700 text-foreground mb-1">{t.rec_unpaid_title}</h3>
        <p className="text-[12px] text-muted-foreground">{t.rec_unpaid_desc}</p>
      </div>

      <HierarchySelector value={hierarchy} onChange={setHierarchy} />

      <button
        onClick={fetchInvoices}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 disabled:opacity-60 transition-all"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        {loading ? t.rec_loading : t.rec_find_invoices}
      </button>

      {searched && !loading && (
        <>
          {invoices.length === 0 ? (
            <EmptyState icon={CheckCircle} title={t.rec_all_paid_title} description={t.rec_all_paid_desc} />
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: t.rec_total_invoiced, amount: totalInvoiced, color: 'bg-slate-50 border-slate-200', textColor: 'text-slate-700' },
                  { label: t.rec_total_collected, amount: totalPaid, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
                  { label: t.rec_outstanding, amount: totalBalance, color: 'bg-red-50 border-red-200', textColor: 'text-red-700' },
                ].map(card => (
                  <div key={card.label} className={`p-4 rounded-xl border ${card.color}`}>
                    <p className="text-[11px] font-500 text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    <p className={`text-[18px] font-700 mt-1 ${card.textColor}`}>AED {card.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Invoice list */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] min-w-[900px]">
                    <thead>
                      <tr className="bg-secondary/50 border-b border-border">
                        {['', t.rec_col_invoice, t.rec_col_unit, t.rec_col_tenant, t.rec_col_type, t.rec_col_total, t.rec_col_paid, t.rec_col_balance, t.rec_col_due, t.rec_col_status, t.rec_col_action].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <React.Fragment key={inv.id}>
                          <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
                            <td className="px-2 py-2.5">
                              <button onClick={() => toggleExpand(inv.id)} className="p-1 rounded hover:bg-secondary transition-colors">
                                {expandedInvoice === inv.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 font-mono font-500 text-[12px]">{inv.invoice_number}</td>
                            <td className="px-3 py-2.5 font-500">{inv.units?.unit_name || inv.units?.unit_number || '—'}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{inv.leases?.persons?.name || '—'}</td>
                            <td className="px-3 py-2.5 text-muted-foreground capitalize">{(inv.invoice_type_ext || '').replace(/_/g, ' ')}</td>
                            <td className="px-3 py-2.5 tabular-nums">AED {Number(inv.total_amount).toLocaleString()}</td>
                            <td className="px-3 py-2.5 tabular-nums text-green-700">AED {Number(inv.paid_amount || 0).toLocaleString()}</td>
                            <td className="px-3 py-2.5 tabular-nums font-600 text-primary">AED {Number(inv.balance || 0).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{inv.due_date || '—'}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant={statusBadge[inv.status] as any || 'default'} size="sm">
                                {inv.status.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5">
                              {(inv.balance || 0) > 0 && (
                                <button
                                  onClick={() => openPayModal(inv)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                                >
                                  <CreditCard size={11} /> {t.btn_pay}
                                </button>
                              )}
                            </td>
                          </tr>
                          {/* Expanded payment history */}
                          {expandedInvoice === inv.id && (
                            <tr className="border-b border-border bg-secondary/20">
                              <td colSpan={11} className="px-6 py-3">
                                <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-2">{t.rec_payment_history}</p>
                                {!invoicePayments[inv.id] ? (
                                  <p className="text-[12px] text-muted-foreground">{t.rec_loading_payments}</p>
                                ) : invoicePayments[inv.id].length === 0 ? (
                                  <p className="text-[12px] text-muted-foreground">{t.rec_no_payments}</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {invoicePayments[inv.id].map(p => (
                                      <div key={p.id} className="flex items-center gap-4 text-[12px] p-2 bg-white rounded-lg border border-border">
                                        <span className="font-mono text-muted-foreground">{p.receipt_number || '—'}</span>
                                        <span className="font-600">AED {Number(p.amount).toLocaleString()}</span>
                                        <span className="text-muted-foreground">{p.payment_date}</span>
                                        <span className="capitalize text-muted-foreground">{(p.payment_method || '').replace(/_/g, ' ')}</span>
                                        {p.cheque_number && <span className="text-muted-foreground">Cheque: {p.cheque_number}</span>}
                                        {p.transfer_reference && <span className="text-muted-foreground">Ref: {p.transfer_reference}</span>}
                                        {p.online_transaction_id && <span className="text-muted-foreground">TXN: {p.online_transaction_id}</span>}
                                        {p.notes && <span className="text-muted-foreground">{p.notes}</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <RecordPaymentModal
        invoice={selectedInvoice}
        open={showPayModal}
        onClose={() => { setShowPayModal(false); setSelectedInvoice(null); }}
        onSaved={handlePaymentSaved}
      />
    </div>
  );
}

// ─── Main Receipts Client ─────────────────────────────────────────────────────

type ReceiptsTab = 'receipts' | 'cheque_reconciliation';

export default function ReceiptsClient() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<ReceiptsTab>('receipts');

  const tabs: { value: ReceiptsTab; label: string; icon: React.ReactNode }[] = [
    { value: 'receipts', label: t.rec_tab_receipts, icon: <Receipt size={14} /> },
    { value: 'cheque_reconciliation', label: t.rec_tab_cheque, icon: <Landmark size={14} /> },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.rec_title}</h1>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.rec_subtitle}</p>
      </div>

      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tb => (
          <button
            key={tb.value}
            onClick={() => setTab(tb.value)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-500 rounded-lg transition-all whitespace-nowrap ${
              tab === tb.value ? 'bg-white shadow-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 sm:p-5">
        {tab === 'receipts' && <ReceiptsListView />}
        {tab === 'cheque_reconciliation' && <ChequeReconciliationView />}
      </div>
    </div>
  );
}
