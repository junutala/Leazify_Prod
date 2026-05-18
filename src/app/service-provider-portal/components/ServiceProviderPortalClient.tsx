'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Wrench, ListChecks, CheckCircle2, Clock, ChevronDown, ChevronUp, Building2,
  Calendar, FileText, Loader2, Download, RefreshCw, AlertCircle, Receipt,
  TrendingUp, XCircle, AlertTriangle, Send, DollarSign, Inbox, CheckSquare
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderProfile {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  skill_type: string;
  skills: string[];
  person_type: string;
  is_active: boolean;
}

interface OpenRequest {
  id: string;
  type: 'sr' | 'mr';
  title: string;
  description: string;
  skill_type: string;
  priority?: string;
  status: string;
  created_at: string;
  location: string;
  project_name?: string;
  existing_quote?: { id: string; quote_amount: number; status: string; notes: string | null } | null;
}

interface WorkOrder {
  id: string;
  wo_number: string | null;
  skill_type: string;
  amount: number;
  payment_terms: string;
  payer: string;
  status: string;
  other_instructions: string | null;
  created_at: string;
  completed_at: string | null;
  projects?: { name: string } | null;
  buildings?: { name: string } | null;
  floors?: { name: string } | null;
  linked_requests?: LinkedRequest[];
  invoice?: WorkOrderInvoice | null;
}

interface LinkedRequest {
  id: string;
  label: string;
  type: 'sr' | 'mr';
}

interface WorkOrderInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  due_date: string | null;
  approval_status: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  draft: 'default', issued: 'info', in_progress: 'warning', completed: 'success', cancelled: 'error',
  open: 'warning', closed: 'default',
};

const paymentTermLabels: Record<string, string> = {
  immediate: 'Immediate', '15_days': '15 Days', '30_days': '30 Days',
  quarterly: 'Quarterly', half_yearly: 'Half Yearly', annually: 'Annually',
};

const nextStatus: Record<string, string> = { issued: 'in_progress', in_progress: 'completed' };
const nextStatusLabel: Record<string, string> = { issued: 'Start Work', in_progress: 'Mark Complete' };

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(n);
}

function invoiceStatusIcon(status: string) {
  switch (status) {
    case 'paid': return <CheckCircle2 size={13} className="text-success" />;
    case 'overdue': return <XCircle size={13} className="text-destructive" />;
    case 'sent': return <Clock size={13} className="text-info" />;
    default: return <AlertTriangle size={13} className="text-warning" />;
  }
}

// ─── Invoice PDF Generator ────────────────────────────────────────────────────

function generateInvoicePDF(wo: WorkOrder, inv: WorkOrderInvoice, provider: ProviderProfile) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; }
    .meta { color: #888; font-size: 12px; margin-bottom: 24px; }
    .section { margin: 20px 0; }
    .section h2 { font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .field { margin-bottom: 10px; }
    .label { font-size: 11px; color: #888; text-transform: uppercase; }
    .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    .total-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-top: 20px; }
    .total-label { font-size: 12px; color: #555; }
    .total-value { font-size: 24px; font-weight: 800; color: #0f766e; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #166534; }
    .footer { margin-top: 60px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <h1>WORK ORDER INVOICE</h1>
  <p class="meta">Invoice No: ${inv.invoice_number} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()} &nbsp;|&nbsp; <span class="status-badge">${inv.status.toUpperCase()}</span></p>
  <div class="section">
    <h2>Service Provider</h2>
    <div class="grid">
      <div class="field"><div class="label">Company / Name</div><div class="value">${provider.name}</div></div>
      <div class="field"><div class="label">Skills</div><div class="value" style="text-transform:capitalize">${(provider.skills || [provider.skill_type]).join(', ')}</div></div>
      ${provider.email ? `<div class="field"><div class="label">Email</div><div class="value">${provider.email}</div></div>` : ''}
      ${provider.mobile ? `<div class="field"><div class="label">Mobile</div><div class="value">${provider.mobile}</div></div>` : ''}
    </div>
  </div>
  <div class="section">
    <h2>Work Order Details</h2>
    <div class="grid">
      <div class="field"><div class="label">WO Number</div><div class="value">${wo.wo_number || '—'}</div></div>
      <div class="field"><div class="label">Status</div><div class="value" style="text-transform:capitalize">${wo.status.replace('_', ' ')}</div></div>
      <div class="field"><div class="label">Project</div><div class="value">${wo.projects?.name || '—'}</div></div>
      <div class="field"><div class="label">Payer</div><div class="value" style="text-transform:capitalize">${wo.payer}</div></div>
    </div>
  </div>
  <div class="section">
    <h2>Invoice Summary</h2>
    <div class="total-box">
      <div class="total-label">Total Amount</div>
      <div class="total-value">${fmtCurrency(inv.total_amount)}</div>
    </div>
  </div>
  <div class="footer">PropFlow Property Management &nbsp;|&nbsp; System-generated invoice</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice-${inv.invoice_number}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Open Request Card ────────────────────────────────────────────────────────

function OpenRequestCard({
  req,
  provider,
  onQuoteSubmitted,
}: {
  req: OpenRequest;
  provider: ProviderProfile;
  onQuoteSubmitted: () => void;
}) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(!!req.existing_quote);

  const handleSubmitQuote = async () => {
    if (!quoteAmount || Number(quoteAmount) <= 0) { setSubmitError('Please enter a valid quote amount'); return; }
    setSubmitting(true);
    setSubmitError('');

    const { error } = await supabase.from('quote_submissions').insert({
      provider_id: provider.id,
      request_type: req.type,
      service_request_id: req.type === 'sr' ? req.id : null,
      maintenance_request_id: req.type === 'mr' ? req.id : null,
      quote_amount: Number(quoteAmount),
      notes: quoteNotes || null,
      status: 'pending',
    });

    if (error) { setSubmitError(error.message); setSubmitting(false); return; }

    // Update quote_status on the request
    const table = req.type === 'sr' ? 'service_requests' : 'maintenance_requests';
    await supabase.from(table).update({ quote_status: 'submitted' }).eq('id', req.id);

    setSubmitting(false);
    setSubmitted(true);
    setQuoteAmount('');
    setQuoteNotes('');
    onQuoteSubmitted();
  };

  const quoteStatusColor = req.existing_quote?.status === 'approved' ?'bg-green-100 text-green-700'
    : req.existing_quote?.status === 'rejected' ?'bg-red-100 text-red-600' :'bg-amber-100 text-amber-700';

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-700 px-1.5 py-0.5 rounded-full ${req.type === 'sr' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {req.type === 'sr' ? 'Service Request' : 'Maintenance Request'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-500 bg-primary/10 text-primary rounded-full capitalize">{req.skill_type}</span>
              {req.priority && (
                <span className={`px-2 py-0.5 text-[10px] font-500 rounded-full capitalize ${req.priority === 'urgent' ? 'bg-red-100 text-red-700' : req.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-secondary text-muted-foreground'}`}>
                  {req.priority}
                </span>
              )}
            </div>
            <p className="text-[14px] font-700 text-foreground">{req.title}</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <Building2 size={11} />
              <span>{req.location || req.project_name || 'No location'}</span>
              <span className="text-border">·</span>
              <Calendar size={11} />
              <span>{fmt(req.created_at)}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            {submitted && req.existing_quote ? (
              <div className={`px-2.5 py-1 rounded-lg text-[11px] font-600 ${quoteStatusColor}`}>
                Quote: {fmtCurrency(req.existing_quote.quote_amount)}
                <div className="text-[10px] capitalize">{req.existing_quote.status}</div>
              </div>
            ) : submitted ? (
              <div className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-600">
                Quote Submitted
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="text-[11px] text-muted-foreground">
            {req.description?.slice(0, 80)}{req.description?.length > 80 ? '...' : ''}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-3 shrink-0"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{expanded ? 'Less' : 'Quote'}</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-secondary/30 px-5 py-4 space-y-3">
          {submitted ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-[13px] text-green-700 font-600">
                <CheckSquare size={15} /> Quote submitted successfully
              </div>
              {req.existing_quote && (
                <div className="mt-2 text-[12px] text-green-600">
                  Amount: {fmtCurrency(req.existing_quote.quote_amount)} · Status: <span className="capitalize font-500">{req.existing_quote.status}</span>
                  {req.existing_quote.notes && <div className="mt-1 text-muted-foreground">Notes: {req.existing_quote.notes}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">Submit Your Quote</p>
              {submitError && <p className="text-[11px] text-destructive">{submitError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-500 text-foreground mb-1">Quote Amount (AED) *</label>
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quoteAmount}
                      onChange={e => setQuoteAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-500 text-foreground mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={quoteNotes}
                    onChange={e => setQuoteNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    className="w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitQuote}
                  disabled={submitting || !quoteAmount}
                  className="flex items-center gap-2 px-4 py-2 text-[12.5px] font-600 bg-[#0f766e] text-white rounded-lg hover:bg-[#0f766e]/90 disabled:opacity-60 transition-colors"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {submitting ? 'Submitting...' : 'Submit Quote'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Work Order Card ──────────────────────────────────────────────────────────

function WorkOrderCard({
  wo,
  provider,
  onStatusUpdate,
}: {
  wo: WorkOrder;
  provider: ProviderProfile;
  onStatusUpdate: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const supabase = createClient();
  const canUpdate = wo.status === 'issued' || wo.status === 'in_progress';

  const handleUpdate = async () => {
    if (!canUpdate) return;
    setUpdating(true);
    setUpdateError('');
    const newStatus = nextStatus[wo.status];
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

    const { error } = await supabase.from('work_orders').update(updateData).eq('id', wo.id);
    if (error) { setUpdateError(error.message); } else { onStatusUpdate(wo.id, newStatus); }
    setUpdating(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-700 text-muted-foreground font-mono">{wo.wo_number || 'WO-DRAFT'}</span>
              <Badge variant={statusColors[wo.status] as any} size="sm">{wo.status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-[14px] font-700 text-foreground capitalize">{wo.skill_type} Work Order</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <Building2 size={11} />
              <span>{[wo.projects?.name, wo.buildings?.name, wo.floors?.name].filter(Boolean).join(' · ') || 'No location'}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[16px] font-800 text-foreground">{fmtCurrency(wo.amount)}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{paymentTermLabels[wo.payment_terms] || wo.payment_terms}</p>
          </div>
        </div>

        {updateError && (
          <p className="mt-2 text-[11px] text-destructive flex items-center gap-1">
            <AlertCircle size={11} /> {updateError}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar size={11} />{fmt(wo.created_at)}</span>
            <span className="capitalize">Payer: <span className="font-500 text-foreground">{wo.payer}</span></span>
          </div>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <button
                onClick={handleUpdate}
                disabled={updating}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-600 rounded-lg transition-colors disabled:opacity-60 ${
                  wo.status === 'in_progress' ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {updating ? <Loader2 size={12} className="animate-spin" /> : wo.status === 'in_progress' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {updating ? 'Updating...' : nextStatusLabel[wo.status]}
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{expanded ? 'Less' : 'Details'}</span>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-secondary/30 px-5 py-4 space-y-4">
          {wo.other_instructions && (
            <div>
              <p className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider mb-1">Instructions</p>
              <p className="text-[12px] text-foreground">{wo.other_instructions}</p>
            </div>
          )}

          {wo.linked_requests && wo.linked_requests.length > 0 && (
            <div>
              <p className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider mb-1.5">Linked Requests</p>
              <div className="space-y-1">
                {wo.linked_requests.map((req) => (
                  <div key={req.id} className="flex items-center gap-2 text-[12px] text-foreground">
                    <FileText size={11} className="text-muted-foreground shrink-0" />
                    <span>{req.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-500 ${req.type === 'sr' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {req.type === 'sr' ? 'Service Req' : 'Maintenance'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wo.invoice ? (
            <div className="bg-white rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider">Linked Invoice</p>
                {wo.status === 'completed' && (
                  <button
                    onClick={() => generateInvoicePDF(wo, wo.invoice!, provider)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-500 bg-[#0f766e]/10 text-[#0f766e] rounded-lg hover:bg-[#0f766e]/20 transition-colors"
                  >
                    <Download size={11} /> Download PDF
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {invoiceStatusIcon(wo.invoice.status)}
                  <span className="text-[12px] font-600 text-foreground">{wo.invoice.invoice_number}</span>
                  <Badge variant={statusColors[wo.invoice.status] as any} size="sm">{wo.invoice.status}</Badge>
                </div>
                <p className="text-[14px] font-700 text-foreground">{fmtCurrency(wo.invoice.total_amount)}</p>
              </div>
            </div>
          ) : (
            wo.status === 'completed' && (
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-[12px] text-muted-foreground">No invoice generated yet for this work order.</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────

type MainTab = 'open_requests' | 'work_orders' | 'invoices';
type WOFilter = 'all' | 'active' | 'completed';

export default function ServiceProviderPortalClient({ mimicProviderId }: { mimicProviderId?: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [openRequests, setOpenRequests] = useState<OpenRequest[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>('open_requests');
  const [woFilter, setWoFilter] = useState<WOFilter>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let providerIdToLoad: string | null = null;

      if (mimicProviderId) {
        // ── Mimic mode: use the specified provider id directly ──────────────
        providerIdToLoad = mimicProviderId;
      } else {
        // ── Normal mode: resolve provider from logged-in user ───────────────
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('Not authenticated'); setLoading(false); return; }

        const { data: profile, error: profileErr } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, role, provider_id')
          .eq('id', user.id)
          .single();

        if (profileErr || !profile?.provider_id) {
          setError('No service provider account linked to this user. Please contact your administrator.');
          setLoading(false);
          return;
        }
        providerIdToLoad = profile.provider_id;
      }

      const { data: providerData, error: providerErr } = await supabase
        .from('service_providers')
        .select('id, name, email, mobile, skill_type, skills, person_type, is_active')
        .eq('id', providerIdToLoad)
        .single();

      if (providerErr || !providerData) {
        setError('Could not load service provider details.');
        setLoading(false);
        return;
      }

      setProvider(providerData);

      // Load assigned projects for this provider
      const { data: projectAssignments } = await supabase
        .from('provider_project_assignments')
        .select('project_id')
        .eq('provider_id', providerData.id);

      const assignedProjectIds = (projectAssignments || []).map((a: any) => a.project_id);
      const providerSkills = providerData.skills?.length > 0 ? providerData.skills : [providerData.skill_type];

      // Load open SRs matching provider skills
      const { data: openSRs } = await supabase
        .from('service_requests')
        .select('id, title, description, skill_type, priority, status, created_at, units(unit_name, unit_number, floors(name, buildings(name, projects(name))))')
        .eq('status', 'open')
        .in('skill_type', providerSkills);

      // Load open MRs matching provider skills and assigned projects
      let mrQuery = supabase
        .from('maintenance_requests')
        .select('id, description, skill_type, status, created_at, project_id, projects(name), buildings(name), floors(name)')
        .eq('status', 'open')
        .in('skill_type', providerSkills);

      if (assignedProjectIds.length > 0) {
        mrQuery = mrQuery.in('project_id', assignedProjectIds);
      }

      const { data: openMRs } = await mrQuery;

      // Load existing quotes by this provider
      const { data: existingQuotes } = await supabase
        .from('quote_submissions')
        .select('id, service_request_id, maintenance_request_id, quote_amount, status, notes')
        .eq('provider_id', providerData.id);

      const quoteMap = new Map<string, any>();
      (existingQuotes || []).forEach((q: any) => {
        if (q.service_request_id) quoteMap.set(q.service_request_id, q);
        if (q.maintenance_request_id) quoteMap.set(q.maintenance_request_id, q);
      });

      // Build open requests list
      const srRequests: OpenRequest[] = (openSRs || []).map((sr: any) => {
        const unit = sr.units;
        const floor = unit?.floors;
        const building = floor?.buildings;
        const project = building?.projects;
        const locationParts = [project?.name, building?.name, floor?.name, unit?.unit_name || unit?.unit_number].filter(Boolean);
        return {
          id: sr.id,
          type: 'sr' as const,
          title: sr.title,
          description: sr.description || '',
          skill_type: sr.skill_type,
          priority: sr.priority,
          status: sr.status,
          created_at: sr.created_at,
          location: locationParts.join(' · '),
          project_name: project?.name,
          existing_quote: quoteMap.get(sr.id) || null,
        };
      });

      const mrRequests: OpenRequest[] = (openMRs || []).map((mr: any) => {
        const locationParts = [mr.projects?.name, mr.buildings?.name, mr.floors?.name].filter(Boolean);
        return {
          id: mr.id,
          type: 'mr' as const,
          title: mr.description?.slice(0, 80) || 'Maintenance Request',
          description: mr.description || '',
          skill_type: mr.skill_type,
          status: mr.status,
          created_at: mr.created_at,
          location: locationParts.join(' · '),
          project_name: mr.projects?.name,
          existing_quote: quoteMap.get(mr.id) || null,
        };
      });

      setOpenRequests([...srRequests, ...mrRequests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

      // Load work orders
      const { data: woData, error: woErr } = await supabase
        .from('work_orders')
        .select('id, wo_number, skill_type, amount, payment_terms, payer, status, other_instructions, created_at, completed_at, projects(name), buildings(name), floors(name)')
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false });

      if (woErr) { setError(woErr.message); setLoading(false); return; }

      const enriched = await Promise.all(
        (woData || []).map(async (wo: any) => {
          const { data: links } = await supabase
            .from('work_order_service_requests')
            .select('id, service_request_id, maintenance_request_id, service_requests(title), maintenance_requests(description)')
            .eq('work_order_id', wo.id);

          const linked_requests: LinkedRequest[] = (links || []).map((l: any) => {
            if (l.service_request_id && l.service_requests) return { id: l.service_request_id, label: l.service_requests.title || 'Service Request', type: 'sr' as const };
            if (l.maintenance_request_id && l.maintenance_requests) return { id: l.maintenance_request_id, label: l.maintenance_requests.description?.slice(0, 60) || 'Maintenance Request', type: 'mr' as const };
            return null;
          }).filter(Boolean) as LinkedRequest[];

          const { data: invData } = await supabase
            .from('invoices')
            .select('id, invoice_number, total_amount, status, due_date, approval_status')
            .eq('work_order_id', wo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return { ...wo, linked_requests, invoice: invData || null } as WorkOrder;
        })
      );

      setWorkOrders(enriched);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    }

    setLoading(false);
  }, [supabase, mimicProviderId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusUpdate = (id: string, newStatus: string) => {
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status: newStatus } : wo));
  };

  const filteredWOs = workOrders.filter(wo => {
    if (woFilter === 'active') return wo.status === 'issued' || wo.status === 'in_progress';
    if (woFilter === 'completed') return wo.status === 'completed';
    return true;
  });

  const allInvoices = workOrders.filter(wo => wo.invoice).map(wo => ({ ...wo.invoice!, woNumber: wo.wo_number, woProject: wo.projects?.name }));

  const stats = {
    openRequests: openRequests.length,
    pendingQuotes: openRequests.filter(r => r.existing_quote?.status === 'pending').length,
    activeWOs: workOrders.filter(w => w.status === 'issued' || w.status === 'in_progress').length,
    earnings: workOrders.filter(w => w.status === 'completed').reduce((s, w) => s + Number(w.amount || 0), 0),
  };

  const woFilterTabs: { id: WOFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: workOrders.length },
    { id: 'active', label: 'Active', count: stats.activeWOs },
    { id: 'completed', label: 'Completed', count: workOrders.filter(w => w.status === 'completed').length },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0f766e] flex items-center justify-center">
              <Wrench size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-700 text-foreground leading-tight">Service Provider Portal</p>
              <p className="text-[10px] text-muted-foreground leading-tight">PropFlow</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {provider && (
              <div className="text-right hidden sm:block">
                <p className="text-[12px] font-600 text-foreground">{provider.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{(provider.skills || [provider.skill_type]).join(', ')}</p>
              </div>
            )}
            <button onClick={loadData} disabled={loading} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50" title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            {provider && (
              <div className="w-8 h-8 rounded-full bg-[#0f766e]/10 flex items-center justify-center text-[#0f766e] text-[12px] font-700">
                {provider.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {error && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-[13px] text-destructive">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-600">Access Error</p>
              <p className="text-[12px] mt-0.5 opacity-80">{error}</p>
            </div>
          </div>
        )}

        {loading && !error && (
          <div className="space-y-3">
            <LoadingSkeleton rows={1} />
            <LoadingSkeleton rows={3} />
          </div>
        )}

        {!loading && !error && provider && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Open Requests', value: stats.openRequests, icon: <Inbox size={16} />, color: 'text-warning bg-warning/10' },
                { label: 'Pending Quotes', value: stats.pendingQuotes, icon: <Send size={16} />, color: 'text-primary bg-primary/10' },
                { label: 'Active WOs', value: stats.activeWOs, icon: <Clock size={16} />, color: stats.activeWOs > 0 ? 'text-warning bg-warning/10' : 'text-muted-foreground bg-secondary' },
                { label: 'Earnings (AED)', value: fmtCurrency(stats.earnings), icon: <TrendingUp size={16} />, color: 'text-[#0f766e] bg-[#0f766e]/10' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${stat.color}`}>{stat.icon}</div>
                  <p className="text-[18px] font-800 text-foreground leading-none mb-1 truncate">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Provider info strip */}
            <div className="bg-white rounded-xl border border-border px-4 py-3 flex flex-wrap items-center gap-2">
              {(provider.skills?.length > 0 ? provider.skills : [provider.skill_type]).map(s => (
                <span key={s} className="px-2.5 py-1 bg-[#0f766e]/10 text-[#0f766e] text-[11px] font-600 rounded-full capitalize">{s}</span>
              ))}
              {provider.email && <span className="text-[12px] text-muted-foreground">{provider.email}</span>}
              {provider.mobile && <span className="text-[12px] text-muted-foreground">{provider.mobile}</span>}
              <span className={`ml-auto text-[11px] font-600 px-2 py-0.5 rounded-full ${provider.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {provider.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Main Tabs */}
            <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit">
              {[
                { id: 'open_requests' as MainTab, label: 'Open Requests', icon: <Inbox size={13} />, count: stats.openRequests },
                { id: 'work_orders' as MainTab, label: 'Work Orders', icon: <ListChecks size={13} />, count: workOrders.length },
                { id: 'invoices' as MainTab, label: 'Invoices', icon: <Receipt size={13} />, count: allInvoices.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-500 transition-all duration-150 ${
                    activeTab === tab.id ? 'bg-[#0f766e] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span className={`text-[10px] font-700 px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Open Requests Tab */}
            {activeTab === 'open_requests' && (
              <div className="space-y-3">
                {openRequests.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No open requests"
                    description="No open service or maintenance requests match your skills and assigned projects."
                  />
                ) : (
                  <>
                    <p className="text-[12px] text-muted-foreground">Showing open requests matching your skills and assigned projects. Submit quotes to express interest.</p>
                    {openRequests.map(req => (
                      <OpenRequestCard
                        key={`${req.type}-${req.id}`}
                        req={req}
                        provider={provider}
                        onQuoteSubmitted={loadData}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Work Orders Tab */}
            {activeTab === 'work_orders' && (
              <>
                <div className="flex gap-1.5 flex-wrap">
                  {woFilterTabs.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setWoFilter(f.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-500 transition-all duration-150 border ${
                        woFilter === f.id ? 'bg-foreground text-white border-foreground' : 'bg-white text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      {f.label}
                      <span className={`text-[10px] font-700 px-1.5 py-0.5 rounded-full ${woFilter === f.id ? 'bg-white/20' : 'bg-secondary'}`}>{f.count}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {filteredWOs.length === 0 ? (
                    <EmptyState icon={ListChecks} title="No work orders" description={woFilter === 'all' ? 'No work orders assigned to you yet.' : `No ${woFilter} work orders.`} />
                  ) : (
                    filteredWOs.map(wo => (
                      <WorkOrderCard key={wo.id} wo={wo} provider={provider} onStatusUpdate={handleStatusUpdate} />
                    ))
                  )}
                </div>
              </>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                {allInvoices.length === 0 ? (
                  <div className="py-12 text-center">
                    <Receipt size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-[13px] text-muted-foreground">No invoices linked to your work orders yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <div className="px-5 py-3 bg-secondary/30 grid grid-cols-12 gap-3 text-[10px] font-700 text-muted-foreground uppercase tracking-wider">
                      <div className="col-span-3">Invoice #</div>
                      <div className="col-span-3">Work Order</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Due Date</div>
                      <div className="col-span-1 text-right">Amount</div>
                      <div className="col-span-1 text-right">PDF</div>
                    </div>
                    {allInvoices.map((inv) => {
                      const wo = workOrders.find(w => w.invoice?.id === inv.id);
                      return (
                        <div key={inv.id} className="px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-secondary/20 transition-colors">
                          <div className="col-span-3">
                            <div className="flex items-center gap-1.5">
                              {invoiceStatusIcon(inv.status)}
                              <span className="text-[12px] font-600 text-foreground truncate">{inv.invoice_number}</span>
                            </div>
                            {inv.approval_status && (
                              <span className={`text-[10px] font-500 capitalize ${inv.approval_status === 'approved' ? 'text-success' : inv.approval_status === 'rejected' ? 'text-destructive' : 'text-warning'}`}>
                                {inv.approval_status}
                              </span>
                            )}
                          </div>
                          <div className="col-span-3">
                            <p className="text-[12px] text-foreground truncate">{(inv as any).woNumber || '—'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{(inv as any).woProject || ''}</p>
                          </div>
                          <div className="col-span-2"><Badge variant={statusColors[inv.status] as any} size="sm">{inv.status}</Badge></div>
                          <div className="col-span-2"><span className="text-[12px] text-foreground">{fmt(inv.due_date)}</span></div>
                          <div className="col-span-1 text-right"><span className="text-[13px] font-700 text-foreground">{fmtCurrency(inv.total_amount)}</span></div>
                          <div className="col-span-1 text-right">
                            {wo && wo.status === 'completed' && (
                              <button onClick={() => generateInvoicePDF(wo, inv, provider)} className="w-7 h-7 rounded-lg bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center hover:bg-[#0f766e]/20 transition-colors ml-auto" title="Download">
                                <Download size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!loading && !error && !provider && (
          <div className="bg-white rounded-2xl border border-border p-6 text-center">
            <Wrench size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-[14px] font-600 text-foreground mb-1">Service Provider Portal</p>
            <p className="text-[12px] text-muted-foreground mb-4">Sign in with your service provider account to access open requests, submit quotes, and manage work orders.</p>
            <div className="inline-block bg-secondary/50 rounded-xl px-4 py-3 text-left">
              <p className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider mb-2">Demo Credentials</p>
              <p className="text-[12px] text-foreground font-mono">provider@propflow.io</p>
              <p className="text-[12px] text-foreground font-mono">provider123</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
