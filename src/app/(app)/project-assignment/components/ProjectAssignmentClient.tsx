'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, Search, Trash2, RefreshCw, Shield, UserCheck, ChevronDown, ChevronUp, Check, Edit2, AlertCircle, Home, Building2, Layers, DoorOpen, Eye, EyeOff, X, BarChart2, LayoutDashboard } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Sidebar nav definition (mirrors Sidebar.tsx) ───────────────────────────
const NAV_ITEMS = [
  { key: 'nav-dashboard',       label: 'Dashboard',             group: 'Portfolio' },
  { key: 'nav-property',        label: 'Property Management',   group: 'Portfolio' },
  { key: 'nav-assignment',      label: 'Project Assignment',    group: 'Portfolio' },
  { key: 'nav-leasing',         label: 'Leasing',               group: 'Portfolio' },
  { key: 'nav-renewals',        label: 'Lease Renewals',        group: 'Portfolio' },
  { key: 'nav-invoicing',       label: 'Invoicing',             group: 'Portfolio' },
  { key: 'nav-communications',  label: 'Communications',        group: 'Portfolio' },
  { key: 'nav-tenant-portal',   label: 'Tenant Portal',         group: 'Portfolio' },
  { key: 'nav-provider-portal', label: 'Provider Portal',       group: 'Portfolio' },
  { key: 'nav-maintenance',     label: 'Maintenance',           group: 'Operations' },
  { key: 'nav-workorders',      label: 'Work Orders',           group: 'Operations' },
  { key: 'nav-turnover',        label: 'Turnover Rent',         group: 'Operations' },
  { key: 'nav-masterdata',      label: 'Master Data',           group: 'Admin' },
  { key: 'nav-bulk',            label: 'Bulk Onboarding',       group: 'Admin' },
  { key: 'nav-reports',         label: 'Reports',               group: 'Admin' },
  { key: 'nav-analytics',       label: 'Analytics',             group: 'Admin' },
  { key: 'nav-audit-log',       label: 'Audit Log',             group: 'Admin' },
  { key: 'nav-settings',        label: 'Settings',              group: 'Admin' },
];

const NAV_GROUPS = ['Portfolio', 'Operations', 'Admin'];

// ─── Sub-functions per nav item ───────────────────────────────────────────────
const SUB_FUNCTIONS: Record<string, string[]> = {
  'nav-dashboard':       ['View KPIs', 'View Occupancy Chart', 'View Rent Collection Chart', 'View Expiring Leases', 'View Activity Feed'],
  'nav-property':        ['View Projects', 'Add Project', 'Edit Project', 'Manage Buildings', 'Manage Floors', 'Manage Units'],
  'nav-assignment':      ['Manage Roles', 'Manage Staff', 'Assign Projects', 'Assign Landlords'],
  'nav-leasing':         ['View Leases', 'Create Lease', 'Edit Lease', 'Terminate Lease'],
  'nav-renewals':        ['View Renewals', 'Approve Renewal', 'Reject Renewal'],
  'nav-invoicing':       ['View Invoices', 'Generate Invoice', 'Mark Paid'],
  'nav-communications':  ['View Messages', 'Send Message', 'Manage Templates'],
  'nav-tenant-portal':   ['View Tenant Requests', 'Respond to Requests'],
  'nav-provider-portal': ['View Provider Jobs', 'Assign Jobs', 'Close Jobs'],
  'nav-maintenance':     ['View Requests', 'Create Request', 'Assign Technician', 'Close Request'],
  'nav-workorders':      ['View Work Orders', 'Create Work Order', 'Update Status'],
  'nav-turnover':        ['View Turnover Reports', 'Enter Turnover Data'],
  'nav-masterdata':      ['View Master Data', 'Add Service Provider', 'Add Person', 'Edit Lookups'],
  'nav-bulk':            ['Upload Bulk Data', 'View Upload History'],
  'nav-reports':         ['View Reports', 'Export Reports'],
  'nav-analytics':       ['View Analytics', 'Export Analytics'],
  'nav-audit-log':       ['View Audit Log', 'Export Audit Log'],
  'nav-settings':        ['View Settings', 'Edit Settings'],
};

// ─── Dashboard widgets ────────────────────────────────────────────────────────
const DASHBOARD_WIDGETS = [
  { key: 'widget-kpi-occupancy',    label: 'Occupancy Rate KPI' },
  { key: 'widget-kpi-revenue',      label: 'Monthly Revenue KPI' },
  { key: 'widget-kpi-leases',       label: 'Active Leases KPI' },
  { key: 'widget-kpi-maintenance',  label: 'Open Maintenance KPI' },
  { key: 'widget-occupancy-chart',  label: 'Occupancy by Project Chart' },
  { key: 'widget-rent-chart',       label: 'Rent Collection Chart' },
  { key: 'widget-expiring-leases',  label: 'Expiring Leases Table' },
  { key: 'widget-activity-feed',    label: 'Activity Feed' },
];

// ─── Country codes ─────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+971', label: 'UAE (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+973', label: 'Bahrain (+973)' },
  { code: '+968', label: 'Oman (+968)' },
  { code: '+965', label: 'Kuwait (+965)' },
  { code: '+91',  label: 'India (+91)' },
  { code: '+92',  label: 'Pakistan (+92)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+94',  label: 'Sri Lanka (+94)' },
  { code: '+63',  label: 'Philippines (+63)' },
  { code: '+20',  label: 'Egypt (+20)' },
  { code: '+44',  label: 'UK (+44)' },
  { code: '+1',   label: 'USA/Canada (+1)' },
  { code: '+61',  label: 'Australia (+61)' },
  { code: '+49',  label: 'Germany (+49)' },
  { code: '+33',  label: 'France (+33)' },
];

// ─── PhoneInput component ──────────────────────────────────────────────────────
function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsePhone = (v: string) => {
    const found = COUNTRY_CODES.find(c => v.startsWith(c.code));
    if (found) return { countryCode: found.code, number: v.slice(found.code.length).trim() };
    return { countryCode: '+971', number: v };
  };
  const { countryCode, number } = parsePhone(value);

  return (
    <div className="flex gap-1.5">
      <select
        value={countryCode}
        onChange={e => onChange(e.target.value + ' ' + number)}
        className="w-36 px-2 py-2.5 text-[12px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
      >
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <input
        type="tel"
        value={number}
        onChange={e => onChange(countryCode + ' ' + e.target.value)}
        placeholder="Phone number"
        className="flex-1 px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
      />
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Role {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface RolePermission {
  id: string;
  role_id: string;
  nav_key: string;
}

interface Staff {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Building {
  id: string;
  name: string;
  project_id: string;
}

interface Floor {
  id: string;
  name: string;
  building_id: string;
}

interface Unit {
  id: string;
  unit_number: string;
  unit_name: string;
  floor_id: string;
}

interface Person {
  id: string;
  name: string;
  email: string | null;
}

interface StaffRoleAssignment {
  id: string;
  staff_id: string;
  project_id: string;
  role_id: string;
  created_at: string;
}

interface LandlordAssignment {
  id: string;
  person_id: string;
  landlord_type: 'landlord' | 'joint_landlord';
  ownership_pct: number;
  project_id: string | null;
  building_id: string | null;
  floor_id: string | null;
  unit_id: string | null;
  created_at: string;
}

type TabId = 'roles' | 'staff' | 'assignments' | 'landlords';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
const labelCls = 'block text-[12px] font-500 text-foreground mb-1.5';

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function ErrorBanner({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive">
      <AlertCircle size={14} className="shrink-0" />
      <span className="flex-1">{msg}</span>
      {onRetry && <button onClick={onRetry} className="text-[12px] underline ml-2">Retry</button>}
    </div>
  );
}

// ─── Create / Edit Role Modal ─────────────────────────────────────────────────
function RoleModal({
  open, onClose, onSaved, editRole, existingPermissions,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editRole: Role | null;
  existingPermissions: RolePermission[];
}) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expandedSubFunctions, setExpandedSubFunctions] = useState<Set<string>>(new Set());
  const [selectedSubFunctions, setSelectedSubFunctions] = useState<Record<string, string[]>>({});
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'nav' | 'widgets'>('nav');

  useEffect(() => {
    if (open) {
      setName(editRole?.name || '');
      setDescription(editRole?.description || '');
      const existingKeys = editRole
        ? existingPermissions.filter(p => p.role_id === editRole.id).map(p => p.nav_key)
        : [];
      // Separate nav keys, sub-function keys, and widget keys
      const navKeys = existingKeys.filter(k => k.startsWith('nav-'));
      const widgetKeys = existingKeys.filter(k => k.startsWith('widget-'));
      const subFuncKeys = existingKeys.filter(k => k.startsWith('subfn-'));

      setSelectedKeys(navKeys);
      setSelectedWidgets(widgetKeys);

      // Rebuild selectedSubFunctions from stored keys
      const subFnMap: Record<string, string[]> = {};
      subFuncKeys.forEach(k => {
        // format: subfn-{nav_key}-{index}
        const parts = k.split('-');
        // nav key is parts[1]+'-'+parts[2], sub fn index is parts[3]
        const navKey = parts[1] + '-' + parts[2];
        const fnLabel = SUB_FUNCTIONS[navKey]?.[parseInt(parts[3])] || '';
        if (fnLabel) {
          subFnMap[navKey] = [...(subFnMap[navKey] || []), fnLabel];
        }
      });
      setSelectedSubFunctions(subFnMap);
      setExpandedSubFunctions(new Set());
      setError('');
      setActiveSection('nav');
    }
  }, [open, editRole, existingPermissions]);

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) {
        // Also clear sub-functions for this nav item
        setSelectedSubFunctions(sf => { const n = { ...sf }; delete n[key]; return n; });
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  const toggleGroup = (group: string) => {
    const groupKeys = NAV_ITEMS.filter(n => n.group === group).map(n => n.key);
    const allSelected = groupKeys.every(k => selectedKeys.includes(k));
    if (allSelected) {
      setSelectedKeys(prev => prev.filter(k => !groupKeys.includes(k)));
      setSelectedSubFunctions(sf => {
        const n = { ...sf };
        groupKeys.forEach(k => delete n[k]);
        return n;
      });
    } else {
      setSelectedKeys(prev => [...new Set([...prev, ...groupKeys])]);
    }
  };

  const toggleSubFunction = (navKey: string, fn: string) => {
    setSelectedSubFunctions(prev => {
      const current = prev[navKey] || [];
      const updated = current.includes(fn) ? current.filter(f => f !== fn) : [...current, fn];
      return { ...prev, [navKey]: updated };
    });
  };

  const toggleAllSubFunctions = (navKey: string) => {
    const allFns = SUB_FUNCTIONS[navKey] || [];
    const current = selectedSubFunctions[navKey] || [];
    const allSelected = allFns.every(f => current.includes(f));
    setSelectedSubFunctions(prev => ({
      ...prev,
      [navKey]: allSelected ? [] : [...allFns],
    }));
  };

  const toggleWidget = (key: string) =>
    setSelectedWidgets(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const toggleAllWidgets = () => {
    const allKeys = DASHBOARD_WIDGETS.map(w => w.key);
    const allSelected = allKeys.every(k => selectedWidgets.includes(k));
    setSelectedWidgets(allSelected ? [] : allKeys);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Role name is required'); return; }
    setSaving(true);
    setError('');

    try {
      let roleId = editRole?.id;

      if (editRole) {
        const { error: updErr } = await supabase
          .from('roles')
          .update({ name: name.trim(), description: description.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', editRole.id);
        if (updErr) throw updErr;
      } else {
        const { data, error: insErr } = await supabase
          .from('roles')
          .insert({ name: name.trim(), description: description.trim() || null })
          .select('id')
          .single();
        if (insErr) throw insErr;
        roleId = data.id;
      }

      // Build all permission keys: nav keys + sub-function keys + widget keys
      const subFnKeys: string[] = [];
      Object.entries(selectedSubFunctions).forEach(([navKey, fns]) => {
        const allFns = SUB_FUNCTIONS[navKey] || [];
        fns.forEach(fn => {
          const idx = allFns.indexOf(fn);
          if (idx >= 0) subFnKeys.push(`subfn-${navKey}-${idx}`);
        });
      });

      const allKeys = [...selectedKeys, ...subFnKeys, ...selectedWidgets];

      await supabase.from('role_permissions').delete().eq('role_id', roleId!);
      if (allKeys.length > 0) {
        const { error: permErr } = await supabase
          .from('role_permissions')
          .insert(allKeys.map(k => ({ role_id: roleId!, nav_key: k })));
        if (permErr) throw permErr;
      }

      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const totalSelected = selectedKeys.length + selectedWidgets.length +
    Object.values(selectedSubFunctions).reduce((s, a) => s + a.length, 0);

  return (
    <Modal open={open} onClose={onClose} title={editRole ? 'Edit Role' : 'Create New Role'} subtitle="Define a role and assign sidebar access, sub-functions, and dashboard widgets" size="xl">
      <div className="p-5 space-y-5 max-h-[85vh] overflow-y-auto">
        {error && <ErrorBanner msg={error} />}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelCls}>Role Name *</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Property Manager" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this role" />
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveSection('nav')}
            className={`flex items-center gap-2 px-4 py-2 text-[12px] font-500 rounded-lg transition-all ${activeSection === 'nav' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Shield size={13} /> Sidebar Access & Sub-Functions
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-600 bg-primary/15 text-primary rounded-full">
              {selectedKeys.length + Object.values(selectedSubFunctions).reduce((s, a) => s + a.length, 0)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('widgets')}
            className={`flex items-center gap-2 px-4 py-2 text-[12px] font-500 rounded-lg transition-all ${activeSection === 'widgets' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutDashboard size={13} /> Dashboard Widgets
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-600 bg-primary/15 text-primary rounded-full">
              {selectedWidgets.length}
            </span>
          </button>
        </div>

        {/* ── Sidebar Access & Sub-Functions ── */}
        {activeSection === 'nav' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + ' mb-0'}>
                Sidebar Access & Sub-Functions
              </label>
              <span className="text-[11px] text-muted-foreground">
                {selectedKeys.length} of {NAV_ITEMS.length} modules selected
              </span>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              {NAV_GROUPS.map(group => {
                const items = NAV_ITEMS.filter(n => n.group === group);
                const allSelected = items.every(n => selectedKeys.includes(n.key));
                const someSelected = items.some(n => selectedKeys.includes(n.key));
                return (
                  <div key={group} className="border-b border-border last:border-b-0">
                    {/* Group header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary/40 hover:bg-secondary/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          allSelected ? 'bg-primary border-primary' : someSelected ? 'bg-primary/30 border-primary/60' : 'border-border'
                        }`}>
                          {allSelected && <Check size={10} className="text-white" />}
                          {someSelected && !allSelected && <div className="w-2 h-0.5 bg-primary rounded" />}
                        </div>
                        <span className="text-[12px] font-600 text-foreground uppercase tracking-wider">{group}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {items.filter(n => selectedKeys.includes(n.key)).length}/{items.length}
                      </span>
                    </button>

                    {/* Nav items with expandable sub-functions */}
                    <div className="divide-y divide-border">
                      {items.map(item => {
                        const isNavSelected = selectedKeys.includes(item.key);
                        const subFns = SUB_FUNCTIONS[item.key] || [];
                        const selectedFns = selectedSubFunctions[item.key] || [];
                        const isExpanded = expandedSubFunctions.has(item.key);

                        return (
                          <div key={item.key} className={`${isNavSelected ? 'bg-primary/5' : ''}`}>
                            {/* Nav item row */}
                            <div className="flex items-center gap-0 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                              <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isNavSelected ? 'bg-primary border-primary' : 'border-border'
                                }`}>
                                  {isNavSelected && <Check size={10} className="text-white" />}
                                </div>
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={isNavSelected}
                                  onChange={() => toggleKey(item.key)}
                                />
                                <span className="text-[13px] text-foreground">{item.label}</span>
                                {isNavSelected && selectedFns.length > 0 && (
                                  <span className="text-[10px] text-primary font-500 bg-primary/10 px-1.5 py-0.5 rounded-full">
                                    {selectedFns.length} sub-fn
                                  </span>
                                )}
                              </label>
                              {isNavSelected && subFns.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedSubFunctions(prev => {
                                    const s = new Set(prev);
                                    s.has(item.key) ? s.delete(item.key) : s.add(item.key);
                                    return s;
                                  })}
                                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-primary transition-colors rounded"
                                >
                                  <span>Sub-functions</span>
                                  {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                              )}
                            </div>

                            {/* Sub-functions panel */}
                            {isNavSelected && isExpanded && subFns.length > 0 && (
                              <div className="px-10 pb-3 pt-1 bg-primary/3 border-t border-primary/10">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">Sub-Functions</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleAllSubFunctions(item.key)}
                                    className="text-[11px] text-primary hover:underline"
                                  >
                                    {subFns.every(f => selectedFns.includes(f)) ? 'Deselect All' : 'Select All'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {subFns.map(fn => {
                                    const isFnSelected = selectedFns.includes(fn);
                                    return (
                                      <label key={fn} className="flex items-center gap-2 cursor-pointer hover:bg-primary/5 px-2 py-1.5 rounded-lg transition-colors">
                                        <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                          isFnSelected ? 'bg-primary border-primary' : 'border-border'
                                        }`}>
                                          {isFnSelected && <Check size={8} className="text-white" />}
                                        </div>
                                        <input type="checkbox" className="sr-only" checked={isFnSelected} onChange={() => toggleSubFunction(item.key, fn)} />
                                        <span className="text-[12px] text-foreground">{fn}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Dashboard Widgets ── */}
        {activeSection === 'widgets' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + ' mb-0'}>Dashboard Widgets</label>
              <button type="button" onClick={toggleAllWidgets} className="text-[11px] text-primary hover:underline">
                {DASHBOARD_WIDGETS.every(w => selectedWidgets.includes(w.key)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 divide-y divide-border">
                {DASHBOARD_WIDGETS.map(widget => {
                  const isSelected = selectedWidgets.includes(widget.key);
                  return (
                    <label
                      key={widget.key}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary/30 border-r border-border odd:border-r even:border-r-0 ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                      <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => toggleWidget(widget.key)} />
                      <div className="flex items-center gap-2">
                        <BarChart2 size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-[13px] text-foreground">{widget.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Select which dashboard widgets this role can view. Unselected widgets will be hidden for users with this role.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[12px] text-muted-foreground">
            Total: <strong className="text-foreground">{totalSelected}</strong> permissions selected
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {saving ? 'Saving...' : editRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Create / Edit Staff Modal ────────────────────────────────────────────────
function StaffModal({
  open, onClose, onSaved, editStaff,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editStaff: Staff | null;
}) {
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+971 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  // Reset password state (edit mode only)
  const [showResetSection, setShowResetSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'success' | 'created' | 'error'>('idle');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    if (open) {
      setFullName(editStaff?.full_name || '');
      setEmail(editStaff?.email || '');
      setPhone(editStaff?.phone || '+971 ');
      setPassword(editStaff ? '' : generatePassword());
      setShowPassword(false);
      setError('');
      setEmailStatus('idle');
      setShowResetSection(false);
      setNewPassword('');
      setShowNewPassword(false);
      setResetting(false);
      setResetStatus('idle');
      setResetError('');
    }
  }, [open, editStaff]);

  const handleResetPassword = async () => {
    if (!newPassword.trim()) { setResetError('Please enter a new password'); return; }
    if (newPassword.length < 8) { setResetError('Password must be at least 8 characters'); return; }
    setResetting(true);
    setResetError('');
    setResetStatus('idle');
    try {
      const res = await fetch('/api/staff/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editStaff!.email,
          newPassword,
          fullName: editStaff!.full_name,
          staffId: editStaff!.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Failed to reset password');
        setResetStatus('error');
      } else {
        setResetStatus(data.created ? 'created' : 'success');
        setNewPassword('');
      }
    } catch {
      setResetError('Network error. Please try again.');
      setResetStatus('error');
    } finally {
      setResetting(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { setError('Full name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!editStaff && !password.trim()) { setError('Password is required'); return; }
    setSaving(true);
    setError('');

    try {
      if (editStaff) {
        const { error: updErr } = await supabase
          .from('staff')
          .update({ full_name: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', editStaff.id);
        if (updErr) throw updErr;
      } else {
        // 1. Insert staff record first
        const { data: newStaff, error: insErr } = await supabase
          .from('staff')
          .insert({ full_name: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null })
          .select('id')
          .single();
        if (insErr) throw insErr;

        // 2. Create Supabase Auth user so the staff member can actually log in
        try {
          const authRes = await fetch('/api/staff/create-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              password,
              fullName: fullName.trim(),
              staffId: newStaff?.id,
            }),
          });
          if (!authRes.ok) {
            const authData = await authRes.json();
            // Non-fatal but surface the error so admin knows login won't work
            setError(`Staff record created, but login account setup failed: ${authData.error || 'Unknown error'}. Please use "Reset Password" on the staff record to retry.`);
            setSaving(false);
            onSaved();
            onClose();
            return;
          }
        } catch {
          console.warn('Auth user creation failed for staff member');
        }

        // 3. Send welcome email with credentials
        setEmailStatus('sending');
        try {
          const res = await fetch('/api/staff/send-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), fullName: fullName.trim(), password }),
          });
          setEmailStatus(res.ok ? 'sent' : 'failed');
        } catch {
          setEmailStatus('failed');
        }
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editStaff ? 'Edit Staff Member' : 'Add Staff Member'} subtitle="Create a staff account to assign projects and roles" size="md">
      <div className="p-5 space-y-4">
        {error && <ErrorBanner msg={error} />}
        {emailStatus === 'failed' && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-[12px] text-yellow-700">
            <AlertCircle size={13} className="shrink-0" />
            Staff saved but welcome email could not be sent. Please share credentials manually.
          </div>
        )}
        <div>
          <label className={labelCls}>Full Name *</label>
          <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Ahmed Al Rashid" />
        </div>
        <div>
          <label className={labelCls}>Email Address *</label>
          <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@company.com" />
        </div>
        <div>
          <label className={labelCls}>Mobile Number</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>
        {!editStaff && (
          <div>
            <label className={labelCls}>
              Password *
              <span className="ml-2 text-[11px] text-muted-foreground font-400">(auto-generated — will be emailed to staff)</span>
            </label>
            <div className="relative">
              <input
                className={inputCls}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Auto-generated password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="mt-1.5 text-[11px] text-primary hover:underline"
            >
              Regenerate password
            </button>
          </div>
        )}

        {/* ── Reset Password Section (edit mode only) ── */}
        {editStaff && (
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => { setShowResetSection(v => !v); setResetStatus('idle'); setResetError(''); setNewPassword(''); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-secondary/40 hover:bg-secondary/70 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={13} className="text-primary" />
                <span className="text-[13px] font-500 text-foreground">Reset Password</span>
              </div>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showResetSection ? 'rotate-180' : ''}`} />
            </button>
            {showResetSection && (
              <div className="p-4 space-y-3 border-t border-border bg-background">
                {(resetStatus === 'success' || resetStatus === 'created') && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-700">
                    <Check size={13} className="shrink-0" />
                    {resetStatus === 'created' ?'Login account created successfully. The staff member can now log in with the new password.' :'Password has been reset successfully. Share the new password with the staff member.'}
                  </div>
                )}
                {resetStatus === 'error' && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">
                    <AlertCircle size={13} className="shrink-0" />
                    {resetError}
                  </div>
                )}
                <div>
                  <label className={labelCls}>New Password</label>
                  <div className="relative">
                    <input
                      className={inputCls}
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setResetStatus('idle'); setResetError(''); }}
                      placeholder="Enter new password (min. 8 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setNewPassword(generatePassword()); setShowNewPassword(true); setResetStatus('idle'); }}
                    className="mt-1.5 text-[11px] text-primary hover:underline"
                  >
                    Generate random password
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetting || !newPassword.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
                >
                  <RefreshCw size={12} />
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim() || !email.trim()}
            className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
          >
            {saving ? (emailStatus === 'sending' ? 'Sending email...' : 'Saving...') : editStaff ? 'Update Staff' : 'Add Staff & Send Credentials'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Assign Project + Role to Staff Modal ─────────────────────────────────────
function AssignModal({
  open, onClose, onSaved, staff, projects, roles, existingAssignments,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  staff: Staff[];
  projects: Project[];
  roles: Role[];
  existingAssignments: StaffRoleAssignment[];
}) {
  const supabase = createClient();
  const [staffId, setStaffId] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [roleId, setRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) { setStaffId(''); setSelectedProjectIds([]); setRoleId(''); setError(''); }
  }, [open]);

  const toggleProject = (id: string) =>
    setSelectedProjectIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!staffId) { setError('Select a staff member'); return; }
    if (selectedProjectIds.length === 0) { setError('Select at least one project'); return; }
    if (!roleId) { setError('Select a role'); return; }

    const newAssignments = selectedProjectIds.filter(pid =>
      !existingAssignments.find(a => a.staff_id === staffId && a.project_id === pid && a.role_id === roleId)
    );

    if (newAssignments.length === 0) { setError('All selected assignments already exist'); return; }

    setSaving(true);
    setError('');
    const { error: insErr } = await supabase
      .from('staff_role_assignments')
      .insert(newAssignments.map(pid => ({ staff_id: staffId, project_id: pid, role_id: roleId })));
    setSaving(false);
    if (insErr) { setError(insErr.message); return; }
    onSaved();
    onClose();
  };

  const selectedStaff = staff.find(s => s.id === staffId);

  return (
    <Modal open={open} onClose={onClose} title="Assign Projects & Role to Staff" subtitle="A staff member can be assigned to multiple projects with a role" size="md">
      <div className="p-5 space-y-4">
        {error && <ErrorBanner msg={error} />}
        <div>
          <label className={labelCls}>Staff Member *</label>
          <select className={inputCls} value={staffId} onChange={e => setStaffId(e.target.value)}>
            <option value="">Select staff member...</option>
            {staff.filter(s => s.is_active).map(s => (
              <option key={s.id} value={s.id}>{s.full_name} — {s.email}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            Projects *
            <span className="ml-2 text-[11px] text-muted-foreground font-400">
              {selectedProjectIds.length} selected — select one or more
            </span>
          </label>
          <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {projects.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-muted-foreground italic">No projects available</p>
            ) : (
              projects.map(p => {
                const alreadyAssigned = staffId
                  ? existingAssignments.some(a => a.staff_id === staffId && a.project_id === p.id && a.role_id === roleId)
                  : false;
                const isSelected = selectedProjectIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-secondary/30 ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>
                    <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => toggleProject(p.id)} />
                    <span className="text-[13px] text-foreground flex-1">{p.name}</span>
                    {alreadyAssigned && roleId && (
                      <span className="text-[10px] text-muted-foreground italic">already assigned</span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Role *</label>
          <select className={inputCls} value={roleId} onChange={e => setRoleId(e.target.value)}>
            <option value="">Select role...</option>
            {roles.filter(r => r.is_active).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {selectedStaff && selectedProjectIds.length > 0 && roleId && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-[12px] text-primary">
            Assigning <strong>{selectedStaff.full_name}</strong> to <strong>{selectedProjectIds.length}</strong> project(s) as <strong>{roles.find(r => r.id === roleId)?.name}</strong>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !staffId || selectedProjectIds.length === 0 || !roleId}
            className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
          >
            {saving ? 'Assigning...' : `Assign to ${selectedProjectIds.length || ''} Project${selectedProjectIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Landlord Assignment Modal ────────────────────────────────────────────────
function LandlordAssignModal({
  open, onClose, onSaved, persons, projects,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  persons: Person[];
  projects: Project[];
}) {
  const supabase = createClient();

  const [hierarchyLevel, setHierarchyLevel] = useState<'project' | 'building' | 'floor' | 'unit'>('project');
  const [selProjectId, setSelProjectId] = useState('');
  const [selBuildingId, setSelBuildingId] = useState('');
  const [selFloorId, setSelFloorId] = useState('');
  const [selUnitId, setSelUnitId] = useState('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Main landlord — use searchable select
  const [mainPersonId, setMainPersonId] = useState('');
  const [mainOwnership, setMainOwnership] = useState<string>('100');
  const [mainSearch, setMainSearch] = useState('');
  const [showMainDropdown, setShowMainDropdown] = useState(false);

  // Co-landlords list
  interface CoLandlordEntry { id: string; personId: string; ownership: string; search: string; showDropdown: boolean; }
  const [coLandlords, setCoLandlords] = useState<CoLandlordEntry[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const newCoEntry = (): CoLandlordEntry => ({ id: Math.random().toString(36).slice(2), personId: '', ownership: '0', search: '', showDropdown: false });

  useEffect(() => {
    if (!open) {
      setHierarchyLevel('project'); setSelProjectId(''); setSelBuildingId('');
      setSelFloorId(''); setSelUnitId('');
      setMainPersonId(''); setMainOwnership('100');
      setMainSearch(''); setShowMainDropdown(false);
      setCoLandlords([]); setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!selProjectId) { setBuildings([]); setFloors([]); setUnits([]); return; }
    supabase.from('buildings').select('id, name, project_id').eq('project_id', selProjectId).order('name')
      .then(({ data }) => setBuildings(data || []));
    setSelBuildingId(''); setSelFloorId(''); setSelUnitId('');
  }, [selProjectId]);

  useEffect(() => {
    if (!selBuildingId) { setFloors([]); setUnits([]); return; }
    supabase.from('floors').select('id, name, building_id').eq('building_id', selBuildingId).order('name')
      .then(({ data }) => setFloors(data || []));
    setSelFloorId(''); setSelUnitId('');
  }, [selBuildingId]);

  useEffect(() => {
    if (!selFloorId) { setUnits([]); return; }
    supabase.from('units').select('id, unit_number, unit_name, floor_id').eq('floor_id', selFloorId).order('unit_number')
      .then(({ data }) => setUnits(data || []));
    setSelUnitId('');
  }, [selFloorId]);

  const totalCoOwnership = coLandlords.reduce((sum, c) => sum + (parseFloat(c.ownership) || 0), 0);
  const totalOwnership = (parseFloat(mainOwnership) || 0) + totalCoOwnership;
  const ownershipValid = totalOwnership <= 100;

  const updateCoLandlord = (id: string, field: keyof CoLandlordEntry, value: string | boolean) => {
    setCoLandlords(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCoLandlord = (id: string) => {
    setCoLandlords(prev => prev.filter(c => c.id !== id));
  };

  const getHierarchyPayload = () => {
    if (hierarchyLevel === 'project') return selProjectId ? { project_id: selProjectId } : null;
    if (hierarchyLevel === 'building') return selBuildingId ? { building_id: selBuildingId } : null;
    if (hierarchyLevel === 'floor') return selFloorId ? { floor_id: selFloorId } : null;
    if (hierarchyLevel === 'unit') return selUnitId ? { unit_id: selUnitId } : null;
    return null;
  };

  const handleSave = async () => {
    if (!mainPersonId) { setError('Select the main landlord'); return; }
    const mainPct = parseFloat(mainOwnership);
    if (isNaN(mainPct) || mainPct < 0 || mainPct > 100) { setError('Main landlord ownership must be 0–100'); return; }

    for (const co of coLandlords) {
      if (!co.personId) { setError('Select a person for each co-landlord'); return; }
      const pct = parseFloat(co.ownership);
      if (isNaN(pct) || pct < 0 || pct > 100) { setError('Each co-landlord ownership must be 0–100'); return; }
    }

    if (!ownershipValid) { setError(`Total ownership is ${totalOwnership.toFixed(2)}% — cannot exceed 100%`); return; }

    const hierarchyPayload = getHierarchyPayload();
    if (!hierarchyPayload) { setError(`Select a ${hierarchyLevel}`); return; }

    const allPersonIds = [mainPersonId, ...coLandlords.map(c => c.personId)];
    if (new Set(allPersonIds).size !== allPersonIds.length) { setError('The same person cannot appear more than once'); return; }

    setSaving(true);
    setError('');

    const records = [
      { person_id: mainPersonId, landlord_type: 'landlord' as const, ownership_pct: mainPct, ...hierarchyPayload },
      ...coLandlords.map(co => ({
        person_id: co.personId,
        landlord_type: 'joint_landlord' as const,
        ownership_pct: parseFloat(co.ownership) || 0,
        ...hierarchyPayload,
      })),
    ];

    const { error: insErr } = await supabase.from('project_landlord_assignments').insert(records);
    setSaving(false);
    if (insErr) { setError(insErr.message); return; }
    onSaved();
    onClose();
  };

  const levelIcons: Record<string, React.ReactNode> = {
    project: <Home size={13} />,
    building: <Building2 size={13} />,
    floor: <Layers size={13} />,
    unit: <DoorOpen size={13} />,
  };

  // context: inside LandlordAssignModal, hierarchy level buttons
  {(['project', 'building', 'floor', 'unit'] as const).map(level => (
      <button key={level} type="button" onClick={() => setHierarchyLevel(level)}
        className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border text-[12px] font-500 transition-all ${
          hierarchyLevel === level
            ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'
        }`}
      >
        {levelIcons[level]}
        <span className="capitalize">{level}</span>
      </button>
    ))}

  // All selected person IDs (to show as "already chosen" in dropdowns)
  const allSelectedPersonIds = [mainPersonId, ...coLandlords.map(c => c.personId)].filter(Boolean);

  // Searchable person picker component
  const PersonPicker = ({
    value,
    search,
    showDropdown,
    onSearchChange,
    onToggleDropdown,
    onSelect,
    excludeIds,
    label,
    colorClass,
  }: {
    value: string;
    search: string;
    showDropdown: boolean;
    onSearchChange: (v: string) => void;
    onToggleDropdown: (v: boolean) => void;
    onSelect: (id: string) => void;
    excludeIds: string[];
    label: string;
    colorClass: string;
  }) => {
    const selectedPerson = persons.find(p => p.id === value);
    const filteredPersons = persons.filter(p =>
      !excludeIds.includes(p.id) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(search.toLowerCase()))
    );

    return (
      <div className="relative">
        <div
          className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg cursor-pointer transition-all ${showDropdown ? 'border-primary ring-2 ring-primary/15' : 'border-border hover:border-primary/50'} bg-background`}
          onClick={() => onToggleDropdown(!showDropdown)}
        >
          {selectedPerson ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-6 h-6 rounded-full ${colorClass} flex items-center justify-center text-[10px] font-700 shrink-0`}>
                {selectedPerson.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-500 text-foreground truncate">{selectedPerson.name}</p>
                {selectedPerson.email && <p className="text-[11px] text-muted-foreground truncate">{selectedPerson.email}</p>}
              </div>
              <Check size={14} className="text-green-600 shrink-0 ml-auto" />
            </div>
          ) : (
            <span className="text-[13px] text-muted-foreground flex-1">{label}</span>
          )}
          <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </div>

        {showDropdown && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-7 pr-3 py-1.5 text-[12px] bg-background border border-border rounded-lg outline-none focus:border-primary"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredPersons.length === 0 ? (
                <p className="px-4 py-3 text-[12px] text-muted-foreground italic">No persons found</p>
              ) : (
                filteredPersons.map(p => {
                  const isCurrentlySelected = p.id === value;
                  const isAlreadyUsed = allSelectedPersonIds.includes(p.id) && !isCurrentlySelected;
                  return (
                    <div
                      key={p.id}
                      onClick={() => { if (!isAlreadyUsed) { onSelect(p.id); onToggleDropdown(false); onSearchChange(''); } }}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        isAlreadyUsed
                          ? 'opacity-40 cursor-not-allowed bg-secondary/20'
                          : isCurrentlySelected
                          ? 'bg-primary/10 cursor-pointer' :'hover:bg-secondary/40 cursor-pointer'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full ${colorClass} flex items-center justify-center text-[11px] font-700 shrink-0`}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-500 text-foreground truncate">{p.name}</p>
                        {p.email && <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>}
                      </div>
                      {isCurrentlySelected && <Check size={14} className="text-primary shrink-0" />}
                      {isAlreadyUsed && <span className="text-[10px] text-muted-foreground italic shrink-0">already selected</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign Landlord & Co-Landlords" subtitle="Define ownership for a project hierarchy level — total must not exceed 100%" size="lg">
      <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto" onClick={() => { setShowMainDropdown(false); setCoLandlords(prev => prev.map(c => ({ ...c, showDropdown: false }))); }}>
        {error && <ErrorBanner msg={error} />}

        {/* Hierarchy Level */}
        <div>
          <label className={labelCls}>Assign at Hierarchy Level *</label>
          <div className="grid grid-cols-4 gap-2">
            {(['project', 'building', 'floor', 'unit'] as const).map(level => (
              <button key={level} type="button" onClick={() => setHierarchyLevel(level)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border text-[12px] font-500 transition-all ${
                  hierarchyLevel === level
                    ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'
                }`}
              >
                {levelIcons[level]}
                <span className="capitalize">{level}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Project selector */}
        <div>
          <label className={labelCls}>Project *</label>
          <select className={inputCls} value={selProjectId} onChange={e => setSelProjectId(e.target.value)}>
            <option value="">Select project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {(hierarchyLevel === 'building' || hierarchyLevel === 'floor' || hierarchyLevel === 'unit') && (
          <div>
            <label className={labelCls}>Building *</label>
            <select className={inputCls} value={selBuildingId} onChange={e => setSelBuildingId(e.target.value)} disabled={!selProjectId}>
              <option value="">Select building...</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        {(hierarchyLevel === 'floor' || hierarchyLevel === 'unit') && (
          <div>
            <label className={labelCls}>Floor *</label>
            <select className={inputCls} value={selFloorId} onChange={e => setSelFloorId(e.target.value)} disabled={!selBuildingId}>
              <option value="">Select floor...</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
        {hierarchyLevel === 'unit' && (
          <div>
            <label className={labelCls}>Unit *</label>
            <select className={inputCls} value={selUnitId} onChange={e => setSelUnitId(e.target.value)} disabled={!selFloorId}>
              <option value="">Select unit...</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unit_name || u.unit_number}</option>)}
            </select>
          </div>
        )}

        <hr className="border-border" />

        {/* Ownership Summary Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}>Ownership Allocation</label>
            <span className={`text-[12px] font-600 px-2.5 py-0.5 rounded-full ${
              totalOwnership > 100 ? 'bg-destructive/15 text-destructive' :
              totalOwnership === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {totalOwnership.toFixed(1)}% / 100%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${totalOwnership > 100 ? 'bg-destructive' : totalOwnership === 100 ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(totalOwnership, 100)}%` }}
            />
          </div>
        </div>

        {/* Main Landlord */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
              <Home size={12} className="text-white" />
            </div>
            <span className="text-[13px] font-600 text-amber-800">Main Landlord</span>
          </div>
          <div className="grid grid-cols-3 gap-3" onClick={e => e.stopPropagation()}>
            <div className="col-span-2">
              <label className={labelCls}>Person *</label>
              <PersonPicker
                value={mainPersonId}
                search={mainSearch}
                showDropdown={showMainDropdown}
                onSearchChange={setMainSearch}
                onToggleDropdown={v => { setShowMainDropdown(v); setCoLandlords(prev => prev.map(c => ({ ...c, showDropdown: false }))); }}
                onSelect={setMainPersonId}
                excludeIds={coLandlords.map(c => c.personId).filter(Boolean)}
                label="Select main landlord..."
                colorClass="bg-amber-200 text-amber-800"
              />
            </div>
            <div>
              <label className={labelCls}>Ownership %</label>
              <input type="number" min={0} max={100} step={0.01} className={inputCls}
                value={mainOwnership} onChange={e => setMainOwnership(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Co-Landlords */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`${labelCls} mb-0`}>Co-Landlords <span className="text-[11px] text-muted-foreground font-400">(optional)</span></label>
            <button type="button"
              onClick={() => setCoLandlords(prev => [...prev, newCoEntry()])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
              <Plus size={12} /> Add Co-Landlord
            </button>
          </div>

          {coLandlords.length === 0 && (
            <p className="text-[12px] text-muted-foreground italic py-2">No co-landlords added. Click "Add Co-Landlord" to add joint ownership.</p>
          )}

          {coLandlords.map((co, idx) => (
            <div key={co.id} className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-[10px] font-700">{idx + 1}</span>
                </div>
                <span className="text-[12px] font-600 text-purple-800">Co-Landlord {idx + 1}</span>
              </div>
              <div className="grid grid-cols-3 gap-3" onClick={e => e.stopPropagation()}>
                <div className="col-span-2">
                  <label className={labelCls}>Person *</label>
                  <PersonPicker
                    value={co.personId}
                    search={co.search}
                    showDropdown={co.showDropdown}
                    onSearchChange={v => updateCoLandlord(co.id, 'search', v)}
                    onToggleDropdown={v => {
                      setShowMainDropdown(false);
                      setCoLandlords(prev => prev.map(c => ({ ...c, showDropdown: c.id === co.id ? v : false })));
                    }}
                    onSelect={v => updateCoLandlord(co.id, 'personId', v)}
                    excludeIds={[mainPersonId, ...coLandlords.filter(c => c.id !== co.id).map(c => c.personId)].filter(Boolean)}
                    label="Select co-landlord..."
                    colorClass="bg-purple-200 text-purple-800"
                  />
                </div>
                <div>
                  <label className={labelCls}>Ownership %</label>
                  <input type="number" min={0} max={100} step={0.01} className={inputCls}
                    value={co.ownership} onChange={e => updateCoLandlord(co.id, 'ownership', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {!ownershipValid && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">
            <AlertCircle size={13} className="shrink-0" />
            Total ownership ({totalOwnership.toFixed(2)}%) exceeds 100%. Please adjust the percentages.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !ownershipValid}
            className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? 'Saving...' : `Save ${1 + coLandlords.length} Landlord${coLandlords.length > 0 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectAssignmentClient() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('roles');

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<StaffRoleAssignment[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [landlordAssignments, setLandlordAssignments] = useState<LandlordAssignment[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLandlordModal, setShowLandlordModal] = useState(false);

  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());

  // Inline project management per staff member
  const [managingProjectsFor, setManagingProjectsFor] = useState<string | null>(null);
  const [projectMgmtRole, setProjectMgmtRole] = useState('');
  const [projectMgmtSelected, setProjectMgmtSelected] = useState<string[]>([]);
  const [projectMgmtSaving, setProjectMgmtSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    const [rolesRes, permsRes, staffRes, projectsRes, assignRes, personsRes, landlordRes, buildingsRes, floorsRes, unitsRes] = await Promise.all([
      supabase.from('roles').select('*').order('name'),
      supabase.from('role_permissions').select('*'),
      supabase.from('staff').select('*').order('full_name'),
      supabase.from('projects').select('id, name, status').order('name'),
      supabase.from('staff_role_assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('persons').select('id, name, email').order('name'),
      supabase.from('project_landlord_assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('buildings').select('id, name, project_id').order('name'),
      supabase.from('floors').select('id, name, building_id').order('name'),
      supabase.from('units').select('id, unit_number, unit_name, floor_id').order('unit_number'),
    ]);

    const err = rolesRes.error || permsRes.error || staffRes.error || projectsRes.error || assignRes.error;
    if (err) setFetchError(err.message);

    setRoles(rolesRes.data || []);
    setPermissions(permsRes.data || []);
    setStaff(staffRes.data || []);
    setProjects(projectsRes.data || []);
    setAssignments(assignRes.data || []);
    setPersons(personsRes.data || []);
    setLandlordAssignments(landlordRes.data || []);
    setBuildings(buildingsRes.data || []);
    setFloors(floorsRes.data || []);
    setUnits(unitsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Delete this role? All staff assignments using this role will also be removed.')) return;
    await supabase.from('roles').delete().eq('id', id);
    fetchAll();
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Remove this staff member? All their assignments will also be removed.')) return;
    await supabase.from('staff').delete().eq('id', id);
    fetchAll();
  };

  const handleRevokeAssignment = async (id: string) => {
    if (!confirm('Revoke this assignment?')) return;
    await supabase.from('staff_role_assignments').delete().eq('id', id);
    fetchAll();
  };

  const handleDeleteLandlord = async (id: string) => {
    if (!confirm('Remove this landlord assignment?')) return;
    await supabase.from('project_landlord_assignments').delete().eq('id', id);
    fetchAll();
  };

  const toggleExpandRole = (id: string) =>
    setExpandedRoles(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleExpandStaff = (id: string) =>
    setExpandedStaff(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const getRoleById = (id: string) => roles.find(r => r.id === id);
  const getProjectById = (id: string) => projects.find(p => p.id === id);
  const getStaffById = (id: string) => staff.find(s => s.id === id);
  const getPersonById = (id: string) => persons.find(p => p.id === id);
  const getBuildingById = (id: string) => buildings.find(b => b.id === id);
  const getFloorById = (id: string) => floors.find(f => f.id === id);
  const getUnitById = (id: string) => units.find(u => u.id === id);

  const getLandlordHierarchyLabel = (a: LandlordAssignment) => {
    if (a.project_id) return `Project: ${getProjectById(a.project_id)?.name || '—'}`;
    if (a.building_id) return `Building: ${getBuildingById(a.building_id)?.name || '—'}`;
    if (a.floor_id) return `Floor: ${getFloorById(a.floor_id)?.name || '—'}`;
    if (a.unit_id) { const u = getUnitById(a.unit_id); return `Unit: ${u?.unit_name || u?.unit_number || '—'}`; }
    return '—';
  };

  // Open inline project manager for a staff member
  const openProjectManager = (memberId: string) => {
    const memberAssignments = assignments.filter(a => a.staff_id === memberId);
    // Pre-select current projects (use first role found)
    const currentProjectIds = [...new Set(memberAssignments.map(a => a.project_id))];
    const firstRoleId = memberAssignments[0]?.role_id || '';
    setManagingProjectsFor(memberId);
    setProjectMgmtSelected(currentProjectIds);
    setProjectMgmtRole(firstRoleId);
  };

  const saveProjectAssignments = async (memberId: string) => {
    if (!projectMgmtRole) return;
    setProjectMgmtSaving(true);

    // Remove all existing assignments for this staff member
    await supabase.from('staff_role_assignments').delete().eq('staff_id', memberId);

    // Re-insert selected projects with chosen role
    if (projectMgmtSelected.length > 0) {
      await supabase.from('staff_role_assignments').insert(
        projectMgmtSelected.map(pid => ({ staff_id: memberId, project_id: pid, role_id: projectMgmtRole }))
      );
    }

    setProjectMgmtSaving(false);
    setManagingProjectsFor(null);
    fetchAll();
  };

  const filteredRoles = roles.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const filteredStaff = staff.filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredAssignments = assignments.filter(a => {
    if (!search) return true;
    const s = getStaffById(a.staff_id);
    const p = getProjectById(a.project_id);
    const r = getRoleById(a.role_id);
    return s?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p?.name.toLowerCase().includes(search.toLowerCase()) ||
      r?.name.toLowerCase().includes(search.toLowerCase());
  });
  const filteredLandlords = landlordAssignments.filter(a => {
    if (!search) return true;
    const p = getPersonById(a.person_id);
    return p?.name.toLowerCase().includes(search.toLowerCase()) ||
      getLandlordHierarchyLabel(a).toLowerCase().includes(search.toLowerCase());
  });

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'roles',       label: 'Roles & Responsibilities', icon: <Shield size={15} />,    count: roles.length },
    { id: 'staff',       label: 'Staff',                    icon: <Users size={15} />,     count: staff.length },
    { id: 'assignments', label: 'Project Assignments',      icon: <UserCheck size={15} />, count: assignments.length },
    { id: 'landlords',   label: 'Landlord Assignments',     icon: <Home size={15} />,      count: landlordAssignments.length },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.staff_page_title}</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
            {t.staff_page_subtitle}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {activeTab === 'roles' && (
            <button onClick={() => { setEditRole(null); setShowRoleModal(true); }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
              <Plus size={14} /> <span className="hidden sm:inline">New Role</span><span className="sm:hidden">New</span>
            </button>
          )}
          {activeTab === 'staff' && (
            <button onClick={() => { setEditStaff(null); setShowStaffModal(true); }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
              <Plus size={14} /> <span className="hidden sm:inline">Add Staff</span><span className="sm:hidden">Add</span>
            </button>
          )}
          {activeTab === 'assignments' && (
            <button onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
              <Plus size={14} /> <span className="hidden sm:inline">Assign</span><span className="sm:hidden">Assign</span>
            </button>
          )}
          {activeTab === 'landlords' && (
            <button onClick={() => setShowLandlordModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
              <Plus size={14} /> <span className="hidden sm:inline">Assign Landlord</span><span className="sm:hidden">Assign</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: 'Roles',       value: roles.length,       sub: 'defined roles' },
          { label: 'Staff',       value: staff.filter(s => s.is_active).length, sub: 'active members' },
          { label: 'Assignments', value: assignments.length, sub: 'project-role grants' },
          { label: 'Landlords',   value: landlordAssignments.length, sub: 'ownership records' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-border shadow-card px-4 sm:px-5 py-3 sm:py-4">
            <p className="text-[10px] sm:text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className="text-[22px] sm:text-[28px] font-700 text-foreground mt-1 tabular-nums">{stat.value}</p>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {fetchError && <ErrorBanner msg={fetchError} onRetry={fetchAll} />}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); }}
              className={`flex items-center gap-2 px-5 py-3.5 text-[13px] sm:text-[15px] font-500 transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {tab.icon} {tab.label}
              <span className={`ml-1 text-[11px] sm:text-[12px] font-600 px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
              }`}>{tab.count}</span>
            </button>
          ))}
          <div className="flex-1 flex items-center justify-end px-4 gap-2">
            <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
        </div>

        {/* ── TAB: ROLES ── */}
        {activeTab === 'roles' && (
          <div className="p-5">
            {loading ? <LoadingSkeleton rows={4} /> : filteredRoles.length === 0 ? (
              <EmptyState icon={Shield} title="No roles yet" description="Create roles and assign sidebar responsibilities to them"
                action={{ label: 'Create Role', onClick: () => { setEditRole(null); setShowRoleModal(true); } }} />
            ) : (
              <div className="space-y-3">
                {filteredRoles.map(role => {
                  const rolePerms = permissions.filter(p => p.role_id === role.id);
                  const navPerms = rolePerms.filter(p => p.nav_key.startsWith('nav-'));
                  const widgetPerms = rolePerms.filter(p => p.nav_key.startsWith('widget-'));
                  const subFnPerms = rolePerms.filter(p => p.nav_key.startsWith('subfn-'));
                  const isExpanded = expandedRoles.has(role.id);
                  const assignedCount = assignments.filter(a => a.role_id === role.id).length;
                  return (
                    <div key={role.id} className="border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-600 text-foreground">{role.name}</p>
                            <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${role.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {role.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {role.description && <p className="text-[12px] text-muted-foreground mt-0.5">{role.description}</p>}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[11px] text-muted-foreground">{navPerms.length} modules</span>
                            {subFnPerms.length > 0 && <><span className="text-[11px] text-muted-foreground">·</span><span className="text-[11px] text-muted-foreground">{subFnPerms.length} sub-functions</span></>}
                            {widgetPerms.length > 0 && <><span className="text-[11px] text-muted-foreground">·</span><span className="text-[11px] text-muted-foreground">{widgetPerms.length} widgets</span></>}
                            <span className="text-[11px] text-muted-foreground">·</span>
                            <span className="text-[11px] text-muted-foreground">{assignedCount} assignment{assignedCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => { setEditRole(role); setShowRoleModal(true); }}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Edit role">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteRole(role.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" title="Delete role">
                            <Trash2 size={14} />
                          </button>
                          <button onClick={() => toggleExpandRole(role.id)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-4 py-3 border-t border-border space-y-3">
                          {navPerms.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground italic">No responsibilities assigned to this role.</p>
                          ) : (
                            <div>
                              <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-2">Sidebar Access</p>
                              <div className="flex flex-wrap gap-1">
                                {NAV_GROUPS.map(group => {
                                  const groupItems = NAV_ITEMS.filter(n => n.group === group && navPerms.some(p => p.nav_key === n.key));
                                  if (groupItems.length === 0) return null;
                                  return (
                                    <div key={group} className="flex flex-wrap gap-1">
                                      {groupItems.map(item => (
                                        <span key={item.key} className="px-2 py-0.5 text-[11px] font-500 bg-primary/10 text-primary rounded-md border border-primary/20">
                                          {item.label}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {widgetPerms.length > 0 && (
                            <div>
                              <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-2">Dashboard Widgets</p>
                              <div className="flex flex-wrap gap-1.5">
                                {widgetPerms.map(p => {
                                  const widget = DASHBOARD_WIDGETS.find(w => w.key === p.nav_key);
                                  return widget ? (
                                    <span key={p.id} className="px-2 py-0.5 text-[11px] font-500 bg-blue-100 text-blue-700 rounded-md border border-blue-200">
                                      {widget.label}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: STAFF ── */}
        {activeTab === 'staff' && (
          <div className="p-5">
            {loading ? <LoadingSkeleton rows={4} /> : filteredStaff.length === 0 ? (
              <EmptyState icon={Users} title="No staff members yet" description="Add staff members and then assign them to projects with roles"
                action={{ label: 'Add Staff', onClick: () => { setEditStaff(null); setShowStaffModal(true); } }} />
            ) : (
              <div className="space-y-3">
                {filteredStaff.map(member => {
                  const memberAssignments = assignments.filter(a => a.staff_id === member.id);
                  const isExpanded = expandedStaff.has(member.id);
                  // Get unique roles assigned to this staff member
                  const uniqueRoleIds = [...new Set(memberAssignments.map(a => a.role_id))];
                  const isManaging = managingProjectsFor === member.id;

                  return (
                    <div key={member.id} className="border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[13px] font-600 shrink-0">
                          {member.full_name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[14px] font-600 text-foreground">{member.full_name}</p>
                            <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {member.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {/* Show assigned roles as badges */}
                            {uniqueRoleIds.map(rid => {
                              const role = getRoleById(rid);
                              return role ? (
                                <span key={rid} className="px-2 py-0.5 text-[10px] font-600 bg-blue-100 text-blue-700 rounded-full">
                                  {role.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                          <p className="text-[12px] text-muted-foreground">{member.email}{member.phone ? ` · ${member.phone}` : ''}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {memberAssignments.length} project assignment{memberAssignments.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              if (isManaging) { setManagingProjectsFor(null); }
                              else { openProjectManager(member.id); setExpandedStaff(prev => { const s = new Set(prev); s.add(member.id); return s; }); }
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] sm:text-[13px] font-500 rounded-lg transition-all ${
                              isManaging ? 'bg-primary/10 text-primary border border-primary/30' : 'text-muted-foreground border border-border hover:bg-secondary'
                            }`}
                            title="Manage project assignments"
                          >
                            <Edit2 size={12} /> Projects
                          </button>
                          <button onClick={() => { setEditStaff(member); setShowStaffModal(true); }}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Edit staff">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteStaff(member.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" title="Remove staff">
                            <Trash2 size={14} />
                          </button>
                          <button onClick={() => toggleExpandStaff(member.id)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 py-3 border-t border-border space-y-3">
                          {/* Inline project manager */}
                          {isManaging && (
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[13px] font-600 text-foreground">Manage Project Assignments</p>
                                <button onClick={() => setManagingProjectsFor(null)} className="p-1 text-muted-foreground hover:text-foreground rounded"><X size={14} /></button>
                              </div>
                              <div>
                                <label className={labelCls}>Role for all selected projects *</label>
                                <select className={inputCls} value={projectMgmtRole} onChange={e => setProjectMgmtRole(e.target.value)}>
                                  <option value="">Select role...</option>
                                  {roles.filter(r => r.is_active).map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className={labelCls}>
                                  Projects
                                  <span className="ml-2 text-[11px] text-muted-foreground font-400">{projectMgmtSelected.length} selected</span>
                                </label>
                                <div className="border border-border rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                                  {projects.map(p => {
                                    const isSel = projectMgmtSelected.includes(p.id);
                                    return (
                                      <label key={p.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-secondary/30 ${isSel ? 'bg-primary/5' : ''}`}>
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSel ? 'bg-primary border-primary' : 'border-border'}`}>
                                          {isSel && <Check size={10} className="text-white" />}
                                        </div>
                                        <input type="checkbox" className="sr-only" checked={isSel}
                                          onChange={() => setProjectMgmtSelected(prev => isSel ? prev.filter(id => id !== p.id) : [...prev, p.id])} />
                                        <span className="text-[13px] text-foreground">{p.name}</span>
                                        <span className={`text-[10px] font-500 px-1.5 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setManagingProjectsFor(null)} className="px-3 py-2 text-[12px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
                                <button
                                  onClick={() => saveProjectAssignments(member.id)}
                                  disabled={projectMgmtSaving || !projectMgmtRole}
                                  className="px-4 py-2 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
                                  {projectMgmtSaving ? 'Saving...' : 'Save Assignments'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Current assignments summary */}
                          {memberAssignments.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground italic py-2">No project assignments yet. Click "Projects" to assign.</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">Current Assignments</p>
                              {memberAssignments.map(a => {
                                const project = getProjectById(a.project_id);
                                const role = getRoleById(a.role_id);
                                return (
                                  <div key={a.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13px] font-600 text-foreground">{project?.name || '—'}</span>
                                        <span className="text-muted-foreground">·</span>
                                        <span className="px-2 py-0.5 text-[11px] font-600 bg-blue-100 text-blue-700 rounded-full">{role?.name || '—'}</span>
                                      </div>
                                    </div>
                                    <button onClick={() => handleRevokeAssignment(a.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-all">
                                      <Trash2 size={12} /> Revoke
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ASSIGNMENTS ── */}
        {activeTab === 'assignments' && (
          <div>
            {loading ? (
              <div className="p-6"><LoadingSkeleton rows={5} /></div>
            ) : filteredAssignments.length === 0 ? (
              <EmptyState icon={UserCheck} title="No assignments yet"
                description={assignments.length === 0 ? 'Assign staff to projects with roles to grant access' : 'No results match your search'}
                action={assignments.length === 0 ? { label: 'Create Assignment', onClick: () => setShowAssignModal(true) } : undefined} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[700px]">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {['Staff Member', 'Project', 'Role', 'Assigned On', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAssignments.map(a => {
                      const member = getStaffById(a.staff_id);
                      const project = getProjectById(a.project_id);
                      const role = getRoleById(a.role_id);
                      return (
                        <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-600 shrink-0">
                                {(member?.full_name || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-500">{member?.full_name || '—'}</p>
                                <p className="text-[11px] text-muted-foreground">{member?.email || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-500">{project?.name || '—'}</p>
                            <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full ${project?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {project?.status || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-[11px] font-600 bg-blue-100 text-blue-700 rounded-full">{role?.name || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">
                            {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleRevokeAssignment(a.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-all">
                              <Trash2 size={12} /> Revoke
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: LANDLORDS ── */}
        {activeTab === 'landlords' && (
          <div>
            {loading ? (
              <div className="p-6"><LoadingSkeleton rows={5} /></div>
            ) : filteredLandlords.length === 0 ? (
              <EmptyState icon={Home} title="No landlord assignments yet"
                description="Assign persons as landlords or joint landlords to projects, buildings, floors, or units"
                action={{ label: 'Assign Landlord', onClick: () => setShowLandlordModal(true) }} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[700px]">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {['Person', 'Type', 'Hierarchy Level', 'Ownership %', 'Assigned On', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLandlords.map(a => {
                      const person = getPersonById(a.person_id);
                      const hierarchyLabel = getLandlordHierarchyLabel(a);
                      return (
                        <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-[11px] font-600 shrink-0">
                                {(person?.name || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-500">{person?.name || '—'}</p>
                                {person?.email && <p className="text-[11px] text-muted-foreground">{person.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[11px] font-600 rounded-full ${
                              a.landlord_type === 'landlord' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {a.landlord_type === 'landlord' ? 'Landlord' : 'Joint Landlord'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-[12px]">
                              {a.project_id && <Home size={12} className="text-muted-foreground" />}
                              {a.building_id && <Building2 size={12} className="text-muted-foreground" />}
                              {a.floor_id && <Layers size={12} className="text-muted-foreground" />}
                              {a.unit_id && <DoorOpen size={12} className="text-muted-foreground" />}
                              <span>{hierarchyLabel}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-600 tabular-nums">{Number(a.ownership_pct).toFixed(2)}%</span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">
                            {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleDeleteLandlord(a.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-all">
                              <Trash2 size={12} /> Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <RoleModal open={showRoleModal} onClose={() => setShowRoleModal(false)} onSaved={fetchAll} editRole={editRole} existingPermissions={permissions} />
      <StaffModal open={showStaffModal} onClose={() => setShowStaffModal(false)} onSaved={fetchAll} editStaff={editStaff} />
      <AssignModal open={showAssignModal} onClose={() => setShowAssignModal(false)} onSaved={fetchAll} staff={staff} projects={projects} roles={roles} existingAssignments={assignments} />
      <LandlordAssignModal open={showLandlordModal} onClose={() => setShowLandlordModal(false)} onSaved={fetchAll} persons={persons} projects={projects} />
    </div>
  );
}
