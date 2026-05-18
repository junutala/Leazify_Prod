'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Home, FileText, DollarSign, Calendar, Building2, Download, AlertCircle,
  RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, User, Phone, Mail,
  Wrench, Plus, ChevronDown, X, Loader2, Camera, Upload,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  person_id: string | null;
}

interface Person {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  contact_address: string | null;
}

interface UnitInfo {
  id: string;
  unit_number: string;
  unit_name: string | null;
  floor_name: string;
  building_name: string;
  project_name: string;
}

interface Lease {
  id: string;
  lease_number: string | null;
  start_date: string;
  end_date: string;
  rent_amount: number;
  security_deposit: number;
  payment_terms: string;
  status: string;
  annual_increment_pct: number;
  amc_amount: number;
  contract_generated: boolean;
  lessee_person_id: string | null;
  unit_id: string | null;
  units?: {
    id: string;
    unit_number: string;
    unit_name: string | null;
    floors?: {
      name: string;
      buildings?: {
        name: string;
        projects?: { name: string };
      };
    };
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type_ext: string | null;
  invoice_type: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  invoice_period_start: string | null;
  invoice_period_end: string | null;
  created_at: string;
  lease_id: string;
}

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  skill_type: string;
  priority: string;
  status: string;
  created_at: string;
  units?: { unit_name: string | null; unit_number: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  active: 'success', expired: 'error', terminated: 'error', pending: 'warning', renewed: 'info',
  paid: 'success', sent: 'info', draft: 'default', overdue: 'error', cancelled: 'default',
  open: 'warning', in_progress: 'info', completed: 'success', closed: 'default',
};

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(n);
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function paymentStatusIcon(status: string) {
  switch (status) {
    case 'paid': return <CheckCircle2 size={14} className="text-success" />;
    case 'overdue': return <XCircle size={14} className="text-destructive" />;
    case 'sent': return <Clock size={14} className="text-info" />;
    default: return <AlertTriangle size={14} className="text-warning" />;
  }
}

function formatMobile(mobile: string | null | number): string {
  if (mobile === null || mobile === undefined || mobile === '') return '—';
  // Convert to string safely — handles numeric values stored as numbers (e.g. 9.71501E+11)
  const raw = typeof mobile === 'number'
    ? mobile.toFixed(0)
    : String(mobile).trim();
  // If the string looks like scientific notation, convert it to a plain integer string
  const plain = raw.includes('e') || raw.includes('E')
    ? Number(raw).toFixed(0)
    : raw;
  const cleaned = plain.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  // If it starts with +, keep as is but add spaces for readability
  if (cleaned.startsWith('+')) {
    // e.g. +971501234567 → +971 50 123 4567
    const digits = cleaned.slice(1);
    if (digits.length >= 10) {
      const cc = digits.slice(0, 3);
      const rest = digits.slice(3);
      const part1 = rest.slice(0, 2);
      const part2 = rest.slice(2, 5);
      const part3 = rest.slice(5);
      return `+${cc} ${part1} ${part2} ${part3}`.trim();
    }
    return cleaned;
  }
  // 12-digit number (e.g. 971501234567) — treat as international without '+'
  if (cleaned.length === 12) {
    const cc = cleaned.slice(0, 3);
    const rest = cleaned.slice(3);
    const part1 = rest.slice(0, 2);
    const part2 = rest.slice(2, 5);
    const part3 = rest.slice(5);
    return `+${cc} ${part1} ${part2} ${part3}`.trim();
  }
  // Local number formatting (10 digits)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  // Fallback: return the plain digit string as-is
  return cleaned || plain;
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generateLeasePDF(lease: Lease) {
  const unit = lease.units;
  const building = unit?.floors?.buildings;
  const project = building?.projects;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Lease Contract - ${lease.lease_number || 'Draft'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
    .section { margin: 20px 0; }
    .section h2 { font-size: 13px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .field { margin-bottom: 10px; }
    .label { font-size: 11px; color: #888; text-transform: uppercase; }
    .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-line { border-top: 1px solid #333; padding-top: 5px; font-size: 12px; color: #555; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>LEASE CONTRACT</h1>
  <p style="color:#888;font-size:12px;">Contract No: ${lease.lease_number || 'DRAFT'} | Generated: ${new Date().toLocaleDateString()}</p>
  <div class="section">
    <h2>Property Details</h2>
    <div class="grid">
      <div class="field"><div class="label">Project</div><div class="value">${project?.name || '—'}</div></div>
      <div class="field"><div class="label">Building</div><div class="value">${building?.name || '—'}</div></div>
      <div class="field"><div class="label">Floor</div><div class="value">${unit?.floors?.name || '—'}</div></div>
      <div class="field"><div class="label">Unit</div><div class="value">${unit?.unit_name || unit?.unit_number || '—'}</div></div>
    </div>
  </div>
  <div class="section">
    <h2>Lease Terms</h2>
    <div class="grid">
      <div class="field"><div class="label">Start Date</div><div class="value">${fmt(lease.start_date)}</div></div>
      <div class="field"><div class="label">End Date</div><div class="value">${fmt(lease.end_date)}</div></div>
      <div class="field"><div class="label">Monthly Rent</div><div class="value">${fmtCurrency(lease.rent_amount)}</div></div>
      <div class="field"><div class="label">Security Deposit</div><div class="value">${fmtCurrency(lease.security_deposit)}</div></div>
      <div class="field"><div class="label">Payment Terms</div><div class="value">${lease.payment_terms}</div></div>
      <div class="field"><div class="label">Annual Increment</div><div class="value">${lease.annual_increment_pct}%</div></div>
    </div>
  </div>
  <div class="footer">
    <div><div class="sig-line">Landlord Signature</div></div>
    <div><div class="sig-line">Tenant Signature</div></div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lease-${lease.lease_number || 'Draft'}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Service Request Modal ────────────────────────────────────────────────────

const skillTypes = ['electrical', 'mechanical', 'painting', 'plumbing', 'cleaning'];
const priorities = ['low', 'medium', 'high', 'urgent'];

// Image upload component — supports drag-drop on desktop, camera on mobile
function ImageUpload({ images, onChange, maxImages = 5 }: { images: string[]; onChange: (imgs: string[]) => void; maxImages?: number }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxImages - images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    toProcess.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange([...images, result].slice(0, maxImages));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[12px] font-500 text-foreground">Images ({images.length}/{maxImages})</label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={images.length >= maxImages}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 disabled:opacity-50 transition-colors">
            <Upload size={11} /> Gallery
          </button>
          <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={images.length >= maxImages}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 disabled:opacity-50 transition-colors">
            <Camera size={11} /> Camera
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => images.length < maxImages && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/30'} ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <Upload size={20} className="mx-auto text-muted-foreground mb-1" />
        <p className="text-[12px] text-muted-foreground">Drag & drop images here, or click to select</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Max {maxImages} images • On mobile, use Camera button to take photos</p>
      </div>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-square">
              <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover rounded-lg border border-border" />
              <button type="button" onClick={() => removeImage(idx)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => processFiles(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => processFiles(e.target.files)} />
    </div>
  );
}

interface CreateSRModalProps {
  open: boolean;
  onClose: () => void;
  units: UnitInfo[];
  defaultUnitId?: string;
  onCreated: () => void;
}

function CreateSRModal({ open, onClose, units, defaultUnitId, onCreated }: CreateSRModalProps) {
  const supabase = createClient();
  const [unitId, setUnitId] = useState(defaultUnitId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillType, setSkillType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setUnitId(defaultUnitId || (units.length === 1 ? units[0].id : ''));
      setTitle('');
      setDescription('');
      setSkillType('');
      setPriority('medium');
      setError('');
      setImages([]);
    }
  }, [open, defaultUnitId, units]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !skillType || !unitId) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('service_requests').insert({
      unit_id: unitId,
      title: title.trim(),
      description: description.trim(),
      skill_type: skillType,
      priority,
      payer: 'tenant',
      status: 'open',
      is_common_area: false,
      image_urls: images,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
    onClose();
  };

  if (!open) return null;

  const inputCls = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
  const labelCls = 'block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench size={14} className="text-primary" />
            </div>
            <h2 className="text-[15px] font-700 text-foreground">New Service Request</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Unit */}
          <div>
            <label className={labelCls}>Unit <span className="text-destructive">*</span></label>
            <select className={inputCls} value={unitId} onChange={e => setUnitId(e.target.value)} required>
              <option value="">Select unit…</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.unit_name || u.unit_number} — {u.building_name}, {u.project_name}
                </option>
              ))}
            </select>
          </div>
          {/* Title */}
          <div>
            <label className={labelCls}>Title <span className="text-destructive">*</span></label>
            <input
              className={inputCls}
              placeholder="Brief description of the issue"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          {/* Skill type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category <span className="text-destructive">*</span></label>
              <select className={inputCls} value={skillType} onChange={e => setSkillType(e.target.value)} required>
                <option value="">Select…</option>
                {skillTypes.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value)}>
                {priorities.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Additional details about the issue…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          {/* Image Upload */}
          <ImageUpload images={images} onChange={setImages} maxImages={5} />
          {error && (
            <p className="text-[12px] text-destructive flex items-center gap-1.5">
              <AlertCircle size={13} />{error}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-[13px] font-500 border border-border rounded-lg hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-[13px] font-600 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={13} className="animate-spin" />Submitting…</> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeaseCard({ lease, onDownload }: { lease: Lease; onDownload: () => void }) {
  const daysLeft = daysUntil(lease.end_date);
  const unit = lease.units;
  const building = unit?.floors?.buildings;

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-1">Lease Contract</p>
          <h3 className="text-[16px] font-700 text-foreground">{lease.lease_number || 'Pending'}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[lease.status] as any}>{lease.status}</Badge>
          {lease.contract_generated && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-500 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Download size={12} />
              PDF
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Unit</p>
          <p className="text-[13px] font-600 text-foreground">{unit?.unit_name || unit?.unit_number || '—'}</p>
          <p className="text-[11px] text-muted-foreground">{unit?.floors?.name} · {building?.name}</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Rent</p>
          <p className="text-[15px] font-700 text-foreground">{fmtCurrency(lease.rent_amount)}</p>
          <p className="text-[11px] text-muted-foreground">excl. VAT</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Start Date</p>
          <p className="text-[13px] font-600 text-foreground">{fmt(lease.start_date)}</p>
        </div>
        <div className={`rounded-xl p-3 ${daysLeft > 0 && daysLeft < 90 ? 'bg-warning/10' : daysLeft <= 0 ? 'bg-destructive/10' : 'bg-secondary/50'}`}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Expires</p>
          <p className={`text-[13px] font-600 ${daysLeft > 0 && daysLeft < 90 ? 'text-warning' : daysLeft <= 0 ? 'text-destructive' : 'text-foreground'}`}>
            {fmt(lease.end_date)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
          </p>
        </div>
      </div>

      {lease.security_deposit > 0 && (
        <div className="flex items-center justify-between py-2 border-t border-border text-[12px]">
          <span className="text-muted-foreground">Security Deposit</span>
          <span className="font-600 text-foreground">{fmtCurrency(lease.security_deposit)}</span>
        </div>
      )}

      <div className="border-t border-border pt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
        <Building2 size={13} />
        <span>{building?.projects?.name || '—'}</span>
      </div>
    </div>
  );
}

function InvoiceRow({ inv }: { inv: Invoice }) {
  const due = inv.due_date ? daysUntil(inv.due_date) : null;
  const isOverdue = inv.status === 'overdue' || (due !== null && due < 0 && inv.status !== 'paid' && inv.status !== 'cancelled');
  const isDueSoon = due !== null && due >= 0 && due <= 7 && inv.status !== 'paid' && inv.status !== 'cancelled';

  const typeLabel: Record<string, string> = {
    rent: 'Rent', security_deposit: 'Security Deposit', turnover_rent: 'Turnover Rent',
    amc: 'AMC', miscellaneous: 'Miscellaneous', work_order: 'Work Order',
  };

  return (
    <div className={`px-5 py-4 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors ${isOverdue ? 'bg-destructive/5' : isDueSoon ? 'bg-warning/5' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          {paymentStatusIcon(inv.status)}
          <p className="text-[13px] font-600 text-foreground truncate">
            {typeLabel[inv.invoice_type_ext || inv.invoice_type] || inv.invoice_type}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono">{inv.invoice_number}</p>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          {inv.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-500' : isDueSoon ? 'text-warning font-500' : ''}`}>
              <Calendar size={10} />
              Due {fmt(inv.due_date)}
              {isOverdue && ' · OVERDUE'}
              {isDueSoon && !isOverdue && ` · Due in ${due} day${due === 1 ? '' : 's'}`}
            </span>
          )}
          {inv.invoice_period_start && (
            <span>{fmt(inv.invoice_period_start)} – {fmt(inv.invoice_period_end)}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[14px] font-700 text-foreground">{fmtCurrency(inv.total_amount)}</p>
        {inv.tax_amount > 0 && (
          <p className="text-[10px] text-muted-foreground">VAT: {fmtCurrency(inv.tax_amount)}</p>
        )}
        <div className="mt-1">
          <Badge variant={statusColors[inv.status] as any} size="sm">{inv.status}</Badge>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'leases' | 'invoices' | 'service-requests';

export default function TenantPortalClient({ mimicPersonId }: { mimicPersonId?: string }) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('leases');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [allLeases, setAllLeases] = useState<Lease[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allUnits, setAllUnits] = useState<UnitInfo[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [showSRModal, setShowSRModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mimicPersonId) {
        const { data: personData } = await supabase
          .from('persons')
          .select('id, name, email, mobile, contact_address')
          .eq('id', mimicPersonId)
          .single();

        if (personData) {
          setPerson(personData);
          setProfile({ id: mimicPersonId, full_name: personData.name, email: personData.email || '', role: 'tenant', person_id: mimicPersonId });
          await loadAllData(mimicPersonId);
        } else {
          setError('Could not load tenant data for the selected person.');
        }
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileData, error: profileErr } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, person_id')
        .eq('id', user.id)
        .single();

      if (profileErr) throw profileErr;
      setProfile(profileData);

      if (!profileData?.person_id) {
        const { data: personByEmail } = await supabase
          .from('persons')
          .select('id, name, email, mobile, contact_address')
          .eq('email', user.email || '')
          .single();

        if (personByEmail) {
          setPerson(personByEmail);
          await loadAllData(personByEmail.id);
        }
        return;
      }

      const { data: personData } = await supabase
        .from('persons')
        .select('id, name, email, mobile, contact_address')
        .eq('id', profileData.person_id)
        .single();

      if (personData) {
        setPerson(personData);
        await loadAllData(profileData.person_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load portal data');
    } finally {
      setLoading(false);
    }
  }, [mimicPersonId]);

  const loadAllData = async (personId: string) => {
    // Load all leases for this person (exclude draft)
    const { data: leasesData, error: leasesErr } = await supabase
      .from('leases')
      .select(`
        id, lease_number, start_date, end_date, rent_amount, security_deposit,
        payment_terms, status, annual_increment_pct, amc_amount, contract_generated,
        lessee_person_id, unit_id,
        units (
          id, unit_number, unit_name,
          floors (
            name,
            buildings (
              name,
              projects ( name )
            )
          )
        )
      `)
      .eq('lessee_person_id', personId)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (leasesErr) throw leasesErr;
    const leases = (leasesData || []) as unknown as Lease[];
    setAllLeases(leases);

    // Build unique units list from leases
    const unitMap = new Map<string, UnitInfo>();
    for (const lease of leases) {
      if (lease.units?.id) {
        const u = lease.units;
        const building = u.floors?.buildings;
        const project = building?.projects;
        unitMap.set(u.id, {
          id: u.id,
          unit_number: u.unit_number,
          unit_name: u.unit_name,
          floor_name: u.floors?.name || '',
          building_name: building?.name || '',
          project_name: project?.name || '',
        });
      }
    }
    setAllUnits(Array.from(unitMap.values()));

    // Load invoices for all leases (exclude draft)
    const leaseIds = leases.map((l: any) => l.id);
    if (leaseIds.length === 0) {
      setAllInvoices([]);
    } else {
      const { data: invoicesData, error: invoicesErr } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, invoice_type_ext, invoice_type, amount, tax_amount,
          total_amount, due_date, status, notes, invoice_period_start, invoice_period_end,
          created_at, lease_id
        `)
        .in('lease_id', leaseIds)
        .neq('status', 'draft')
        .order('due_date', { ascending: false });

      if (invoicesErr) throw invoicesErr;
      setAllInvoices(invoicesData || []);
    }

    // Load service requests for all units
    const unitIds = Array.from(unitMap.keys());
    if (unitIds.length > 0) {
      const { data: srData } = await supabase
        .from('service_requests')
        .select('id, title, description, skill_type, priority, status, created_at, units(unit_name, unit_number)')
        .in('unit_id', unitIds)
        .order('created_at', { ascending: false });
      setServiceRequests((srData || []) as unknown as ServiceRequest[]);
    } else {
      setServiceRequests([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived data based on selected unit ──────────────────────────────────────
  const leases = selectedUnitId === 'all'
    ? allLeases
    : allLeases.filter(l => l.units?.id === selectedUnitId || l.unit_id === selectedUnitId);

  const invoices = selectedUnitId === 'all'
    ? allInvoices
    : (() => {
        const leaseIds = leases.map(l => l.id);
        return allInvoices.filter(i => leaseIds.includes(i.lease_id));
      })();

  const activeLeases = leases.filter(l => l.status === 'active');
  const pendingInvoices = invoices.filter(i => i.status === 'sent');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const totalOutstanding = [...pendingInvoices, ...overdueInvoices].reduce((s, i) => s + i.total_amount, 0);

  const filteredInvoices = invoices.filter(inv => {
    if (invoiceFilter === 'all') return true;
    if (invoiceFilter === 'pending') return inv.status === 'sent';
    if (invoiceFilter === 'overdue') return inv.status === 'overdue';
    if (invoiceFilter === 'paid') return inv.status === 'paid';
    return true;
  });

  const filteredSR = selectedUnitId === 'all'
    ? serviceRequests
    : serviceRequests.filter(sr => {
        const unit = allUnits.find(u => u.id === selectedUnitId);
        return unit && (sr.units?.unit_number === unit.unit_number || sr.units?.unit_name === unit.unit_name);
      });

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'leases', label: 'My Leases', icon: <FileText size={15} />, count: activeLeases.length },
    { id: 'invoices', label: 'Invoices', icon: <DollarSign size={15} />, count: overdueInvoices.length || undefined },
    { id: 'service-requests', label: 'Service Requests', icon: <Wrench size={15} /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          <LoadingSkeleton rows={1} />
          <LoadingSkeleton rows={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-border p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle size={22} className="text-destructive" />
          </div>
          <p className="text-[14px] font-600 text-foreground">Unable to load portal</p>
          <p className="text-[12px] text-muted-foreground">{error}</p>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[13px] font-500 rounded-lg hover:bg-primary/90 transition-colors mx-auto"
          >
            <RefreshCw size={13} />Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Home size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-700 text-foreground leading-tight">Tenant Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-600 text-foreground">{person?.name || profile?.full_name || 'Tenant'}</p>
              <p className="text-[10px] text-muted-foreground">{profile?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[12px] font-700">
              {(person?.name || profile?.full_name || 'T').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Tenant info card */}
        {person && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">Your Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Name</p>
                  <p className="text-[13px] font-600 text-foreground">{person.name}</p>
                </div>
              </div>
              {person.email && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail size={13} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Email</p>
                    <p className="text-[13px] font-600 text-foreground truncate">{person.email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Mobile</p>
                  <p className="text-[13px] font-600 text-foreground">
                    {person.mobile ? formatMobile(person.mobile) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unit selector (shown when tenant has multiple units) */}
        {allUnits.length > 1 && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-0.5">Viewing Unit</p>
                <p className="text-[12px] text-muted-foreground">
                  {selectedUnitId === 'all' ? `All ${allUnits.length} units` : (() => {
                    const u = allUnits.find(u => u.id === selectedUnitId);
                    return u ? `${u.unit_name || u.unit_number} — ${u.building_name}` : 'Selected unit';
                  })()}
                </p>
              </div>
              <div className="relative">
                <select
                  value={selectedUnitId}
                  onChange={e => { setSelectedUnitId(e.target.value); setInvoiceFilter('all'); }}
                  className="appearance-none pl-3 pr-8 py-2 text-[13px] font-500 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                >
                  <option value="all">All Units</option>
                  {allUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.unit_name || u.unit_number} — {u.building_name}, {u.project_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Active Leases',
              value: activeLeases.length,
              icon: <FileText size={16} />,
              color: 'text-primary bg-primary/10',
            },
            {
              label: 'Pending Invoices',
              value: pendingInvoices.length,
              icon: <Clock size={16} />,
              color: pendingInvoices.length > 0 ? 'text-warning bg-warning/10' : 'text-success bg-success/10',
            },
            {
              label: 'Overdue',
              value: overdueInvoices.length,
              icon: <XCircle size={16} />,
              color: overdueInvoices.length > 0 ? 'text-destructive bg-destructive/10' : 'text-success bg-success/10',
            },
            {
              label: 'Outstanding',
              value: fmtCurrency(totalOutstanding),
              icon: <DollarSign size={16} />,
              color: totalOutstanding > 0 ? 'text-warning bg-warning/10' : 'text-success bg-success/10',
              isText: true,
            },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className={`${stat.isText ? 'text-[14px]' : 'text-[22px]'} font-800 text-foreground leading-none mb-1`}>
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-500 transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span className={`text-[10px] font-700 px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-destructive/10 text-destructive'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Leases Tab ── */}
        {activeTab === 'leases' && (
          <div className="space-y-4">
            {leases.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No leases found"
                description="Your lease agreements will appear here once assigned by the property manager."
              />
            ) : (
              leases.map(lease => (
                <LeaseCard
                  key={lease.id}
                  lease={lease}
                  onDownload={() => generateLeasePDF(lease)}
                />
              ))
            )}
          </div>
        )}

        {/* ── Invoices Tab ── */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'overdue', 'paid'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setInvoiceFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-500 transition-colors capitalize ${
                    invoiceFilter === f
                      ? 'bg-primary text-white' :'bg-white border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {f === 'all' ? `All (${invoices.length})` : f === 'pending' ? `Pending (${pendingInvoices.length})` : f === 'overdue' ? `Overdue (${overdueInvoices.length})` : `Paid (${invoices.filter(i => i.status === 'paid').length})`}
                </button>
              ))}
            </div>

            {filteredInvoices.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="No invoices"
                description="Your invoices and payment history will appear here."
              />
            ) : (
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-[13px] font-700 text-foreground">
                    {invoiceFilter === 'all' ? 'All Invoices' : `${invoiceFilter.charAt(0).toUpperCase() + invoiceFilter.slice(1)} Invoices`}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">{filteredInvoices.length} record{filteredInvoices.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-border">
                  {filteredInvoices.map(inv => (
                    <InvoiceRow key={inv.id} inv={inv} />
                  ))}
                </div>
                {invoiceFilter !== 'paid' && totalOutstanding > 0 && (
                  <div className="px-5 py-3 bg-secondary/30 border-t border-border flex items-center justify-between">
                    <span className="text-[12px] font-600 text-muted-foreground">Total Outstanding</span>
                    <span className="text-[14px] font-800 text-foreground">{fmtCurrency(totalOutstanding)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Service Requests Tab ── */}
        {activeTab === 'service-requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">{filteredSR.length} request{filteredSR.length !== 1 ? 's' : ''}</p>
              {allUnits.length > 0 && (
                <button
                  onClick={() => setShowSRModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-[13px] font-500 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus size={14} />
                  New Request
                </button>
              )}
            </div>

            {filteredSR.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No service requests"
                description="Submit a service request for maintenance or repairs in your unit."
              />
            ) : (
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {filteredSR.map(sr => (
                    <div key={sr.id} className="px-5 py-4 flex items-start justify-between gap-3 hover:bg-secondary/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[13px] font-600 text-foreground truncate">{sr.title}</p>
                          <Badge variant={statusColors[sr.status] as any || 'default'} size="sm">{sr.status.replace('_', ' ')}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <span className="capitalize">{sr.skill_type || '—'}</span>
                          <span>·</span>
                          <span>{sr.units?.unit_name || sr.units?.unit_number || '—'}</span>
                          <span>·</span>
                          <span className={`font-500 ${sr.priority === 'urgent' ? 'text-destructive' : sr.priority === 'high' ? 'text-warning' : ''}`}>
                            {sr.priority}
                          </span>
                        </div>
                        {sr.description && (
                          <p className="text-[12px] text-muted-foreground mt-1 line-clamp-1">{sr.description}</p>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground shrink-0 mt-0.5">{fmt(sr.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Service Request Modal */}
      <CreateSRModal
        open={showSRModal}
        onClose={() => setShowSRModal(false)}
        units={allUnits}
        defaultUnitId={selectedUnitId !== 'all' ? selectedUnitId : undefined}
        onCreated={() => {
          // Reload service requests
          const unitIds = allUnits.map(u => u.id);
          if (unitIds.length > 0) {
            supabase
              .from('service_requests')
              .select('id, title, description, skill_type, priority, status, created_at, units(unit_name, unit_number)')
              .in('unit_id', unitIds)
              .order('created_at', { ascending: false })
              .then(({ data }) => setServiceRequests((data || []) as unknown as ServiceRequest[]));
          }
        }}
      />
    </div>
  );
}
