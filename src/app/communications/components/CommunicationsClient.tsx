'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Mail, Send, Users, CheckCircle, Search, ChevronDown, AlertCircle,
  Loader2, Plus, Save, Trash2, X, BookOpen, Building2, Layers, Home,
  FolderOpen, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string;           // persons.id
  lease_id: string;
  full_name: string;
  email: string;
  unit_name: string;
  floor_name: string;
  building_name: string;
  project_name: string;
  project_id: string;
  building_id: string;
  floor_id: string;
  unit_id: string;
  lease_status: string;
  selected: boolean;
}

interface HierarchyItem {
  id: string;
  name: string;
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

  useEffect(() => { setTemplates(loadTemplates()); }, []);

  const startEdit = (t: EmailTemplate) => {
    setEditingId(t.id); setEditName(t.name); setEditSubject(t.subject); setEditBody(t.body); setCreating(false);
  };
  const startCreate = () => {
    setCreating(true); setEditingId(null); setEditName(''); setEditSubject(''); setEditBody('');
  };
  const cancelEdit = () => { setEditingId(null); setCreating(false); };

  const saveEdit = () => {
    if (!editName.trim() || !editSubject.trim() || !editBody.trim()) return;
    let updated: EmailTemplate[];
    if (creating) {
      const newT: EmailTemplate = { id: `tpl-${Date.now()}`, name: editName.trim(), subject: editSubject.trim(), body: editBody.trim(), created_at: new Date().toISOString() };
      updated = [newT, ...templates];
    } else {
      updated = templates.map(t => t.id === editingId ? { ...t, name: editName.trim(), subject: editSubject.trim(), body: editBody.trim() } : t);
    }
    saveTemplates(updated); setTemplates(updated); setEditingId(null); setCreating(false);
  };

  const deleteTemplate = (id: string) => {
    let updated = templates.filter(t => t.id !== id);
    saveTemplates(updated); setTemplates(updated);
    if (editingId === id) cancelEdit();
  };

  const inp = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            <h2 className="text-[16px] font-600 text-foreground">Email Templates</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all">
              <Plus size={13} /> New Template
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
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
  const { t, language } = useLanguage();
  const { assignedProjectIds } = useAuth();

  // Tenants
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenantFetchError, setTenantFetchError] = useState('');

  // Hierarchy data
  const [projects, setProjects] = useState<HierarchyItem[]>([]);
  const [buildings, setBuildings] = useState<HierarchyItem[]>([]);
  const [floors, setFloors] = useState<HierarchyItem[]>([]);
  const [units, setUnits] = useState<HierarchyItem[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  // Selected hierarchy
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  // Compose
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [searchTenant, setSearchTenant] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Template manager
  const [showTemplates, setShowTemplates] = useState(false);

  // Send state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState('');

  // ── Fetch projects ─────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    setLoadingHierarchy(true);
    let query = supabase.from('projects').select('id, name').order('name');
    if (assignedProjectIds !== null && assignedProjectIds.length > 0) {
      query = query.in('id', assignedProjectIds);
    } else if (assignedProjectIds !== null && assignedProjectIds.length === 0) {
      setProjects([]);
      setLoadingHierarchy(false);
      return;
    }
    const { data } = await query;
    if (data) setProjects(data.map((p: any) => ({ id: p.id, name: p.name })));
    setLoadingHierarchy(false);
  }, [supabase, assignedProjectIds]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // ── Fetch tenants: flat two-step approach ──────────────────────────────────
  // Step 1: fetch leases (with unit_id) filtered by hierarchy
  // Step 2: fetch persons by lessee_person_id
  // Step 3: fetch unit/floor/building/project names
  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true);
    setTenantFetchError('');
    setTenants([]);

    try {
      // Step 1: Build lease query based on selected hierarchy
      // We need to filter leases by unit, which links to floor → building → project
      let unitIds: string[] | null = null;

      if (selectedUnit) {
        unitIds = [selectedUnit];
      } else if (selectedFloor) {
        const { data: floorUnits } = await supabase
          .from('units')
          .select('id')
          .eq('floor_id', selectedFloor);
        unitIds = (floorUnits || []).map((u: any) => u.id);
      } else if (selectedBuilding) {
        const { data: buildingFloors } = await supabase
          .from('floors')
          .select('id')
          .eq('building_id', selectedBuilding);
        const floorIds = (buildingFloors || []).map((f: any) => f.id);
        if (floorIds.length > 0) {
          const { data: buildingUnits } = await supabase
            .from('units')
            .select('id')
            .in('floor_id', floorIds);
          unitIds = (buildingUnits || []).map((u: any) => u.id);
        } else {
          unitIds = [];
        }
      } else if (selectedProject) {
        const { data: projectBuildings } = await supabase
          .from('buildings')
          .select('id')
          .eq('project_id', selectedProject);
        const buildingIds = (projectBuildings || []).map((b: any) => b.id);
        if (buildingIds.length > 0) {
          const { data: projectFloors } = await supabase
            .from('floors')
            .select('id')
            .in('building_id', buildingIds);
          const floorIds = (projectFloors || []).map((f: any) => f.id);
          if (floorIds.length > 0) {
            const { data: projectUnits } = await supabase
              .from('units')
              .select('id')
              .in('floor_id', floorIds);
            unitIds = (projectUnits || []).map((u: any) => u.id);
          } else {
            unitIds = [];
          }
        } else {
          unitIds = [];
        }
      }

      // If hierarchy selected but no units found, return empty
      if (unitIds !== null && unitIds.length === 0) {
        setTenants([]);
        setLoadingTenants(false);
        return;
      }

      // Step 2: Fetch active leases
      let leaseQuery = supabase
        .from('leases')
        .select('id, unit_id, lessee_person_id, status')
        .eq('status', 'active')
        .not('lessee_person_id', 'is', null);

      if (unitIds !== null) {
        leaseQuery = leaseQuery.in('unit_id', unitIds);
      }

      // Also apply project filter for staff users
      if (assignedProjectIds !== null && assignedProjectIds.length > 0 && unitIds === null) {
        // Need to get all unit IDs for assigned projects
        const { data: assignedBuildings } = await supabase
          .from('buildings')
          .select('id')
          .in('project_id', assignedProjectIds);
        const assignedBuildingIds = (assignedBuildings || []).map((b: any) => b.id);
        if (assignedBuildingIds.length > 0) {
          const { data: assignedFloors } = await supabase
            .from('floors')
            .select('id')
            .in('building_id', assignedBuildingIds);
          const assignedFloorIds = (assignedFloors || []).map((f: any) => f.id);
          if (assignedFloorIds.length > 0) {
            const { data: assignedUnits } = await supabase
              .from('units')
              .select('id')
              .in('floor_id', assignedFloorIds);
            const assignedUnitIds = (assignedUnits || []).map((u: any) => u.id);
            if (assignedUnitIds.length > 0) {
              leaseQuery = leaseQuery.in('unit_id', assignedUnitIds);
            }
          }
        }
      }

      const { data: leases, error: leaseError } = await leaseQuery;

      if (leaseError) {
        setTenantFetchError(`Failed to load leases: ${leaseError.message}`);
        setLoadingTenants(false);
        return;
      }

      if (!leases || leases.length === 0) {
        setTenants([]);
        setLoadingTenants(false);
        return;
      }

      // Step 3: Fetch persons by lessee_person_id
      const personIds = [...new Set(leases.map((l: any) => l.lessee_person_id).filter(Boolean))];
      const { data: persons, error: personError } = await supabase
        .from('persons')
        .select('id, name, email')
        .in('id', personIds);

      if (personError) {
        setTenantFetchError(`Failed to load person details: ${personError.message}`);
        setLoadingTenants(false);
        return;
      }

      const personMap = new Map((persons || []).map((p: any) => [p.id, p]));

      // Step 4: Fetch unit details with floor/building/project chain
      const leaseUnitIds = [...new Set(leases.map((l: any) => l.unit_id).filter(Boolean))];
      const { data: unitDetails } = await supabase
        .from('units')
        .select('id, unit_name, floor_id')
        .in('id', leaseUnitIds);

      const unitMap = new Map((unitDetails || []).map((u: any) => [u.id, u]));

      // Step 5: Fetch floors
      const floorIds = [...new Set((unitDetails || []).map((u: any) => u.floor_id).filter(Boolean))];
      const { data: floorDetails } = floorIds.length > 0
        ? await supabase.from('floors').select('id, name, building_id').in('id', floorIds)
        : { data: [] };

      const floorMap = new Map((floorDetails || []).map((f: any) => [f.id, f]));

      // Step 6: Fetch buildings
      const buildingIds = [...new Set((floorDetails || []).map((f: any) => f.building_id).filter(Boolean))];
      const { data: buildingDetails } = buildingIds.length > 0
        ? await supabase.from('buildings').select('id, name, project_id').in('id', buildingIds)
        : { data: [] };

      const buildingMap = new Map((buildingDetails || []).map((b: any) => [b.id, b]));

      // Step 7: Fetch projects
      const projectIds = [...new Set((buildingDetails || []).map((b: any) => b.project_id).filter(Boolean))];
      const { data: projectDetails } = projectIds.length > 0
        ? await supabase.from('projects').select('id, name').in('id', projectIds)
        : { data: [] };

      const projectMap = new Map((projectDetails || []).map((p: any) => [p.id, p]));

      // Step 8: Assemble tenant list
      const seen = new Set<string>();
      const mapped: Tenant[] = [];

      for (const lease of leases as any[]) {
        const person = personMap.get(lease.lessee_person_id);
        if (!person || !person.email) continue;

        // Deduplicate by email
        if (seen.has(person.email)) continue;
        seen.add(person.email);

        const unit = unitMap.get(lease.unit_id);
        const floor = unit ? floorMap.get(unit.floor_id) : null;
        const building = floor ? buildingMap.get(floor.building_id) : null;
        const project = building ? projectMap.get(building.project_id) : null;

        mapped.push({
          id: person.id,
          lease_id: lease.id,
          full_name: person.name || 'Unknown',
          email: person.email,
          unit_name: unit?.unit_name || '—',
          floor_name: floor?.name || '—',
          building_name: building?.name || '—',
          project_name: project?.name || '—',
          project_id: project?.id || '',
          building_id: building?.id || '',
          floor_id: floor?.id || '',
          unit_id: unit?.id || '',
          lease_status: lease.status,
          selected: false,
        });
      }

      setTenants(mapped);
    } catch (err: any) {
      setTenantFetchError(err.message || 'Unexpected error loading tenants.');
    } finally {
      setLoadingTenants(false);
    }
  }, [supabase, selectedProject, selectedBuilding, selectedFloor, selectedUnit, assignedProjectIds]);

  // ── Cascade: project → buildings ───────────────────────────────────────────
  const handleProjectChange = useCallback(async (id: string) => {
    setSelectedProject(id);
    setSelectedBuilding('');
    setSelectedFloor('');
    setSelectedUnit('');
    setBuildings([]);
    setFloors([]);
    setUnits([]);
    if (!id) return;
    setLoadingHierarchy(true);
    const { data } = await supabase.from('buildings').select('id, name').eq('project_id', id).order('name');
    if (data) setBuildings(data.map((b: any) => ({ id: b.id, name: b.name })));
    setLoadingHierarchy(false);
  }, [supabase]);

  // ── Cascade: building → floors ─────────────────────────────────────────────
  const handleBuildingChange = useCallback(async (id: string) => {
    setSelectedBuilding(id);
    setSelectedFloor('');
    setSelectedUnit('');
    setFloors([]);
    setUnits([]);
    if (!id) return;
    setLoadingHierarchy(true);
    const { data } = await supabase.from('floors').select('id, name').eq('building_id', id).order('name');
    if (data) setFloors(data.map((f: any) => ({ id: f.id, name: f.name })));
    setLoadingHierarchy(false);
  }, [supabase]);

  // ── Cascade: floor → units ─────────────────────────────────────────────────
  const handleFloorChange = useCallback(async (id: string) => {
    setSelectedFloor(id);
    setSelectedUnit('');
    setUnits([]);
    if (!id) return;
    setLoadingHierarchy(true);
    const { data } = await supabase.from('units').select('id, unit_name').eq('floor_id', id).order('unit_name');
    if (data) setUnits(data.map((u: any) => ({ id: u.id, name: u.unit_name || u.id })));
    setLoadingHierarchy(false);
  }, [supabase]);

  const handleUnitChange = (id: string) => setSelectedUnit(id);

  // Search filter
  const filteredTenants = tenants.filter(
    (t) =>
      t.full_name.toLowerCase().includes(searchTenant.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTenant.toLowerCase()) ||
      t.unit_name.toLowerCase().includes(searchTenant.toLowerCase())
  );

  const selectedTenants = tenants.filter((t) => t.selected);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleTenant = (id: string) =>
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));

  const selectAllFiltered = (val: boolean) => {
    const filteredIds = new Set(filteredTenants.map(t => t.id));
    setTenants((prev) => prev.map((t) => filteredIds.has(t.id) ? { ...t, selected: val } : t));
  };

  // ── Apply template ─────────────────────────────────────────────────────────
  const applyTemplate = (tpl: EmailTemplate) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
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

    if (!subject.trim()) { setSendError('Please enter an email subject.'); return; }
    if (!body.trim()) { setSendError('Please enter an email body.'); return; }

    const recipients = selectedTenants.map((t) => ({ email: t.email, name: t.full_name }));
    if (recipients.length === 0) { setSendError('Please select at least one recipient.'); return; }

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
        setSendResult({ success: data.success, totalRecipients: data.totalRecipients || recipients.length, errors: data.errors });
        setTenants((prev) => prev.map((t) => ({ ...t, selected: false })));
        setSubject('');
        setBody('');
      }
    } catch (err: any) {
      setSendError(err.message || 'Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── Hierarchy breadcrumb ───────────────────────────────────────────────────
  const hierarchyLabel = (() => {
    const parts: string[] = [];
    if (selectedProject) parts.push(projects.find(p => p.id === selectedProject)?.name || '');
    if (selectedBuilding) parts.push(buildings.find(b => b.id === selectedBuilding)?.name || '');
    if (selectedFloor) parts.push(floors.find(f => f.id === selectedFloor)?.name || '');
    if (selectedUnit) parts.push(units.find(u => u.id === selectedUnit)?.name || '');
    return parts.filter(Boolean).join(' › ');
  })();

  const selectCls = 'w-full px-3 py-2.5 text-[13px] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div key={language} className="flex flex-col h-full min-h-screen bg-background">
      {showTemplates && (
        <TemplateManagerPanel onSelect={applyTemplate} onClose={() => setShowTemplates(false)} />
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

        {/* ── Left Panel: Hierarchy + Tenants ── */}
        <div className="lg:w-[400px] shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-white overflow-y-auto max-h-[55vh] lg:max-h-none">

          {/* Step 1: Select Scope */}
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-700 uppercase tracking-widest text-muted-foreground">Step 1 — Select Scope</p>
            </div>

            {/* Project */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FolderOpen size={12} className="text-primary" />
                <label className="text-[12px] font-500 text-foreground">Project</label>
              </div>
              <div className="relative">
                <select value={selectedProject} onChange={e => handleProjectChange(e.target.value)} className={selectCls} disabled={loadingHierarchy}>
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Building */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Building2 size={12} className="text-primary" />
                <label className="text-[12px] font-500 text-foreground">Building</label>
                {!selectedProject && <span className="text-[10px] text-muted-foreground ml-auto">Select project first</span>}
              </div>
              <div className="relative">
                <select value={selectedBuilding} onChange={e => handleBuildingChange(e.target.value)} className={selectCls} disabled={!selectedProject || loadingHierarchy}>
                  <option value="">All Buildings</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Floor */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Layers size={12} className="text-primary" />
                <label className="text-[12px] font-500 text-foreground">Floor</label>
                {!selectedBuilding && <span className="text-[10px] text-muted-foreground ml-auto">Select building first</span>}
              </div>
              <div className="relative">
                <select value={selectedFloor} onChange={e => handleFloorChange(e.target.value)} className={selectCls} disabled={!selectedBuilding || loadingHierarchy}>
                  <option value="">All Floors</option>
                  {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Unit */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Home size={12} className="text-primary" />
                <label className="text-[12px] font-500 text-foreground">Unit</label>
                {!selectedFloor && <span className="text-[10px] text-muted-foreground ml-auto">Select floor first</span>}
              </div>
              <div className="relative">
                <select value={selectedUnit} onChange={e => handleUnitChange(e.target.value)} className={selectCls} disabled={!selectedFloor || loadingHierarchy}>
                  <option value="">All Units</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Load Tenants Button */}
            <button
              onClick={fetchTenants}
              disabled={loadingTenants}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-[13px] font-600 hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {loadingTenants ? (
                <><Loader2 size={14} className="animate-spin" /> Loading Tenants…</>
              ) : (
                <><RefreshCw size={14} /> Load Tenants</>
              )}
            </button>
          </div>

          {/* Step 2: Select Tenants */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-primary" />
                  <p className="text-[12px] font-700 uppercase tracking-widest text-muted-foreground">Step 2 — Select Tenants</p>
                </div>
                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {selectedTenants.length} / {filteredTenants.length}
                </span>
              </div>
            </div>

            <div className="px-4 py-3 flex-1 flex flex-col min-h-0">
              {/* Scope label */}
              {hierarchyLabel && (
                <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-primary/5 border border-primary/15 rounded-lg">
                  <FolderOpen size={11} className="text-primary shrink-0" />
                  <span className="text-[11px] text-primary font-500 truncate">{hierarchyLabel}</span>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchTenant}
                  onChange={(e) => setSearchTenant(e.target.value)}
                  placeholder="Search by name, email or unit..."
                  className="w-full pl-8 pr-3 py-2 text-[12px] border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Select all / clear */}
              {filteredTenants.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => selectAllFiltered(true)} className="text-[11px] text-primary hover:underline font-500">Select all ({filteredTenants.length})</button>
                  <button onClick={() => selectAllFiltered(false)} className="text-[11px] text-muted-foreground hover:underline">Clear all</button>
                </div>
              )}

              {/* Tenant list */}
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {tenantFetchError ? (
                  <div className="flex items-start gap-2 p-3 bg-destructive/8 border border-destructive/20 rounded-lg">
                    <AlertCircle size={13} className="text-destructive shrink-0 mt-0.5" />
                    <p className="text-[12px] text-destructive">{tenantFetchError}</p>
                  </div>
                ) : loadingTenants ? (
                  <div className="space-y-2 pt-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 bg-secondary/60 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filteredTenants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users size={28} className="text-muted-foreground/30 mb-2" />
                    <p className="text-[12px] text-muted-foreground font-500">No tenants found</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {tenants.length === 0
                        ? 'Select a scope above and click "Load Tenants"' :'No tenants match your search'}
                    </p>
                  </div>
                ) : (
                  filteredTenants.map((tenant) => (
                    <label
                      key={tenant.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        tenant.selected ? 'bg-primary/8 border border-primary/20' : 'hover:bg-secondary/60 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={tenant.selected}
                        onChange={() => toggleTenant(tenant.id)}
                        className="mt-0.5 accent-primary shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-600 text-foreground truncate">{tenant.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{tenant.email}</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {[tenant.project_name, tenant.building_name, tenant.floor_name, tenant.unit_name].filter(v => v && v !== '—').join(' › ')}
                        </p>
                      </div>
                      <Badge variant="success" className="shrink-0 text-[9px] px-1.5 py-0.5">active</Badge>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Compose ── */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-background">

          {/* Step 3 header */}
          <div className="px-6 py-4 border-b border-border bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-primary" />
                <p className="text-[12px] font-700 uppercase tracking-widest text-muted-foreground">Step 3 — Compose Email</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 text-primary border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-all">
                  <BookOpen size={12} /> Load Template
                </button>
                <button onClick={saveAsTemplate} disabled={!subject.trim() || !body.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary disabled:opacity-40 transition-all">
                  <Save size={12} /> Save as Template
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 flex-1">
            {/* Subject */}
            <div>
              <label className="block text-[12px] font-600 text-foreground mb-1.5">
                Email Subject <span className="text-destructive">*</span>
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Important Notice Regarding Your Tenancy"
                className="w-full px-4 py-2.5 text-[13px] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-600 text-foreground">
                  Email Body <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Use <code className="bg-secondary px-1 rounded text-[10px]">{'{{NAME}}'}</code> to personalize
                </span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder={`Dear {{NAME}},\n\nWrite your message here...\n\nBest regards,\nProperties Management Team`}
                className="w-full px-4 py-3 text-[13px] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none leading-relaxed"
              />
            </div>

            {/* Preview toggle */}
            {(subject || body) && (
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 text-[12px] text-primary hover:underline mb-2"
                >
                  {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                {showPreview && (
                  <div className="bg-white border border-border rounded-xl p-4">
                    <div className="border-b border-border pb-2 mb-3">
                      <p className="text-[11px] text-muted-foreground">Subject: <span className="text-foreground font-500">{subject || '—'}</span></p>
                    </div>
                    <div className="whitespace-pre-wrap text-[13px] text-foreground leading-relaxed">
                      {body.replace(/{{NAME}}/g, '[Recipient Name]') || <span className="text-muted-foreground italic">No body content yet</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Send summary + button */}
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-600 text-foreground">
                    {selectedTenants.length === 0
                      ? 'No recipients selected'
                      : `${selectedTenants.length} recipient${selectedTenants.length !== 1 ? 's' : ''} selected`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {hierarchyLabel ? `Scope: ${hierarchyLabel}` : 'Select tenants from the left panel'}
                  </p>
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || selectedTenants.length === 0 || !subject.trim() || !body.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-600 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
                >
                  {sending ? (
                    <><Loader2 size={15} className="animate-spin" /> Sending…</>
                  ) : (
                    <><Send size={15} /> Send Email</>
                  )}
                </button>
              </div>

              {/* Validation hints */}
              {(selectedTenants.length === 0 || !subject.trim() || !body.trim()) && (
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  {selectedTenants.length === 0 && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Select at least one tenant from the left panel
                    </p>
                  )}
                  {!subject.trim() && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Enter an email subject
                    </p>
                  )}
                  {!body.trim() && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Write the email body
                    </p>
                  )}
                </div>
              )}
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
                      ? `Email sent successfully to ${sendResult.totalRecipients} recipient${sendResult.totalRecipients !== 1 ? 's' : ''}.`
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
    </div>
  );
}
