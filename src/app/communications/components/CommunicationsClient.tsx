'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Send, Users, CheckCircle, Search, ChevronDown, ChevronUp, AlertCircle, Loader2, Wrench, Plus, Save, Trash2, X, BookOpen } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string;
  full_name: string;
  email: string;
  unit_name: string;
  project_name: string;
  lease_status: string;
  selected: boolean;
}

interface ServiceProvider {
  id: string;
  company_name: string;
  contact_email: string;
  service_type: string;
  selected: boolean;
}

interface SendResult {
  success: boolean;
  totalRecipients: number;
  errors?: string[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
}

type RecipientGroup = 'tenants' | 'providers' | 'both';

// ─── Default starter templates ────────────────────────────────────────────────

const STARTER_TEMPLATES: Omit<EmailTemplate, 'id' | 'created_at'>[] = [
  {
    name: 'Approval Notice',
    subject: 'Your Request Has Been Approved',
    body: `Dear {{NAME}},

We are pleased to inform you that your recent request has been approved.

Please log in to the tenant portal to review the details and take any necessary action.

If you have any questions, please do not hesitate to contact us.

Best regards,
Properties Management Team`,
  },
  {
    name: 'Lease Terms Update',
    subject: 'Important Update: Lease Terms Notification',
    body: `Dear {{NAME}},

This is to notify you of an important update regarding your lease terms.

Please review the updated terms in your tenant portal at your earliest convenience.

If you have any questions or concerns about the changes, please contact our leasing team.

Best regards,
Properties Management Team`,
  },
  {
    name: 'Payment Due Reminder',
    subject: 'Payment Due Reminder – Action Required',
    body: `Dear {{NAME}},

This is a friendly reminder that a payment is due on your account.

Please log in to the tenant portal to view your outstanding invoices and make a payment.

If you have already made the payment, please disregard this notice.

Best regards,
Properties Management Team`,
  },
  {
    name: 'General Announcement',
    subject: 'Important Announcement',
    body: `Dear {{NAME}},

We have an important announcement to share with you.

Please log in to the portal for more details.

Best regards,
Properties Management Team`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHtml(body: string, name: string): string {
  const personalizedBody = body.replace(/{{NAME}}/g, name).replace(/\n/g, '<br/>');
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:DM Sans,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="border-bottom:2px solid #6366f1;padding-bottom:16px;margin-bottom:24px;">
    <h2 style="margin:0;color:#6366f1;font-size:20px;">Properties Management</h2>
  </div>
  <div style="line-height:1.7;font-size:14px;">${personalizedBody}</div>
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    <p>This is an automated notification from the Properties Management System.</p>
  </div>
</body>
</html>`;
}

const STORAGE_KEY = 'comm_email_templates_v1';

function loadTemplates(): EmailTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed with starter templates
  const seeded: EmailTemplate[] = STARTER_TEMPLATES.map((t, i) => ({
    ...t,
    id: `starter-${i}`,
    created_at: new Date().toISOString(),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveTemplates(templates: EmailTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// ─── Template Manager Panel ───────────────────────────────────────────────────

function TemplateManagerPanel({
  onSelect,
  onClose,
}: {
  onSelect: (t: EmailTemplate) => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const startEdit = (t: EmailTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditSubject(t.subject);
    setEditBody(t.body);
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setEditName('');
    setEditSubject('');
    setEditBody('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editSubject.trim() || !editBody.trim()) return;
    let updated: EmailTemplate[];
    if (creating) {
      const newT: EmailTemplate = {
        id: `tpl-${Date.now()}`,
        name: editName.trim(),
        subject: editSubject.trim(),
        body: editBody.trim(),
        created_at: new Date().toISOString(),
      };
      updated = [newT, ...templates];
    } else {
      updated = templates.map(t =>
        t.id === editingId ? { ...t, name: editName.trim(), subject: editSubject.trim(), body: editBody.trim() } : t
      );
    }
    saveTemplates(updated);
    setTemplates(updated);
    setEditingId(null);
    setCreating(false);
  };

  const deleteTemplate = (id: string) => {
    let updated = templates.filter(t => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
    if (editingId === id) cancelEdit();
  };

  const inp = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            <h2 className="text-[16px] font-600 text-foreground">Email Templates</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all">
              <Plus size={13} /> New Template
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template list */}
          <div className="w-56 shrink-0 border-r border-border overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-6 px-3">No templates yet. Create one!</p>
            ) : (
              <div className="p-2 space-y-1">
                {templates.map(t => (
                  <div key={t.id}
                    className={`group flex items-center justify-between gap-1 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${editingId === t.id ? 'bg-primary/8 border border-primary/20' : 'hover:bg-secondary/60 border border-transparent'}`}
                    onClick={() => startEdit(t)}>
                    <span className="text-[12px] font-500 text-foreground truncate flex-1">{t.name}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); onSelect(t); onClose(); }}
                        className="p-1 rounded text-primary hover:bg-primary/10 transition-colors" title="Use template">
                        <CheckCircle size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                        className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit panel */}
          <div className="flex-1 overflow-y-auto p-5">
            {(editingId || creating) ? (
              <div className="space-y-4">
                <h3 className="text-[14px] font-600 text-foreground">{creating ? 'New Template' : 'Edit Template'}</h3>
                <div>
                  <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1">Template Name *</label>
                  <input className={inp} value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Rent Reminder" />
                </div>
                <div>
                  <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1">Email Subject *</label>
                  <input className={inp} value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="Email subject line" />
                </div>
                <div>
                  <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1">Email Body *</label>
                  <p className="text-[11px] text-muted-foreground mb-1">Use <code className="bg-secondary px-1 rounded">{'{{NAME}}'}</code> to personalize with recipient name.</p>
                  <textarea className={`${inp} resize-none`} rows={10} value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Write your email body here..." />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={saveEdit} disabled={!editName.trim() || !editSubject.trim() || !editBody.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
                    <Save size={13} /> Save Template
                  </button>
                  <button onClick={cancelEdit} className="px-4 py-2 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <BookOpen size={32} className="text-muted-foreground/40 mb-3" />
                <p className="text-[13px] text-muted-foreground">Select a template to edit, or create a new one.</p>
                <p className="text-[11px] text-muted-foreground mt-1">Click <CheckCircle size={10} className="inline" /> to use a template in your email.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommunicationsClient() {
  const supabase = createClient();
  const { t } = useLanguage();

  // Data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Compose
  const [recipientGroup, setRecipientGroup] = useState<RecipientGroup>('tenants');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [searchTenant, setSearchTenant] = useState('');
  const [searchProvider, setSearchProvider] = useState('');
  const [tenantsExpanded, setTenantsExpanded] = useState(true);
  const [providersExpanded, setProvidersExpanded] = useState(true);

  // Template manager
  const [showTemplates, setShowTemplates] = useState(false);

  // Send state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState('');

  // ── Fetch tenants from leases ──────────────────────────────────────────────
  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true);
    const { data, error } = await supabase
      .from('leases')
      .select(`
        id,
        status,
        persons:tenant_id ( id, name, email ),
        units:unit_id ( unit_name, floors ( buildings ( projects ( name ) ) ) )
      `)
      .in('status', ['active', 'pending']);

    if (!error && data) {
      const mapped: Tenant[] = data
        .filter((l: any) => l.persons?.email)
        .map((l: any) => ({
          id: l.persons.id,
          full_name: l.persons.name || 'Unknown',
          email: l.persons.email,
          unit_name: l.units?.unit_name || '—',
          project_name: l.units?.floors?.buildings?.projects?.name || '—',
          lease_status: l.status,
          selected: false,
        }));
      // Deduplicate by email
      const seen = new Set<string>();
      const unique = mapped.filter((t) => {
        if (seen.has(t.email)) return false;
        seen.add(t.email);
        return true;
      });
      setTenants(unique);
    }
    setLoadingTenants(false);
  }, [supabase]);

  // ── Fetch service providers ────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    setLoadingProviders(true);
    const { data, error } = await supabase
      .from('service_providers')
      .select('id, company_name, contact_email, service_type')
      .not('contact_email', 'is', null);

    if (!error && data) {
      setProviders(
        data.map((p: any) => ({
          id: p.id,
          company_name: p.company_name || 'Unknown',
          contact_email: p.contact_email,
          service_type: p.service_type || 'General',
          selected: false,
        }))
      );
    }
    setLoadingProviders(false);
  }, [supabase]);

  useEffect(() => {
    fetchTenants();
    fetchProviders();
  }, [fetchTenants, fetchProviders]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleTenant = (id: string) =>
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));

  const toggleProvider = (id: string) =>
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));

  const selectAllTenants = (val: boolean) =>
    setTenants((prev) => prev.map((t) => ({ ...t, selected: val })));

  const selectAllProviders = (val: boolean) =>
    setProviders((prev) => prev.map((p) => ({ ...p, selected: val })));

  const filteredTenants = tenants.filter(
    (t) =>
      t.full_name.toLowerCase().includes(searchTenant.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTenant.toLowerCase()) ||
      t.project_name.toLowerCase().includes(searchTenant.toLowerCase())
  );

  const filteredProviders = providers.filter(
    (p) =>
      p.company_name.toLowerCase().includes(searchProvider.toLowerCase()) ||
      p.contact_email.toLowerCase().includes(searchProvider.toLowerCase()) ||
      p.service_type.toLowerCase().includes(searchProvider.toLowerCase())
  );

  const selectedTenants = tenants.filter((t) => t.selected);
  const selectedProviders = providers.filter((p) => p.selected);

  const totalSelected =
    recipientGroup === 'tenants'
      ? selectedTenants.length
      : recipientGroup === 'providers'
      ? selectedProviders.length
      : selectedTenants.length + selectedProviders.length;

  // ── Apply template ─────────────────────────────────────────────────────────
  const applyTemplate = (t: EmailTemplate) => {
    setSubject(t.subject);
    setBody(t.body);
  };

  // ── Save current as template ───────────────────────────────────────────────
  const saveAsTemplate = () => {
    if (!subject.trim() || !body.trim()) return;
    const name = prompt('Enter a name for this template:');
    if (!name?.trim()) return;
    const templates = loadTemplates();
    const newT: EmailTemplate = {
      id: `tpl-${Date.now()}`,
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      created_at: new Date().toISOString(),
    };
    saveTemplates([newT, ...templates]);
    alert(`Template "${name.trim()}" saved!`);
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setSendError('');
    setSendResult(null);

    if (!subject.trim()) {
      setSendError('Please enter an email subject.');
      return;
    }
    if (!body.trim()) {
      setSendError('Please enter an email body.');
      return;
    }

    const recipients: { email: string; name: string }[] = [];

    if (recipientGroup === 'tenants' || recipientGroup === 'both') {
      selectedTenants.forEach((t) => recipients.push({ email: t.email, name: t.full_name }));
    }
    if (recipientGroup === 'providers' || recipientGroup === 'both') {
      selectedProviders.forEach((p) => recipients.push({ email: p.contact_email, name: p.company_name }));
    }

    if (recipients.length === 0) {
      setSendError('Please select at least one recipient.');
      return;
    }

    setSending(true);

    try {
      const res = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          subject: subject.trim(),
          htmlContent: buildHtml(body, recipients.map((r) => r.name).join(', ')),
          notificationType: 'general',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error || 'Failed to send notifications.');
      } else {
        setSendResult({
          success: data.success,
          totalRecipients: data.totalRecipients || recipients.length,
          errors: data.errors,
        });
        // Deselect all after send
        selectAllTenants(false);
        selectAllProviders(false);
        setSubject('');
        setBody('');
      }
    } catch (err: any) {
      setSendError(err.message || 'Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Template Manager Modal */}
      {showTemplates && (
        <TemplateManagerPanel
          onSelect={applyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="text-[15px] sm:text-[17px] font-600 text-foreground">{t.comms_title}</h1>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground hidden sm:block">{t.comms_subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 transition-all">
          <BookOpen size={14} /> <span className="hidden sm:inline">Templates</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* ── Left: Recipient Selection ── */}
        <div className="lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-white overflow-y-auto max-h-[40vh] lg:max-h-none">
          {/* Group selector */}
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <p className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground mb-2">Recipient Group</p>
            <div className="flex gap-2">
              {(['tenants', 'providers', 'both'] as RecipientGroup[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setRecipientGroup(g)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-500 border transition-all ${
                    recipientGroup === g
                      ? 'bg-primary text-white border-primary' :'bg-white text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {g === 'both' ? 'Both' : g === 'tenants' ? 'Tenants' : 'Providers'}
                </button>
              ))}
            </div>
          </div>

          {/* Tenants section */}
          {(recipientGroup === 'tenants' || recipientGroup === 'both') && (
            <div className="border-b border-border">
              <button
                onClick={() => setTenantsExpanded(!tenantsExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-primary" />
                  <span className="text-[13px] font-600 text-foreground">Tenants</span>
                  <span className="text-[11px] text-muted-foreground">({selectedTenants.length}/{tenants.length} selected)</span>
                </div>
                {tenantsExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>

              {tenantsExpanded && (
                <div className="px-4 pb-3">
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchTenant}
                      onChange={(e) => setSearchTenant(e.target.value)}
                      placeholder="Search tenants..."
                      className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={() => selectAllTenants(true)} className="text-[11px] text-primary hover:underline">Select all</button>
                    <button onClick={() => selectAllTenants(false)} className="text-[11px] text-muted-foreground hover:underline">Clear</button>
                  </div>

                  {loadingTenants ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 bg-secondary/60 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : filteredTenants.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground text-center py-4">No tenants found</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {filteredTenants.map((t) => (
                        <label
                          key={t.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
                            t.selected ? 'bg-primary/8 border border-primary/20' : 'hover:bg-secondary/60 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={t.selected}
                            onChange={() => toggleTenant(t.id)}
                            className="mt-0.5 accent-primary shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[12px] font-500 text-foreground truncate">{t.full_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{t.email}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{t.project_name} · {t.unit_name}</p>
                          </div>
                          <Badge variant={t.lease_status === 'active' ? 'success' : 'default'} className="shrink-0 text-[9px] px-1.5 py-0.5">
                            {t.lease_status}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Service Providers section */}
          {(recipientGroup === 'providers' || recipientGroup === 'both') && (
            <div>
              <button
                onClick={() => setProvidersExpanded(!providersExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wrench size={14} className="text-primary" />
                  <span className="text-[13px] font-600 text-foreground">Service Providers</span>
                  <span className="text-[11px] text-muted-foreground">({selectedProviders.length}/{providers.length} selected)</span>
                </div>
                {providersExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>

              {providersExpanded && (
                <div className="px-4 pb-3">
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchProvider}
                      onChange={(e) => setSearchProvider(e.target.value)}
                      placeholder="Search providers..."
                      className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={() => selectAllProviders(true)} className="text-[11px] text-primary hover:underline">Select all</button>
                    <button onClick={() => selectAllProviders(false)} className="text-[11px] text-muted-foreground hover:underline">Clear</button>
                  </div>

                  {loadingProviders ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-10 bg-secondary/60 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : filteredProviders.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground text-center py-4">No providers found</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {filteredProviders.map((p) => (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
                            p.selected ? 'bg-primary/8 border border-primary/20' : 'hover:bg-secondary/60 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={() => toggleProvider(p.id)}
                            className="mt-0.5 accent-primary shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[12px] font-500 text-foreground truncate">{p.company_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{p.contact_email}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{p.service_type}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Compose ── */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-background p-6 gap-5">

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground">
                Email Subject <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  <BookOpen size={11} /> Load Template
                </button>
                <span className="text-muted-foreground text-[11px]">|</span>
                <button onClick={saveAsTemplate} disabled={!subject.trim() || !body.trim()}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline disabled:opacity-40 disabled:no-underline">
                  <Save size={11} /> Save as Template
                </button>
              </div>
            </div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-3 py-2 text-[13px] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
          </div>

          {/* Email Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground">
                Email Body <span className="text-destructive">*</span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Use <code className="bg-secondary px-1 rounded text-[10px]">{'{{NAME}}'}</code> to personalize with recipient name
              </p>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write your email body here...&#10;&#10;Dear {{NAME}},&#10;&#10;Your message here..."
              className="w-full px-3 py-2.5 text-[13px] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none font-mono"
            />
          </div>

          {/* Preview */}
          {(subject || body) && (
            <div>
              <p className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground mb-1.5">Preview</p>
              <div className="bg-white border border-border rounded-xl p-4 text-[13px] text-foreground leading-relaxed">
                <div className="border-b border-border pb-3 mb-3">
                  <p className="text-[11px] text-muted-foreground">Subject: <span className="text-foreground font-500">{subject || '—'}</span></p>
                </div>
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                  {body.replace(/{{NAME}}/g, '[Recipient Name]') || <span className="text-muted-foreground italic">No body content yet</span>}
                </div>
              </div>
            </div>
          )}

          {/* Send summary + button */}
          <div className="bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-600 text-foreground">
                {totalSelected === 0 ? 'No recipients selected' : `${totalSelected} recipient${totalSelected !== 1 ? 's' : ''} selected`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {recipientGroup === 'tenants' && `${selectedTenants.length} tenant${selectedTenants.length !== 1 ? 's' : ''}`}
                {recipientGroup === 'providers' && `${selectedProviders.length} provider${selectedProviders.length !== 1 ? 's' : ''}`}
                {recipientGroup === 'both' && `${selectedTenants.length} tenant${selectedTenants.length !== 1 ? 's' : ''} + ${selectedProviders.length} provider${selectedProviders.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || totalSelected === 0 || !subject.trim() || !body.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-[13px] font-600 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {sending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Notification
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {sendError && (
            <div className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-[13px] text-destructive">{sendError}</p>
            </div>
          )}

          {/* Success */}
          {sendResult && (
            <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 border ${sendResult.success ? 'bg-success/8 border-success/20' : 'bg-warning/8 border-warning/20'}`}>
              {sendResult.success ? (
                <CheckCircle size={15} className="text-success shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={15} className="text-warning shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-[13px] font-500 text-foreground">
                  {sendResult.success
                    ? `Notification sent successfully to ${sendResult.totalRecipients} recipient${sendResult.totalRecipients !== 1 ? 's' : ''}.`
                    : `Sent with some issues. ${sendResult.totalRecipients} recipient${sendResult.totalRecipients !== 1 ? 's' : ''} processed.`}
                </p>
                {sendResult.errors && sendResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {sendResult.errors.map((e, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground">• {e}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
