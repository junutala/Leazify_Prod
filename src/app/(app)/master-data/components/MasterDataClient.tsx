'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Users, Zap, Tag, Edit2, Trash2, X, Check, Eye, EyeOff, FileText, RefreshCw, KeyRound, AlertCircle, Upload, ImageIcon } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Country codes list ────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+971', label: 'UAE (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+973', label: 'Bahrain (+973)' },
  { code: '+968', label: 'Oman (+968)' },
  { code: '+965', label: 'Kuwait (+965)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+1', label: 'USA/Canada (+1)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
];

// ─── Phone Input Component ─────────────────────────────────────────────────────
function PhoneInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
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
        className={`w-36 px-2 py-2.5 text-[12px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all ${className || ''}`}
      >
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <input
        type="tel"
        value={number}
        onChange={e => onChange(countryCode + ' ' + e.target.value)}
        placeholder="Phone number"
        className={`flex-1 px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all ${className || ''}`}
      />
    </div>
  );
}

// ─── Email validation ──────────────────────────────────────────────────────────
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Password generator ────────────────────────────────────────────────────────
function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

// ---- Service Providers Tab ----
const skillTypes = ['electrical', 'mechanical', 'painting', 'plumbing', 'cleaning', 'hvac', 'carpentry', 'it_support'];

function ServiceProvidersTab() {
  const supabase = createClient();
  const [providers, setProviders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form, setForm] = useState({ person_type: 'company', name: '', skills: [] as string[], skill_type: 'electrical', email: '', password: '', mobile: '+971 ', response_time_hours: 24, trade_licence_no: '', national_id: '', is_active: true });
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchProviders = async () => {
    setLoading(true);
    const { data } = await supabase.from('service_providers').select('*').order('created_at', { ascending: false });
    setProviders(data || []);
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name').order('name');
    setProjects(data || []);
  };

  useEffect(() => { fetchProviders(); fetchProjects(); }, []);

  const resetForm = () => {
    setForm({ person_type: 'company', name: '', skills: [], skill_type: 'electrical', email: '', password: '', mobile: '+971 ', response_time_hours: 24, trade_licence_no: '', national_id: '', is_active: true });
    setSelectedProjects([]); setShowPassword(false); setSaveError(''); setEmailError('');
    setProfileImage(null); setProfileImageFile(null);
  };

  const openEdit = async (p: any) => {
    setEditRecord(p);
    setForm({ person_type: p.person_type, name: p.name, skills: p.skills || (p.skill_type ? [p.skill_type] : []), skill_type: p.skill_type || 'electrical', email: p.email || '', password: '', mobile: p.mobile || '+971 ', response_time_hours: p.response_time_hours || 24, trade_licence_no: p.trade_licence_no || '', national_id: p.national_id || '', is_active: p.is_active });
    setProfileImage(p.profile_image_url || null);
    setProfileImageFile(null);
    const { data } = await supabase.from('provider_project_assignments').select('project_id').eq('provider_id', p.id);
    setSelectedProjects((data || []).map((d: any) => d.project_id));
    setShowAdd(true);
  };

  const toggleSkill = (skill: string) => setForm(f => ({ ...f, skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill] }));
  const toggleProject = (pid: string) => setSelectedProjects(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfileImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaveError(''); setEmailError('');
    if (!form.name.trim()) { setSaveError('Name is required'); return; }
    if (!form.email.trim()) { setSaveError('Email is required'); return; }
    if (!isValidEmail(form.email)) { setEmailError('Please enter a valid email address'); return; }
    if (form.skills.length === 0) { setSaveError('Please select at least one skill'); return; }
    if (!editRecord && !form.password.trim()) { setSaveError('Password is required for new providers'); return; }
    setSaving(true);

    // Upload image if a new file was selected
    let imageUrl = editRecord?.profile_image_url || null;
    if (profileImageFile) {
      const ext = profileImageFile.name.split('.').pop();
      const fileName = `provider_${Date.now()}.${ext}`;
      // Store as base64 data URL directly in the DB (no storage bucket needed)
      imageUrl = profileImage;
    }

    const primarySkill = form.skills[0] || 'electrical';
    const providerData = { person_type: form.person_type, name: form.name, skills: form.skills, skill_type: primarySkill, email: form.email, mobile: form.mobile, response_time_hours: form.response_time_hours, trade_licence_no: form.trade_licence_no, national_id: form.national_id, is_active: form.is_active, profile_image_url: imageUrl };
    let providerId = editRecord?.id;
    if (editRecord) {
      const { error } = await supabase.from('service_providers').update(providerData).eq('id', editRecord.id);
      if (error) { setSaveError(error.message); setSaving(false); return; }
    } else {
      const { data: newProvider, error: insertError } = await supabase.from('service_providers').insert(providerData).select().single();
      if (insertError) { setSaveError(insertError.message); setSaving(false); return; }
      providerId = newProvider.id;
      const signupRes = await fetch('/api/service-provider/create-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, password: form.password, fullName: form.name, providerId: newProvider.id }) });
      if (!signupRes.ok) { const errData = await signupRes.json(); console.warn('Auth user creation failed:', errData.error); }
      try { await fetch('/api/staff/send-welcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, fullName: form.name, password: form.password, isServiceProvider: true }) }); } catch (e) { console.warn('Welcome email failed:', e); }
    }
    if (providerId) {
      await supabase.from('provider_project_assignments').delete().eq('provider_id', providerId);
      if (selectedProjects.length > 0) await supabase.from('provider_project_assignments').insert(selectedProjects.map(pid => ({ provider_id: providerId, project_id: pid })));
    }
    setSaving(false); setShowAdd(false); setEditRecord(null); resetForm(); fetchProviders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service provider?')) return;
    await supabase.from('service_providers').delete().eq('id', id);
    fetchProviders();
  };

  const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditRecord(null); resetForm(); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"><Plus size={14} /> Add Provider</button>
      </div>
      {loading ? <LoadingSkeleton rows={4} /> : providers.length === 0 ? (
        <EmptyState icon={Users} title="No service providers" description="Add your first service provider" action={{ label: 'Add Provider', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead><tr className="bg-secondary/50 border-b border-border">{['Photo', 'Name', 'Type', 'Skills', 'Email', 'Mobile', 'Projects', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {providers.map(p => (
                <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    {p.profile_image_url ? (
                      <img src={p.profile_image_url} alt={`${p.name} profile`} className="w-9 h-9 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[13px] font-700">
                        {p.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-500">{p.name}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{p.person_type}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(p.skills && p.skills.length > 0 ? p.skills : [p.skill_type]).map((s: string) => <span key={s} className="px-1.5 py-0.5 text-[10px] font-500 bg-primary/10 text-primary rounded-full capitalize">{s}</span>)}</div></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.mobile || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-[12px]"><ProviderProjectCount providerId={p.id} /></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[11px] font-500 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Edit"><Edit2 size={13} /></button><button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditRecord(null); resetForm(); }} title={editRecord ? 'Edit Service Provider' : 'Add Service Provider'} size="lg">
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {saveError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {saveError}</div>}

          {/* Profile Image Upload */}
          <div>
            <label className={labelCls}>Profile Photo <span className="text-muted-foreground font-400">(optional)</span></label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center overflow-hidden shrink-0">
                {profileImage ? (
                  <img src={profileImage} alt="Provider profile" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={22} className="text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <Upload size={12} /> {profileImage ? 'Change Photo' : 'Upload Photo'}
                </button>
                {profileImage && (
                  <button
                    type="button"
                    onClick={() => { setProfileImage(null); setProfileImageFile(null); }}
                    className="flex items-center gap-1 text-[11px] text-destructive hover:underline"
                  >
                    <X size={11} /> Remove
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Type</label><select className={inputCls} value={form.person_type} onChange={e => setForm(f => ({ ...f, person_type: e.target.value }))}><option value="company">Company</option><option value="individual">Individual</option></select></div>
            <div><label className={labelCls}>Status</label><select className={inputCls} value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
          <div><label className={labelCls}>Name *</label><input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Provider name" /></div>
          {form.person_type === 'company' ? <div><label className={labelCls}>Trade Licence No</label><input className={inputCls} value={form.trade_licence_no} onChange={e => setForm(f => ({ ...f, trade_licence_no: e.target.value }))} /></div> : <div><label className={labelCls}>National ID</label><input className={inputCls} value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} /></div>}
          <div>
            <label className={labelCls}>Email (Username) *</label>
            <input type="email" className={`${inputCls} ${emailError ? 'border-destructive focus:border-destructive' : ''}`} value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailError(''); }} placeholder="provider@example.com" />
            {emailError && <p className="text-[11px] text-destructive mt-1">{emailError}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">This email will be used as the login username for the service provider portal.</p>
          </div>
          {!editRecord && (
            <div>
              <label className={labelCls}>Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className={`${inputCls} pr-10`} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Set a password for this provider" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">A welcome email with these credentials will be sent to the provider.</p>
            </div>
          )}
          <div><label className={labelCls}>Mobile</label><PhoneInput value={form.mobile} onChange={v => setForm(f => ({ ...f, mobile: v }))} /></div>
          <div>
            <label className={labelCls}>Skills * <span className="text-muted-foreground font-400">(select all that apply)</span></label>
            <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg bg-background">
              {skillTypes.map(s => <button key={s} type="button" onClick={() => toggleSkill(s)} className={`px-3 py-1.5 text-[12px] font-500 rounded-full border transition-all ${form.skills.includes(s) ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'}`}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</button>)}
            </div>
            {form.skills.length === 0 && <p className="text-[11px] text-muted-foreground mt-1">Select at least one skill</p>}
          </div>
          <div>
            <label className={labelCls}>Assigned Projects <span className="text-muted-foreground font-400">(area of operation)</span></label>
            {projects.length === 0 ? <p className="text-[12px] text-muted-foreground">No projects available</p> : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                {projects.map(p => <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 px-2 py-1.5 rounded"><input type="checkbox" checked={selectedProjects.includes(p.id)} onChange={() => toggleProject(p.id)} className="accent-primary" /><span className="text-[13px]">{p.name}</span></label>)}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Provider will only see open requests from assigned projects.</p>
          </div>
          <div><label className={labelCls}>Response Time (hours)</label><input type="number" className={inputCls} value={form.response_time_hours} onChange={e => setForm(f => ({ ...f, response_time_hours: Number(e.target.value) }))} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowAdd(false); setEditRecord(null); resetForm(); }} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">{saving ? 'Saving...' : editRecord ? 'Update Provider' : 'Add Provider & Send Email'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProviderProjectCount({ providerId }: { providerId: string }) {
  const supabase = createClient();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { supabase.from('provider_project_assignments').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).then(({ count: c }) => setCount(c ?? 0)); }, [providerId]);
  if (count === null) return <span className="text-muted-foreground">—</span>;
  return <span>{count} project{count !== 1 ? 's' : ''}</span>;
}

// ---- Persons Tab ----
function PersonsTab() {
  const supabase = createClient();
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form, setForm] = useState({ person_type: 'individual', name: '', email: '', mobile: '+971 ', contact_address: '', trade_licence_no: '', national_id: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Portal access fields (create mode)
  const [grantPortalAccess, setGrantPortalAccess] = useState(false);
  const [portalPassword, setPortalPassword] = useState('');
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [portalStatus, setPortalStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [portalError, setPortalError] = useState('');

  const resetForm = () => {
    setForm({ person_type: 'individual', name: '', email: '', mobile: '+971 ', contact_address: '', trade_licence_no: '', national_id: '' });
    setGrantPortalAccess(false);
    setPortalPassword('');
    setShowPortalPassword(false);
    setPortalStatus('idle');
    setPortalError('');
    setSaveError('');
    setEmailError('');
  };

  const fetchPersons = async () => { setLoading(true); const { data } = await supabase.from('persons').select('*').order('created_at', { ascending: false }); setPersons(data || []); setLoading(false); };
  useEffect(() => { fetchPersons(); }, []);

  const openEdit = (p: any) => {
    setEditRecord(p);
    setForm({ person_type: p.person_type, name: p.name, email: p.email || '', mobile: p.mobile || '+971 ', contact_address: p.contact_address || '', trade_licence_no: p.trade_licence_no || '', national_id: p.national_id || '' });
    setGrantPortalAccess(false);
    setPortalPassword('');
    setShowPortalPassword(false);
    setPortalStatus('idle');
    setPortalError('');
    setSaveError('');
    setEmailError('');
    setShowAdd(true);
  };

  const handleSave = async () => {
    setSaveError(''); setEmailError('');
    if (!form.name.trim()) { setSaveError('Name is required'); return; }
    if (form.email && !isValidEmail(form.email)) { setEmailError('Please enter a valid email address'); return; }
    if (grantPortalAccess && !form.email.trim()) { setEmailError('Email is required to grant portal access'); return; }
    if (grantPortalAccess && !portalPassword.trim()) { setSaveError('Password is required to grant portal access'); return; }

    setSaving(true);
    try {
      let personId = editRecord?.id;
      if (editRecord) {
        const { error } = await supabase.from('persons').update(form).eq('id', editRecord.id);
        if (error) throw error;
      } else {
        const { data: newPerson, error } = await supabase.from('persons').insert(form).select('id').single();
        if (error) throw error;
        personId = newPerson.id;

        // Create landlord portal access if requested
        if (grantPortalAccess && form.email.trim() && portalPassword.trim()) {
          setPortalStatus('creating');
          try {
            const res = await fetch('/api/landlord/create-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: portalPassword, fullName: form.name.trim(), personId }),
            });
            const data = await res.json();
            if (!res.ok) {
              setPortalStatus('error');
              setPortalError(data.error || 'Failed to create portal access');
              // Person was created — don't block, just warn
            } else {
              setPortalStatus('success');
            }
          } catch {
            setPortalStatus('error');
            setPortalError('Network error creating portal access');
          }
        }
      }
      setSaving(false);
      setShowAdd(false);
      setEditRecord(null);
      resetForm();
      fetchPersons();
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save person');
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete this person?')) return; await supabase.from('persons').delete().eq('id', id); fetchPersons(); };

  const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditRecord(null); resetForm(); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"><Plus size={14} /> Add Person</button>
      </div>
      {loading ? <LoadingSkeleton rows={4} /> : persons.length === 0 ? (
        <EmptyState icon={Users} title="No persons" description="Add persons to use as lessees and owners" action={{ label: 'Add Person', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[700px]">
            <thead><tr className="bg-secondary/50 border-b border-border">{['Name', 'Type', 'Email', 'Mobile', 'Licence / ID', 'Address', 'Portal', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {persons.map(p => (
                <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-500">{p.name}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{p.person_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.mobile || '—'}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">{p.trade_licence_no || p.national_id || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-[12px]">{p.contact_address || '—'}</td>
                  <td className="px-4 py-3">
                    {p.user_id
                      ? <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-500 bg-green-100 text-green-700 rounded-full w-fit"><KeyRound size={10} /> Active</span>
                      : <span className="text-[11px] text-muted-foreground">—</span>
                    }
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Edit"><Edit2 size={13} /></button><button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditRecord(null); resetForm(); }} title={editRecord ? 'Edit Person' : 'Add Person'} size="md">
        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">
              <AlertCircle size={13} className="shrink-0" /> {saveError}
            </div>
          )}
          <div className="flex gap-4">{['individual', 'company'].map(t => <label key={t} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="person_type" value={t} checked={form.person_type === t} onChange={() => setForm(f => ({ ...f, person_type: t }))} className="accent-primary" /><span className="text-[13px] font-500 capitalize">{t}</span></label>)}</div>
          <div><label className={labelCls}>Name *</label><input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          {form.person_type === 'company' ? <div><label className={labelCls}>Trade Licence No</label><input className={inputCls} value={form.trade_licence_no} onChange={e => setForm(f => ({ ...f, trade_licence_no: e.target.value }))} /></div> : <div><label className={labelCls}>National ID</label><input className={inputCls} value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email (Username)</label>
              <input type="email" className={`${inputCls} ${emailError ? 'border-destructive' : ''}`} value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailError(''); }} placeholder="landlord@example.com" />
              {emailError && <p className="text-[11px] text-destructive mt-1">{emailError}</p>}
            </div>
            <div><label className={labelCls}>Mobile</label><PhoneInput value={form.mobile} onChange={v => setForm(f => ({ ...f, mobile: v }))} /></div>
          </div>
          <div><label className={labelCls}>Contact Address</label><input className={inputCls} value={form.contact_address} onChange={e => setForm(f => ({ ...f, contact_address: e.target.value }))} /></div>

          {/* ── Landlord Portal Access (create mode only) ── */}
          {!editRecord && (
            <div className="border border-border rounded-xl overflow-hidden">
              <label className="flex items-center gap-3 px-4 py-3 bg-secondary/40 cursor-pointer hover:bg-secondary/70 transition-colors">
                <input
                  type="checkbox"
                  checked={grantPortalAccess}
                  onChange={e => {
                    setGrantPortalAccess(e.target.checked);
                    if (e.target.checked && !portalPassword) setPortalPassword(generatePassword());
                  }}
                  className="accent-primary w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <KeyRound size={13} className="text-primary" />
                  <span className="text-[13px] font-500 text-foreground">Grant Landlord Portal Access</span>
                </div>
                <span className="ml-auto text-[11px] text-muted-foreground">Optional</span>
              </label>
              {grantPortalAccess && (
                <div className="p-4 space-y-3 border-t border-border bg-background">
                  <p className="text-[12px] text-muted-foreground">The email above will be used as the login username. Set a password for the landlord portal below.</p>
                  {portalStatus === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">
                      <AlertCircle size={13} className="shrink-0" /> {portalError}
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Portal Password *</label>
                    <div className="relative">
                      <input
                        type={showPortalPassword ? 'text' : 'password'}
                        className={`${inputCls} pr-10`}
                        value={portalPassword}
                        onChange={e => setPortalPassword(e.target.value)}
                        placeholder="Set a password for portal login"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPortalPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPortalPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPortalPassword(generatePassword()); setShowPortalPassword(true); }}
                      className="mt-1.5 flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <RefreshCw size={10} /> Generate random password
                    </button>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <KeyRound size={13} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-blue-700">The landlord can log in to the landlord portal using their email and this password. Make sure to share these credentials with them.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button onClick={() => { setShowAdd(false); setEditRecord(null); resetForm(); }} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name} className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
              {saving ? (portalStatus === 'creating' ? 'Creating portal access...' : 'Saving...') : editRecord ? 'Update Person' : grantPortalAccess ? 'Add Person & Grant Access' : 'Add Person'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Master Lookups Tab ────────────────────────────────────────────────────────
interface LookupCategory {
  key: string;
  title: string;
  color: string;
  items: string[];
}

const defaultCategories: LookupCategory[] = [
  { key: 'skill_types', title: 'Skill Types', color: 'bg-primary/10 text-primary', items: ['Electrical', 'Mechanical', 'Painting', 'Plumbing', 'Cleaning', 'HVAC', 'Carpentry', 'IT Support'] },
  { key: 'usage_types', title: 'Usage Types', color: 'bg-blue-100 text-blue-700', items: ['Residential', 'Office', 'Retail', 'Mall'] },
  { key: 'mall_store_types', title: 'Mall Store Types', color: 'bg-purple-100 text-purple-700', items: ['Anchor', 'Apparel', 'Electronics', 'Food Courts', 'Entertainment', 'Convenience', 'Book Stores', 'Kiosks', 'Speciality'] },
  { key: 'payment_terms', title: 'Payment Terms', color: 'bg-green-100 text-green-700', items: ['Immediate', '15 Days', '30 Days', '45 Days', 'Quarterly', 'Half Yearly', 'Annually'] },
  { key: 'payment_methods', title: 'Payment Methods', color: 'bg-amber-100 text-amber-700', items: ['Cash', 'Cheque', 'Bank Transfer', 'Online Payment'] },
  { key: 'contact_types', title: 'Contact Types', color: 'bg-rose-100 text-rose-700', items: ['Finance', 'Admin', 'Security', 'Emergency'] },
];

// System-defined lease statuses (non-editable — protect downstream functions)
const SYSTEM_LEASE_STATUSES = ['Draft', 'Active', 'Expired', 'Terminated', 'Renewed'];
// Reporting-only statuses (user-manageable)
const DEFAULT_REPORTING_LEASE_STATUSES = ['Absconding', 'Rent Committee', 'Court Sealed', 'Court Released'];

function LeaseStatusTab() {
  const [reportingStatuses, setReportingStatuses] = useState<string[]>(DEFAULT_REPORTING_LEASE_STATUSES);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newValue, setNewValue] = useState('');

  const startEdit = (idx: number, current: string) => { setEditingIdx(idx); setEditValue(current); };
  const saveEdit = (idx: number) => { if (!editValue.trim()) return; setReportingStatuses(prev => prev.map((it, i) => i === idx ? editValue.trim() : it)); setEditingIdx(null); setEditValue(''); };
  const deleteItem = (idx: number) => setReportingStatuses(prev => prev.filter((_, i) => i !== idx));
  const addItem = () => { if (!newValue.trim()) return; setReportingStatuses(prev => [...prev, newValue.trim()]); setNewValue(''); setAddingNew(false); };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5"><span className="text-white text-[10px] font-700">!</span></div>
        <div>
          <p className="text-[13px] font-600 text-amber-800">Lease Status Management</p>
          <p className="text-[12px] text-amber-700 mt-0.5">System-defined statuses (shown with lock icon) are non-editable to protect downstream functions. Additional statuses below are for reporting purposes only and do not affect lease workflow.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-[13px] font-600 text-foreground">System-Defined Statuses</h3>
            <span className="px-2 py-0.5 text-[10px] font-500 bg-slate-100 text-slate-600 rounded-full">Non-editable</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SYSTEM_LEASE_STATUSES.map(status => (
              <span key={status} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-500 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                {status}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">These statuses drive lease workflow and invoice generation. They cannot be modified.</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-600 text-foreground">Reporting Statuses</h3>
              <span className="px-2 py-0.5 text-[10px] font-500 bg-blue-100 text-blue-700 rounded-full">Reporting only</span>
            </div>
            <button onClick={() => { setAddingNew(true); setNewValue(''); }} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-500 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"><Plus size={11} /> Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {reportingStatuses.map((status, idx) => (
              <div key={`rs-${idx}`} className="group flex items-center gap-1">
                {editingIdx === idx ? (
                  <div className="flex items-center gap-1">
                    <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(idx); if (e.key === 'Escape') setEditingIdx(null); }} className="px-2 py-0.5 text-[12px] border border-primary rounded-lg outline-none w-32" />
                    <button onClick={() => saveEdit(idx)} className="p-0.5 text-green-600 hover:text-green-700"><Check size={12} /></button>
                    <button onClick={() => setEditingIdx(null)} className="p-0.5 text-muted-foreground hover:text-foreground"><X size={12} /></button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1 text-[12px] font-500 rounded-full bg-orange-100 text-orange-700">
                    {status}
                    <button onClick={() => startEdit(idx, status)} className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-foreground transition-opacity"><Edit2 size={10} /></button>
                    <button onClick={() => deleteItem(idx)} className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"><X size={10} /></button>
                  </span>
                )}
              </div>
            ))}
          </div>
          {addingNew && (
            <div className="mt-3 flex items-center gap-2">
              <input autoFocus value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAddingNew(false); }} placeholder="New status..." className="flex-1 px-3 py-1.5 text-[12px] border border-border rounded-lg outline-none focus:border-primary" />
              <button onClick={addItem} className="px-3 py-1.5 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Add</button>
              <button onClick={() => setAddingNew(false)} className="px-3 py-1.5 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors">Cancel</button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">These statuses are for reporting and tracking only. They do not trigger any automated actions.</p>
        </div>
      </div>
    </div>
  );
}

function StaticMastersTab() {
  const [categories, setCategories] = useState<LookupCategory[]>(defaultCategories);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemValue, setNewItemValue] = useState('');

  const startEdit = (catKey: string, idx: number, current: string) => { setEditingCategory(catKey); setEditingItemIdx(idx); setEditValue(current); };
  const saveEdit = (catKey: string, idx: number) => { if (!editValue.trim()) return; setCategories(cats => cats.map(c => c.key === catKey ? { ...c, items: c.items.map((it, i) => i === idx ? editValue.trim() : it) } : c)); setEditingCategory(null); setEditingItemIdx(null); setEditValue(''); };
  const deleteItem = (catKey: string, idx: number) => setCategories(cats => cats.map(c => c.key === catKey ? { ...c, items: c.items.filter((_, i) => i !== idx) } : c));
  const addItem = (catKey: string) => { if (!newItemValue.trim()) return; setCategories(cats => cats.map(c => c.key === catKey ? { ...c, items: [...c.items, newItemValue.trim()] } : c)); setNewItemValue(''); setAddingTo(null); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map(cat => (
        <div key={cat.key} className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-600 text-foreground">{cat.title}</h3>
            <button onClick={() => { setAddingTo(cat.key); setNewItemValue(''); }} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-500 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"><Plus size={11} /> Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {cat.items.map((item, idx) => (
              <div key={`${cat.key}-${idx}`} className="group flex items-center gap-1">
                {editingCategory === cat.key && editingItemIdx === idx ? (
                  <div className="flex items-center gap-1">
                    <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat.key, idx); if (e.key === 'Escape') { setEditingCategory(null); setEditingItemIdx(null); } }} className="px-2 py-0.5 text-[12px] border border-primary rounded-lg outline-none w-28" />
                    <button onClick={() => saveEdit(cat.key, idx)} className="p-0.5 text-green-600 hover:text-green-700"><Check size={12} /></button>
                    <button onClick={() => { setEditingCategory(null); setEditingItemIdx(null); }} className="p-0.5 text-muted-foreground hover:text-foreground"><X size={12} /></button>
                  </div>
                ) : (
                  <span className={`flex items-center gap-1 px-3 py-1 text-[12px] font-500 rounded-full ${cat.color}`}>
                    {item}
                    <button onClick={() => startEdit(cat.key, idx, item)} className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-foreground transition-opacity"><Edit2 size={10} /></button>
                    <button onClick={() => deleteItem(cat.key, idx)} className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"><X size={10} /></button>
                  </span>
                )}
              </div>
            ))}
          </div>
          {addingTo === cat.key && (
            <div className="mt-3 flex items-center gap-2">
              <input autoFocus value={newItemValue} onChange={e => setNewItemValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addItem(cat.key); if (e.key === 'Escape') setAddingTo(null); }} placeholder="New item..." className="flex-1 px-3 py-1.5 text-[12px] border border-border rounded-lg outline-none focus:border-primary" />
              <button onClick={() => addItem(cat.key)} className="px-3 py-1.5 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Add</button>
              <button onClick={() => setAddingTo(null)} className="px-3 py-1.5 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors">Cancel</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type MasterTab = 'providers' | 'persons' | 'masters' | 'lease_status';

export default function MasterDataClient() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<MasterTab>('providers');

  const tabs: { value: MasterTab; label: string; icon: React.ReactNode }[] = [
    { value: 'providers', label: 'Service Providers', icon: <Zap size={14} /> },
    { value: 'persons', label: 'Persons', icon: <Users size={14} /> },
    { value: 'masters', label: 'Master Lookups', icon: <Tag size={14} /> },
    { value: 'lease_status', label: 'Lease Status', icon: <FileText size={14} /> },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.masterdata_title}</h1>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.masterdata_subtitle}</p>
      </div>
      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-500 rounded-lg transition-all whitespace-nowrap ${tab === t.value ? 'bg-white shadow-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-border shadow-card p-4 sm:p-5">
        {tab === 'providers' && <ServiceProvidersTab />}
        {tab === 'persons' && <PersonsTab />}
        {tab === 'masters' && <StaticMastersTab />}
        {tab === 'lease_status' && <LeaseStatusTab />}
      </div>
    </div>
  );
}
