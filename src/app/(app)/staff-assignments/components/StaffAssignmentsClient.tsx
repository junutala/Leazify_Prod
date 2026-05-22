'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Search, RefreshCw, Shield, AlertCircle, ChevronDown, ChevronUp, Edit2, Trash2, Plus, X, Check, Building2, UserCheck, ShieldCheck, Eye, Filter } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
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

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface RolePermission {
  id: string;
  role_id: string;
  nav_key: string;
}

interface StaffRoleAssignment {
  id: string;
  staff_id: string;
  project_id: string;
  role_id: string;
  created_at: string;
  project?: Project;
  role?: Role;
}

interface StaffWithAssignments extends StaffMember {
  assignments: StaffRoleAssignment[];
  isExpanded: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
const labelCls = 'block text-[12px] font-500 text-foreground mb-1.5';

function ErrorBanner({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive">
      <AlertCircle size={14} className="shrink-0" />
      <span className="flex-1">{msg}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-[12px] underline ml-2">Retry</button>
      )}
    </div>
  );
}

// ─── Edit Assignment Modal ─────────────────────────────────────────────────────

function EditAssignmentModal({
  open,
  onClose,
  onSaved,
  staffMember,
  assignment,
  projects,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  staffMember: StaffMember | null;
  assignment: StaffRoleAssignment | null;
  projects: Project[];
  roles: Role[];
}) {
  const supabase = createClient();
  const [projectId, setProjectId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && assignment) {
      setProjectId(assignment.project_id);
      setRoleId(assignment.role_id);
      setError('');
    } else if (open && !assignment) {
      setProjectId('');
      setRoleId('');
      setError('');
    }
  }, [open, assignment]);

  const handleSave = async () => {
    if (!projectId || !roleId || !staffMember) {
      setError('Project and role are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (assignment) {
        const { error: updErr } = await supabase
          .from('staff_role_assignments')
          .update({ project_id: projectId, role_id: roleId })
          .eq('id', assignment.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('staff_role_assignments')
          .insert({ staff_id: staffMember.id, project_id: projectId, role_id: roleId });
        if (insErr) throw insErr;
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignment ? 'Edit Assignment' : 'Add Assignment'}
      subtitle={staffMember ? `Staff: ${staffMember.full_name}` : ''}
      size="md"
    >
      <div className="p-5 space-y-4">
        {error && <ErrorBanner msg={error} />}
        <div>
          <label className={labelCls}>Project *</label>
          <select
            className={inputCls}
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
          >
            <option value="">Select project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Role *</label>
          <select
            className={inputCls}
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
          >
            <option value="">Select role...</option>
            {roles.filter(r => r.is_active).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-500 text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : assignment ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Role Permissions Detail Modal ────────────────────────────────────────────

function RoleDetailModal({
  open,
  onClose,
  role,
  permissions,
}: {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  permissions: RolePermission[];
}) {
  const navPerms = permissions.filter(p => p.nav_key.startsWith('nav-'));
  const subFnPerms = permissions.filter(p => p.nav_key.startsWith('subfn-'));
  const widgetPerms = permissions.filter(p => p.nav_key.startsWith('widget-'));

  const formatNavKey = (key: string) =>
    key.replace('nav-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const formatSubFn = (key: string) => {
    const parts = key.replace('subfn-', '').split('-');
    return parts.slice(0, -1).join(' ').replace(/\b\w/g, c => c.toUpperCase()) + ' (sub-fn)';
  };

  const formatWidget = (key: string) =>
    key.replace('widget-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Role: ${role?.name || ''}`}
      subtitle={role?.description || 'Role permissions detail'}
      size="md"
    >
      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {navPerms.length > 0 && (
          <div>
            <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-2">Sidebar Access ({navPerms.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {navPerms.map(p => (
                <span key={p.id} className="px-2.5 py-1 text-[11px] font-500 bg-primary/10 text-primary rounded-full">
                  {formatNavKey(p.nav_key)}
                </span>
              ))}
            </div>
          </div>
        )}
        {subFnPerms.length > 0 && (
          <div>
            <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-2">Sub-Functions ({subFnPerms.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {subFnPerms.map(p => (
                <span key={p.id} className="px-2.5 py-1 text-[11px] font-500 bg-secondary text-foreground rounded-full">
                  {formatSubFn(p.nav_key)}
                </span>
              ))}
            </div>
          </div>
        )}
        {widgetPerms.length > 0 && (
          <div>
            <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-2">Dashboard Widgets ({widgetPerms.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {widgetPerms.map(p => (
                <span key={p.id} className="px-2.5 py-1 text-[11px] font-500 bg-amber-50 text-amber-700 rounded-full">
                  {formatWidget(p.nav_key)}
                </span>
              ))}
            </div>
          </div>
        )}
        {navPerms.length === 0 && subFnPerms.length === 0 && widgetPerms.length === 0 && (
          <p className="text-[13px] text-muted-foreground text-center py-4">No permissions assigned to this role.</p>
        )}
      </div>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StaffAssignmentsClient() {
  const supabase = createClient();
  const { isSuperAdmin, allowedNavKeys } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [staffList, setStaffList] = useState<StaffWithAssignments[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [editAssignment, setEditAssignment] = useState<StaffRoleAssignment | null>(null);
  const [roleDetailOpen, setRoleDetailOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Admin guard
  const isAdmin = isSuperAdmin() || allowedNavKeys === null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, projectsRes, rolesRes, assignmentsRes, permsRes] = await Promise.all([
        supabase.from('staff').select('*').order('full_name'),
        supabase.from('projects').select('id, name, status').order('name'),
        supabase.from('roles').select('*').order('name'),
        supabase.from('staff_role_assignments').select('*').order('created_at'),
        supabase.from('role_permissions').select('*'),
      ]);

      if (staffRes.error) throw staffRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      if (permsRes.error) throw permsRes.error;

      const projectMap = new Map((projectsRes.data || []).map((p: Project) => [p.id, p]));
      const roleMap = new Map((rolesRes.data || []).map((r: Role) => [r.id, r]));

      const enrichedAssignments: StaffRoleAssignment[] = (assignmentsRes.data || []).map((a: any) => ({
        ...a,
        project: projectMap.get(a.project_id),
        role: roleMap.get(a.role_id),
      }));

      const staffWithAssignments: StaffWithAssignments[] = (staffRes.data || []).map((s: StaffMember) => ({
        ...s,
        assignments: enrichedAssignments.filter(a => a.staff_id === s.id),
        isExpanded: false,
      }));

      setStaffList(staffWithAssignments);
      setProjects(projectsRes.data || []);
      setRoles(rolesRes.data || []);
      setAllPermissions(permsRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleExpand = (staffId: string) => {
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, isExpanded: !s.isExpanded } : s));
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from('staff_role_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      setDeleteConfirm(null);
      loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to delete assignment');
    }
  };

  const openAddAssignment = (staff: StaffMember) => {
    setEditStaff(staff);
    setEditAssignment(null);
    setEditModalOpen(true);
  };

  const openEditAssignment = (staff: StaffMember, assignment: StaffRoleAssignment) => {
    setEditStaff(staff);
    setEditAssignment(assignment);
    setEditModalOpen(true);
  };

  const openRoleDetail = (role: Role) => {
    setSelectedRole(role);
    setRoleDetailOpen(true);
  };

  // Filtered staff
  const filteredStaff = staffList.filter(s => {
    const matchSearch = !search ||
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchProject = !filterProject ||
      s.assignments.some(a => a.project_id === filterProject);
    const matchRole = !filterRole ||
      s.assignments.some(a => a.role_id === filterRole);
    return matchSearch && matchProject && matchRole;
  });

  // Summary stats
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter(s => s.is_active).length;
  const staffWithAssignments = staffList.filter(s => s.assignments.length > 0).length;
  const staffWithoutAssignments = staffList.filter(s => s.assignments.length === 0).length;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Shield size={40} className="text-muted-foreground" />
        <p className="text-[15px] font-500 text-foreground">Admin Access Required</p>
        <p className="text-[13px] text-muted-foreground">This screen is only accessible to administrators.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground tracking-tight">{t.staff_tab_staff} — {t.staff_tab_assignments}</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
            {t.staff_page_subtitle}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors shrink-0"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && <ErrorBanner msg={error} onRetry={loadData} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Staff', value: totalStaff, icon: <Users size={16} />, color: 'text-primary bg-primary/10' },
          { label: 'Active Staff', value: activeStaff, icon: <UserCheck size={16} />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Assigned', value: staffWithAssignments, icon: <ShieldCheck size={16} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Unassigned', value: staffWithoutAssignments, icon: <AlertCircle size={16} />, color: 'text-amber-600 bg-amber-50' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-[20px] font-700 text-foreground leading-none">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="px-3 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
            >
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="px-3 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
            >
              <option value="">All Roles</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {(search || filterProject || filterRole) && (
              <button
                onClick={() => { setSearch(''); setFilterProject(''); setFilterRole(''); }}
                className="flex items-center gap-1 px-2.5 py-2 text-[12px] text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Staff List */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff found"
          description={search || filterProject || filterRole ? 'Try adjusting your filters.' : 'No staff members have been added yet.'}
        />
      ) : (
        <div className="space-y-2">
          {filteredStaff.map(staff => {
            const hasAssignments = staff.assignments.length > 0;
            return (
              <div key={staff.id} className="bg-white border border-border rounded-xl overflow-hidden">
                {/* Staff Row Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => toggleExpand(staff.id)}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[13px] font-600 shrink-0">
                    {staff.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-600 text-foreground">{staff.full_name}</span>
                      {!staff.is_active && (
                        <span className="px-1.5 py-0.5 text-[10px] font-600 bg-destructive/10 text-destructive rounded-full">Inactive</span>
                      )}
                      {!hasAssignments && (
                        <span className="px-1.5 py-0.5 text-[10px] font-600 bg-amber-50 text-amber-600 rounded-full flex items-center gap-1">
                          <AlertCircle size={9} /> No assignments
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate">{staff.email}</p>
                  </div>

                  {/* Assignment count + project pills */}
                  <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end max-w-xs">
                    {staff.assignments.slice(0, 3).map(a => (
                      <span key={a.id} className="px-2 py-0.5 text-[11px] font-500 bg-primary/8 text-primary border border-primary/20 rounded-full truncate max-w-[120px]">
                        {a.project?.name || 'Unknown'}
                      </span>
                    ))}
                    {staff.assignments.length > 3 && (
                      <span className="px-2 py-0.5 text-[11px] font-500 bg-secondary text-muted-foreground rounded-full">
                        +{staff.assignments.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Assignment count badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 text-[11px] font-600 rounded-full ${hasAssignments ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary text-muted-foreground'}`}>
                      {staff.assignments.length} assignment{staff.assignments.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); openAddAssignment(staff); }}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                      title="Add assignment"
                    >
                      <Plus size={14} />
                    </button>
                    {staff.isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded Assignments */}
                {staff.isExpanded && (
                  <div className="border-t border-border bg-secondary/20">
                    {staff.assignments.length === 0 ? (
                      <div className="px-6 py-4 text-center">
                        <p className="text-[13px] text-muted-foreground">No project/role assignments yet.</p>
                        <button
                          onClick={() => openAddAssignment(staff)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Plus size={12} /> Add Assignment
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-3 px-6 py-2 text-[11px] font-600 uppercase tracking-wider text-muted-foreground">
                          <div className="col-span-4">Project</div>
                          <div className="col-span-4">Role</div>
                          <div className="col-span-3">Responsibilities</div>
                          <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {staff.assignments.map(assignment => {
                          const rolePerms = allPermissions.filter(p => p.role_id === assignment.role_id);
                          const navCount = rolePerms.filter(p => p.nav_key.startsWith('nav-')).length;
                          const subFnCount = rolePerms.filter(p => p.nav_key.startsWith('subfn-')).length;

                          return (
                            <div key={assignment.id} className="grid grid-cols-12 gap-3 px-6 py-3 items-center hover:bg-white/60 transition-colors">
                              {/* Project */}
                              <div className="col-span-4 flex items-center gap-2">
                                <Building2 size={13} className="text-muted-foreground shrink-0" />
                                <div>
                                  <p className="text-[13px] font-500 text-foreground">
                                    {assignment.project?.name || <span className="text-destructive">Unknown Project</span>}
                                  </p>
                                  {assignment.project && (
                                    <span className={`text-[10px] font-500 ${assignment.project.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                      {assignment.project.status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Role */}
                              <div className="col-span-4 flex items-center gap-2">
                                <Shield size={13} className="text-muted-foreground shrink-0" />
                                <div>
                                  <p className="text-[13px] font-500 text-foreground">
                                    {assignment.role?.name || <span className="text-destructive">Unknown Role</span>}
                                  </p>
                                  {assignment.role?.description && (
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{assignment.role.description}</p>
                                  )}
                                </div>
                              </div>

                              {/* Responsibilities */}
                              <div className="col-span-3">
                                {assignment.role ? (
                                  <button
                                    onClick={() => openRoleDetail(assignment.role!)}
                                    className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"
                                  >
                                    <Eye size={12} />
                                    {navCount} modules{subFnCount > 0 ? `, ${subFnCount} sub-fns` : ''}
                                  </button>
                                ) : (
                                  <span className="text-[12px] text-muted-foreground">—</span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="col-span-1 flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditAssignment(staff, assignment)}
                                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                  title="Edit assignment"
                                >
                                  <Edit2 size={13} />
                                </button>
                                {deleteConfirm === assignment.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDeleteAssignment(assignment.id)}
                                      className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                                      title="Confirm delete"
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(assignment.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Remove assignment"
                                  >
                                    <Trash2 size={13} />
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
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <EditAssignmentModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={loadData}
        staffMember={editStaff}
        assignment={editAssignment}
        projects={projects}
        roles={roles}
      />

      <RoleDetailModal
        open={roleDetailOpen}
        onClose={() => setRoleDetailOpen(false)}
        role={selectedRole}
        permissions={allPermissions.filter(p => p.role_id === selectedRole?.id)}
      />
    </div>
  );
}
