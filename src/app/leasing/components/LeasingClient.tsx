'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Plus, Search, Filter, Eye, RefreshCw, X, Download, Users, Edit2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useForm } from 'react-hook-form';
import { logAuditEvent } from '@/lib/auditLog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoRefresh } from '@/contexts/DataRefreshContext';

interface Lease {
  id: string;
  lease_number: string | null;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  security_deposit: number;
  payment_terms: string;
  status: string;
  annual_increment_pct: number;
  turnover_rent_pct: number;
  amc_amount: number;
  amc_payment_term: string;
  contract_generated: boolean;
  lessee_person_id: string | null;
  units?: { unit_number: string; unit_name: string; floors?: { name: string; buildings?: { name: string; projects?: { name: string } } } };
  persons?: { name: string };
  co_tenants?: { id: string; person_id: string; persons?: { name: string } }[];
}

interface Project { id: string; name: string; }
interface Building { id: string; name: string; project_id: string; }
interface Floor { id: string; name: string; building_id: string; }
interface Unit { id: string; unit_number: string; unit_name: string; floor_id: string; }
interface Person { id: string; name: string; }

const statusColors: Record<string, string> = {
  active: 'success', expired: 'error', terminated: 'error', pending: 'warning', renewed: 'info',
};

function usePaymentTerms() {
  const { t } = useLanguage();
  const paymentTermOptions: { value: string; label: string }[] = [
    { value: 'immediate', label: t.pt_immediate },
    { value: '15_days', label: t.pt_15_days },
    { value: '30_days', label: t.pt_30_days },
    { value: 'quarterly', label: t.pt_quarterly },
    { value: 'half_yearly', label: t.pt_half_yearly },
    { value: 'annually', label: t.pt_annually },
  ];
  const getPaymentTermLabel = (value: string) =>
    paymentTermOptions.find(o => o.value === value)?.label || value;
  return { paymentTermOptions, getPaymentTermLabel };
}

const leaseStatuses = ['draft', 'active', 'expired', 'terminated', 'renewed'];

interface LeaseFormValues {
  unit_id: string;
  lessee_person_id: string;
  start_date: string;
  end_date: string;
  security_deposit: number;
  sd_payment_term: string;
  rent_amount: number;
  payment_terms: string;
  turnover_rent_pct: number;
  turnover_payment_term: string;
  amc_amount: number;
  amc_payment_term: string;
  annual_increment_pct: number;
  notes: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><X size={10} className="shrink-0" />{message}</p>;
}

function generateLeasePDF(lease: any) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lease Contract - ${lease.lease_number || 'Draft'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
        .section { margin: 20px 0; }
        .section h2 { font-size: 14px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
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
          <div class="field"><div class="label">Project</div><div class="value">${lease.units?.floors?.buildings?.projects?.name || '—'}</div></div>
          <div class="field"><div class="label">Building</div><div class="value">${lease.units?.floors?.buildings?.name || '—'}</div></div>
          <div class="field"><div class="label">Floor</div><div class="value">${lease.units?.floors?.name || '—'}</div></div>
          <div class="field"><div class="label">Unit</div><div class="value">${lease.units?.unit_name || lease.units?.unit_number || '—'}</div></div>
        </div>
      </div>
      
      <div class="section">
        <h2>Lessee Details</h2>
        <div class="field"><div class="label">Lessee Name</div><div class="value">${lease.persons?.name || '—'}</div></div>
      </div>
      
      <div class="section">
        <h2>Lease Terms</h2>
        <div class="grid">
          <div class="field"><div class="label">Start Date</div><div class="value">${lease.start_date}</div></div>
          <div class="field"><div class="label">End Date</div><div class="value">${lease.end_date}</div></div>
          <div class="field"><div class="label">Annual Rent (AED)</div><div class="value">${Number(lease.rent_amount).toLocaleString()}</div></div>
          <div class="field"><div class="label">Payment Term</div><div class="value">${lease.payment_terms}</div></div>
          <div class="field"><div class="label">Security Deposit (AED)</div><div class="value">${Number(lease.security_deposit).toLocaleString()}</div></div>
          <div class="field"><div class="label">Annual Increment %</div><div class="value">${lease.annual_increment_pct || 0}%</div></div>
          <div class="field"><div class="label">Turnover Rent %</div><div class="value">${lease.turnover_rent_pct || 0}%</div></div>
          <div class="field"><div class="label">AMC Amount (AED)</div><div class="value">${Number(lease.amc_amount || 0).toLocaleString()}</div></div>
        </div>
      </div>
      
      <div class="footer">
        <div><div class="sig-line">Lessor Signature & Date</div></div>
        <div><div class="sig-line">Lessee Signature & Date</div></div>
      </div>
    </body>
    </html>
  `;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

function AddLeaseModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const { paymentTermOptions, getPaymentTermLabel } = usePaymentTerms();
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selProject, setSelProject] = useState('');
  const [selBuilding, setSelBuilding] = useState('');
  const [selFloor, setSelFloor] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Co-tenants state
  interface CoTenantEntry { id: string; personId: string; }
  const [coTenants, setCoTenants] = useState<CoTenantEntry[]>([]);
  const newCoTenant = (): CoTenantEntry => ({ id: Math.random().toString(36).slice(2), personId: '' });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<LeaseFormValues>({
    defaultValues: { sd_payment_term: 'immediately', turnover_payment_term: 'monthly', amc_payment_term: 'annually', annual_increment_pct: 0, turnover_rent_pct: 0, amc_amount: 0, security_deposit: 0 }
  });
  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');
  const watchedLesseeId = watch('lessee_person_id');

  const leaseDurationYears = watchedStartDate && watchedEndDate
    ? (new Date(watchedEndDate).getTime() - new Date(watchedStartDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    : 0;
  const showAnnualIncrement = leaseDurationYears > 1;

  useEffect(() => {
    if (!open) return;
    setSaveError('');
    setCoTenants([]);
    Promise.all([
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('persons').select('id, name').order('name'),
    ]).then(([pRes, perRes]) => {
      let projectList = pRes.data || [];
      // Filter projects by assignment for staff users
      if (assignedProjectIds !== null && assignedProjectIds.length >= 0) {
        projectList = projectList.filter((p: any) => assignedProjectIds.includes(p.id));
      }
      setProjects(projectList);
      setPersons(perRes.data || []);
    });
  }, [open, assignedProjectIds]);

  useEffect(() => {
    if (!selProject) { setBuildings([]); setFloors([]); setUnits([]); return; }
    supabase.from('buildings').select('id, name, project_id').eq('project_id', selProject).order('name').then(({ data }) => setBuildings(data || []));
    setFloors([]); setUnits([]);
  }, [selProject]);

  useEffect(() => {
    if (!selBuilding) { setFloors([]); setUnits([]); return; }
    supabase.from('floors').select('id, name, building_id').eq('building_id', selBuilding).order('name').then(({ data }) => setFloors(data || []));
    setUnits([]);
  }, [selBuilding]);

  useEffect(() => {
    if (!selFloor) { setUnits([]); return; }
    supabase.from('units').select('id, unit_number, unit_name, floor_id').eq('floor_id', selFloor).order('unit_number').then(({ data }) => setUnits(data || []));
  }, [selFloor]);

  const onSubmit = async (values: LeaseFormValues) => {
    // Validate co-tenants
    for (const co of coTenants) {
      if (!co.personId) { setSaveError('Please select a person for each co-tenant'); return; }
    }
    // Check for duplicate persons
    const allPersonIds = [values.lessee_person_id, ...coTenants.map(c => c.personId)];
    if (new Set(allPersonIds).size !== allPersonIds.length) {
      setSaveError('The same person cannot be both main tenant and co-tenant');
      return;
    }

    // ── Active lease conflict check ──────────────────────────────────────────
    // Block if the unit already has an active (or draft) lease that overlaps the requested period
    const { data: conflictingLeases, error: conflictErr } = await supabase
      .from('leases')
      .select('id, lease_number, start_date, end_date, status')
      .eq('unit_id', values.unit_id)
      .in('status', ['active', 'draft', 'renewed'])
      .lte('start_date', values.end_date)
      .gte('end_date', values.start_date);

    if (conflictErr) { setSaveError(conflictErr.message); return; }
    if (conflictingLeases && conflictingLeases.length > 0) {
      const c = conflictingLeases[0];
      setSaveError(
        `This unit already has an active lease (${c.lease_number || c.id}) covering ${c.start_date} – ${c.end_date}. ` +
        `A new lease cannot be created for an overlapping period.`
      );
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    setSaving(true);
    setSaveError('');
    const leaseNum = `LSE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    const insertPayload = {
      lease_number: leaseNum,
      unit_id: values.unit_id,
      lessee_person_id: values.lessee_person_id,
      start_date: values.start_date,
      end_date: values.end_date,
      payment_terms: values.payment_terms,
      sd_payment_term: values.sd_payment_term,
      turnover_payment_term: values.turnover_payment_term,
      amc_payment_term: values.amc_payment_term,
      notes: values.notes,
      contract_generated: true,
      status: 'draft',
      rent_amount: Number(values.rent_amount),
      security_deposit: Number(values.security_deposit),
      annual_increment_pct: Number(values.annual_increment_pct),
      turnover_rent_pct: Number(values.turnover_rent_pct),
      amc_amount: Number(values.amc_amount),
    };
    const { data: newLease, error } = await supabase.from('leases').insert(insertPayload).select().single();
    if (error) { setSaveError(error.message); setSaving(false); return; }

    // Insert co-tenants if any
    if (coTenants.length > 0 && newLease) {
      const coRecords = coTenants.map(co => ({
        lease_id: newLease.id,
        tenant_id: '00000000-0000-0000-0000-000000000000', // placeholder — co_tenants.tenant_id is required
        person_id: co.personId,
        share_percentage: Math.floor(100 / (coTenants.length + 1)),
        is_primary: false,
      }));
      // Try inserting; if tenant_id constraint fails, use person_id only approach
      const { error: coErr } = await supabase.from('co_tenants').insert(coRecords);
      if (coErr) {
        // Fallback: insert without tenant_id (use person_id only)
        await supabase.from('co_tenants').insert(coTenants.map(co => ({
          lease_id: newLease.id,
          person_id: co.personId,
          share_percentage: Math.floor(100 / (coTenants.length + 1)),
          is_primary: false,
        })));
      }
    }

    await logAuditEvent({
      entityType: 'lease',
      entityId: newLease?.id,
      entityLabel: leaseNum,
      action: 'created',
      afterValues: { ...insertPayload, co_tenants_count: coTenants.length },
    });

    setSaving(false);
    reset();
    setSelProject(''); setSelBuilding(''); setSelFloor('');
    setCoTenants([]);
    onSaved();
    onClose();
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 text-[13px] bg-background border rounded-lg outline-none focus:ring-2 transition-all ${hasError ? 'border-destructive focus:border-destructive focus:ring-destructive/15' : 'border-border focus:border-primary focus:ring-primary/15'}`;
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  return (
    <Modal open={open} onClose={() => { reset(); setSelProject(''); setSelBuilding(''); setSelFloor(''); setCoTenants([]); onClose(); }} title={t.leasing_modal_title} subtitle={t.leasing_modal_subtitle} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
        {saveError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {saveError}</div>}

        {/* Property Selection */}
        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.leasing_section_property}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.lbl_project}</label>
              <select className={inputCls()} value={selProject} onChange={e => setSelProject(e.target.value)}>
                <option value="">{t.lbl_select_project}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_building}</label>
              <select className={inputCls()} value={selBuilding} onChange={e => setSelBuilding(e.target.value)} disabled={!selProject}>
                <option value="">{t.lbl_select_building}</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_floor}</label>
              <select className={inputCls()} value={selFloor} onChange={e => setSelFloor(e.target.value)} disabled={!selBuilding}>
                <option value="">{t.lbl_select_floor}</option>
                {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_unit} <span className="text-destructive">*</span></label>
              <select className={inputCls(!!errors.unit_id)} {...register('unit_id', { required: 'Unit is required' })} disabled={!selFloor}>
                <option value="">{t.lbl_select_unit}</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_name || u.unit_number}</option>)}
              </select>
              <FieldError message={errors.unit_id?.message} />
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Tenant Details */}
        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.leasing_section_tenant}</h4>

          {/* Main Tenant */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Users size={12} className="text-white" />
              </div>
              <span className="text-[13px] font-600 text-blue-800">{t.leasing_main_tenant}</span>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_name} <span className="text-destructive">*</span></label>
              <select className={inputCls(!!errors.lessee_person_id)} {...register('lessee_person_id', { required: 'Lessee is required' })}>
                <option value="">{t.lbl_select_unit}</option>
                {persons.filter(p => !coTenants.some(c => c.personId === p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <FieldError message={errors.lessee_person_id?.message} />
            </div>
          </div>

          {/* Co-Tenants */}
          <div className="space-y-2">
            {coTenants.map((co, idx) => (
              <div key={co.id} className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-700">{idx + 1}</div>
                    <span className="text-[12px] font-600 text-indigo-800">{t.leasing_co_tenant} {idx + 1}</span>
                  </div>
                  <button type="button" onClick={() => setCoTenants(prev => prev.filter(c => c.id !== co.id))}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
                    <X size={14} />
                  </button>
                </div>
                <div>
                  <label className={labelCls}>{t.lbl_name} *</label>
                  <select className={inputCls()} value={co.personId}
                    onChange={e => setCoTenants(prev => prev.map(c => c.id === co.id ? { ...c, personId: e.target.value } : c))}>
                    <option value="">{t.lbl_select_unit}</option>
                    {persons.filter(p =>
                      p.id !== watchedLesseeId &&
                      (p.id === co.personId || !coTenants.some(c => c.id !== co.id && c.personId === p.id))
                    ).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <button type="button"
              onClick={() => setCoTenants(prev => [...prev, newCoTenant()])}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-500 text-primary border border-dashed border-primary/40 rounded-xl hover:bg-primary/5 transition-colors">
              <Plus size={13} /> {t.leasing_add_co_tenant}
            </button>
          </div>
        </div>

        <hr className="border-border" />

        {/* Lease Dates */}
        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.leasing_section_period}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date <span className="text-destructive">*</span></label>
              <input type="date" className={inputCls(!!errors.start_date)} {...register('start_date', { required: 'Start date is required' })} />
              <FieldError message={errors.start_date?.message} />
            </div>
            <div>
              <label className={labelCls}>End Date <span className="text-destructive">*</span></label>
              <input type="date" className={inputCls(!!errors.end_date)} {...register('end_date', {
                required: 'End date is required',
                validate: v => !watchedStartDate || v > watchedStartDate || 'End date must be after start date'
              })} />
              <FieldError message={errors.end_date?.message} />
            </div>
          </div>
          {leaseDurationYears > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">{t.leasing_lease_duration}: {leaseDurationYears.toFixed(1)} years</p>
          )}
        </div>

        <hr className="border-border" />

        {/* Financial Terms */}
        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.leasing_section_financial}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.leasing_lease_amount} <span className="text-destructive">*</span></label>
              <input type="number" step="0.01" className={inputCls(!!errors.rent_amount)}
                {...register('rent_amount', { required: 'Lease amount is required', min: { value: 1, message: 'Must be > 0' }, valueAsNumber: true })} />
              <FieldError message={errors.rent_amount?.message} />
            </div>
            <div>
              <label className={labelCls}>{t.lbl_payment_term}</label>
              <select className={inputCls()} {...register('payment_terms')}>
                {paymentTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_security_deposit}</label>
              <input type="number" step="0.01" className={inputCls()} defaultValue={0}
                {...register('security_deposit', { min: { value: 0, message: 'Cannot be negative' }, valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelCls}>{t.leasing_sd_payment_term}</label>
              <select className={inputCls()} {...register('sd_payment_term')}>
                {paymentTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.leasing_turnover_rent}</label>
              <input type="number" step="0.01" className={inputCls()} defaultValue={0}
                {...register('turnover_rent_pct', { min: 0, max: 100, valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelCls}>{t.leasing_to_payment_term}</label>
              <select className={inputCls()} {...register('turnover_payment_term')}>
                {paymentTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.leasing_amc}</label>
              <input type="number" step="0.01" className={inputCls()} defaultValue={0}
                {...register('amc_amount', { min: 0, valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelCls}>{t.leasing_amc_payment_term}</label>
              <select className={inputCls()} {...register('amc_payment_term')}>
                {paymentTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {showAnnualIncrement && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <label className={`${labelCls} text-primary`}>{t.leasing_annual_increment} <span className="text-[10px] text-muted-foreground font-400">({t.leasing_annual_increment_note})</span></label>
              <input type="number" step="0.01" min={0} max={100} className={inputCls()}
                {...register('annual_increment_pct', { min: 0, max: 100, valueAsNumber: true })} />
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>{t.lbl_notes}</label>
          <textarea rows={2} className={`${inputCls()} resize-none`} {...register('notes')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => { reset(); setSelProject(''); setSelBuilding(''); setSelFloor(''); setCoTenants([]); onClose(); }}
            className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_cancel}</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? t.btn_saving : t.leasing_create_btn}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Lease Modal (draft only) ────────────────────────────────────────────
function EditLeaseModal({ lease, open, onClose, onSaved }: { lease: Lease | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const { paymentTermOptions, getPaymentTermLabel } = usePaymentTerms();
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selProject, setSelProject] = useState('');
  const [selBuilding, setSelBuilding] = useState('');
  const [selFloor, setSelFloor] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<LeaseFormValues>();
  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');
  const leaseDurationYears = watchedStartDate && watchedEndDate
    ? (new Date(watchedEndDate).getTime() - new Date(watchedStartDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    : 0;
  const showAnnualIncrement = leaseDurationYears > 1;

  useEffect(() => {
    if (!open || !lease) return;
    setSaveError('');
    Promise.all([
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('persons').select('id, name').order('name'),
    ]).then(([pRes, perRes]) => {
      let projectList = pRes.data || [];
      if (assignedProjectIds !== null && assignedProjectIds.length >= 0) {
        projectList = projectList.filter((p: any) => assignedProjectIds.includes(p.id));
      }
      setProjects(projectList);
      setPersons(perRes.data || []);
    });

    // Pre-populate form from lease
    reset({
      unit_id: lease.unit_id,
      lessee_person_id: lease.lessee_person_id || '',
      start_date: lease.start_date,
      end_date: lease.end_date,
      rent_amount: lease.rent_amount,
      payment_terms: lease.payment_terms,
      security_deposit: lease.security_deposit,
      sd_payment_term: (lease as any).sd_payment_term || 'immediately',
      turnover_rent_pct: lease.turnover_rent_pct,
      turnover_payment_term: (lease as any).turnover_payment_term || 'monthly',
      amc_amount: lease.amc_amount,
      amc_payment_term: lease.amc_payment_term,
      annual_increment_pct: lease.annual_increment_pct,
      notes: (lease as any).notes || '',
    });

    // Resolve project/building/floor from unit hierarchy
    const projectId = lease.units?.floors?.buildings?.projects?.name
      ? undefined
      : undefined;
    // Load hierarchy from unit
    supabase.from('units').select('id, floor_id, floors(id, building_id, buildings(id, project_id))').eq('id', lease.unit_id).maybeSingle().then(({ data }) => {
      if (!data) return;
      const floor = (data as any).floors;
      const building = floor?.buildings;
      if (building?.project_id) {
        setSelProject(building.project_id);
        supabase.from('buildings').select('id, name, project_id').eq('project_id', building.project_id).order('name').then(({ data: bData }) => {
          setBuildings(bData || []);
          setSelBuilding(building.id);
          supabase.from('floors').select('id, name, building_id').eq('building_id', building.id).order('name').then(({ data: fData }) => {
            setFloors(fData || []);
            setSelFloor(floor.id);
            supabase.from('units').select('id, unit_number, unit_name, floor_id').eq('floor_id', floor.id).order('unit_number').then(({ data: uData }) => {
              setUnits(uData || []);
              setValue('unit_id', lease.unit_id);
            });
          });
        });
      }
    });
  }, [open, lease]);

  useEffect(() => {
    if (!selProject || !open) return;
    supabase.from('buildings').select('id, name, project_id').eq('project_id', selProject).order('name').then(({ data }) => setBuildings(data || []));
  }, [selProject]);

  useEffect(() => {
    if (!selBuilding || !open) return;
    supabase.from('floors').select('id, name, building_id').eq('building_id', selBuilding).order('name').then(({ data }) => setFloors(data || []));
  }, [selBuilding]);

  useEffect(() => {
    if (!selFloor || !open) return;
    supabase.from('units').select('id, unit_number, unit_name, floor_id').eq('floor_id', selFloor).order('unit_number').then(({ data }) => setUnits(data || []));
  }, [selFloor]);

  const onSubmit = async (values: LeaseFormValues) => {
    if (!lease) return;
    setSaving(true);
    setSaveError('');
    const updatePayload = {
      unit_id: values.unit_id,
      lessee_person_id: values.lessee_person_id,
      start_date: values.start_date,
      end_date: values.end_date,
      payment_terms: values.payment_terms,
      sd_payment_term: values.sd_payment_term,
      turnover_payment_term: values.turnover_payment_term,
      amc_payment_term: values.amc_payment_term,
      notes: values.notes,
      rent_amount: Number(values.rent_amount),
      security_deposit: Number(values.security_deposit),
      annual_increment_pct: Number(values.annual_increment_pct),
      turnover_rent_pct: Number(values.turnover_rent_pct),
      amc_amount: Number(values.amc_amount),
    };
    const { error } = await supabase.from('leases').update(updatePayload).eq('id', lease.id);
    if (error) { setSaveError(error.message); setSaving(false); return; }

    await logAuditEvent({
      entityType: 'lease',
      entityId: lease.id,
      entityLabel: lease.lease_number || lease.id,
      action: 'updated',
      beforeValues: { status: 'draft' },
      afterValues: updatePayload,
    });

    setSaving(false);
    onSaved();
    onClose();
  };

  if (!lease) return null;

  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 text-[13px] bg-background border rounded-lg outline-none focus:ring-2 transition-all ${hasError ? 'border-destructive focus:border-destructive focus:ring-destructive/15' : 'border-border focus:border-primary focus:ring-primary/15'}`;
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  return (
    <Modal open={open} onClose={onClose} title={`Edit Draft Lease — ${lease.lease_number || 'Draft'}`} subtitle="Update lease details. Only draft leases can be edited." size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
        {saveError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {saveError}</div>}

        {/* Property Selection */}
        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.leasing_section_property}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.lbl_project}</label>
              <select className={inputCls()} value={selProject} onChange={e => { setSelProject(e.target.value); setSelBuilding(''); setSelFloor(''); }}>
                <option value="">{t.lbl_select_project}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_building}</label>
              <select className={inputCls()} value={selBuilding} onChange={e => { setSelBuilding(e.target.value); setSelFloor(''); }} disabled={!selProject}>
                <option value="">{t.lbl_select_building}</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_floor}</label>
              <select className={inputCls()} value={selFloor} onChange={e => setSelFloor(e.target.value)} disabled={!selBuilding}>
                <option value="">{t.lbl_select_floor}</option>
                {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_unit} <span className="text-destructive">*</span></label>
              <select className={inputCls(!!errors.unit_id)} {...register('unit_id', { required: 'Unit is required' })} disabled={!selFloor}>
                <option value="">{t.lbl_select_unit}</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_name || u.unit_number}</option>)}
              </select>
              <FieldError message={errors.unit_id?.message} />
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Tenant */}
        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.leasing_section_tenant}</h4>
          <div>
            <label className={labelCls}>{t.lbl_name} <span className="text-destructive">*</span></label>
            <select className={inputCls(!!errors.lessee_person_id)} {...register('lessee_person_id', { required: 'Lessee is required' })}>
              <option value="">Select lessee</option>
              {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldError message={errors.lessee_person_id?.message} />
          </div>
        </div>

        <hr className="border-border" />

        {/* Dates */}
        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.leasing_section_period}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date <span className="text-destructive">*</span></label>
              <input type="date" className={inputCls(!!errors.start_date)} {...register('start_date', { required: 'Start date is required' })} />
              <FieldError message={errors.start_date?.message} />
            </div>
            <div>
              <label className={labelCls}>End Date <span className="text-destructive">*</span></label>
              <input type="date" className={inputCls(!!errors.end_date)} {...register('end_date', {
                required: 'End date is required',
                validate: v => !watchedStartDate || v > watchedStartDate || 'End date must be after start date'
              })} />
              <FieldError message={errors.end_date?.message} />
            </div>
          </div>
          {leaseDurationYears > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">{t.leasing_lease_duration}: {leaseDurationYears.toFixed(1)} years</p>
          )}
        </div>

        <hr className="border-border" />

        {/* Financial Terms */}
        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.leasing_section_financial}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.leasing_lease_amount} <span className="text-destructive">*</span></label>
              <input type="number" step="0.01" className={inputCls(!!errors.rent_amount)}
                {...register('rent_amount', { required: 'Lease amount is required', min: { value: 1, message: 'Must be > 0' }, valueAsNumber: true })} />
              <FieldError message={errors.rent_amount?.message} />
            </div>
            <div>
              <label className={labelCls}>{t.lbl_payment_term}</label>
              <select className={inputCls()} {...register('payment_terms')}>
                {paymentTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_security_deposit}</label>
              <input type="number" step="0.01" className={inputCls()}
                {...register('security_deposit', { min: { value: 0, message: 'Cannot be negative' }, valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelCls}>{t.leasing_sd_payment_term}</label>
              <select className={inputCls()} {...register('sd_payment_term')}>
                {paymentTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.leasing_turnover_rent}</label>
              <input type="number" step="0.01" className={inputCls()} {...register('turnover_rent_pct', { min: 0, max: 100, valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelCls}>{t.leasing_to_payment_term}</label>
              <select className={inputCls()} {...register('turnover_payment_term')}>
                {paymentTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.leasing_amc}</label>
              <input type="number" step="0.01" className={inputCls()} {...register('amc_amount', { min: 0, valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelCls}>{t.leasing_amc_payment_term}</label>
              <select className={inputCls()} {...register('amc_payment_term')}>
                {paymentTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {showAnnualIncrement && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <label className={`${labelCls} text-primary`}>{t.leasing_annual_increment}</label>
              <input type="number" step="0.01" min={0} max={100} className={inputCls()}
                {...register('annual_increment_pct', { min: 0, max: 100, valueAsNumber: true })} />
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>{t.lbl_notes}</label>
          <textarea rows={2} className={`${inputCls()} resize-none`} {...register('notes')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_cancel}</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? t.btn_saving : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LeaseDetailModal({ lease, open, onClose, onUpdated }: { lease: Lease | null; open: boolean; onClose: () => void; onUpdated: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { getPaymentTermLabel } = usePaymentTerms();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  if (!lease) return null;

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setUpdateError('');
    const { error } = await supabase.from('leases').update({ status: newStatus }).eq('id', lease.id);
    setUpdating(false);
    if (error) { setUpdateError(error.message); return; }

    const action = newStatus === 'active' ? 'approved' : newStatus === 'terminated' ? 'rejected' : 'updated';
    await logAuditEvent({
      entityType: 'lease',
      entityId: lease.id,
      entityLabel: lease.lease_number || lease.id,
      action,
      beforeValues: { status: lease.status },
      afterValues: { status: newStatus },
    });

    onUpdated();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Lease ${lease.lease_number || '—'}`} subtitle={t.leasing_detail_subtitle} size="md">
      <div className="p-5 space-y-4">
        {updateError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {updateError}</div>}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_unit}</span><p className="font-500 mt-0.5">{lease.units?.unit_name || lease.units?.unit_number || '—'}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_lessee}</span><p className="font-500 mt-0.5">{lease.persons?.name || '—'}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_building}</span><p className="font-500 mt-0.5">{lease.units?.floors?.buildings?.name || '—'}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_floor}</span><p className="font-500 mt-0.5">{lease.units?.floors?.name || '—'}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_annual_rent}</span><p className="font-600 mt-0.5">AED {Number(lease.rent_amount).toLocaleString()}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_security_deposit}</span><p className="font-500 mt-0.5">AED {Number(lease.security_deposit).toLocaleString()}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_period}</span><p className="font-500 mt-0.5 text-[12px]">{lease.start_date} → {lease.end_date}</p></div>
                    <div><span className="text-muted-foreground text-[12px]">{t.lbl_payment_term}</span><p className="font-500 mt-0.5">{getPaymentTermLabel(lease.payment_terms)}</p></div>
          {lease.annual_increment_pct > 0 && <div><span className="text-muted-foreground text-[12px]">{t.leasing_annual_increment}</span><p className="font-500 mt-0.5">{lease.annual_increment_pct}%</p></div>}
          {lease.turnover_rent_pct > 0 && <div><span className="text-muted-foreground text-[12px]">{t.leasing_turnover_rent}</span><p className="font-500 mt-0.5">{lease.turnover_rent_pct}%</p></div>}
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_status}</span>
            <div className="mt-1"><Badge variant={statusColors[lease.status] as any || 'default'} size="sm">{lease.status}</Badge></div>
          </div>
        </div>
        <hr className="border-border" />
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider">{t.leasing_download_contract}</p>
          <button onClick={() => generateLeasePDF(lease)} className="flex items-center gap-2 px-3 py-2 text-[12px] font-500 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
            <Download size={13} /> {t.btn_download_pdf}
          </button>
        </div>
        <hr className="border-border" />
        <div>
          <p className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-2">{t.leasing_update_status}</p>
          <div className="flex flex-wrap gap-2">
            {leaseStatuses.filter(s => s !== lease.status).map(s => (
              <button key={s} onClick={() => updateStatus(s)} disabled={updating}
                className="px-3 py-1.5 text-[12px] font-500 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 transition-all capitalize">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function LeasingClient() {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds, authLoading } = useAuth();
  const { getPaymentTermLabel } = usePaymentTerms();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);

  const fetchLeases = useCallback(async () => {
    // Wait for auth context to finish loading before fetching
    if (authLoading) return;

    setLoading(true);
    setFetchError('');

    // If staff user with no assigned projects, show nothing
    if (assignedProjectIds !== null && assignedProjectIds.length === 0) {
      setLeases([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('leases')
      .select(`*, units(unit_number, unit_name, floors(name, buildings(name, project_id, projects(name, id)))), persons(name)`)
      .order('created_at', { ascending: false });

    if (error) setFetchError(error.message);

    let leaseList = data || [];

    // Filter by assigned projects for staff users
    if (assignedProjectIds !== null && assignedProjectIds.length > 0) {
      leaseList = leaseList.filter((l: any) => {
        const projectId = l.units?.floors?.buildings?.project_id;
        return projectId && assignedProjectIds.includes(projectId);
      });
    }

    setLeases(leaseList);
    setLoading(false);
  }, [assignedProjectIds, authLoading]);

  // Refetch when navigating back to this page
  useAutoRefresh('leases', fetchLeases);

  useEffect(() => {
    fetchLeases();
    const channel = supabase.channel('leases-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, () => fetchLeases())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeases]);

  const filtered = leases.filter(l => {
    const matchSearch = !search ||
      l.lease_number?.toLowerCase().includes(search.toLowerCase()) ||
      l.units?.unit_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.units?.unit_number?.toLowerCase().includes(search.toLowerCase()) ||
      l.persons?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statuses = ['all', 'active', 'draft', 'expired', 'terminated', 'renewed'];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.leasing_title}</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.leasing_subtitle}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all shrink-0">
          <Plus size={14} /> <span className="hidden sm:inline">{t.leasing_new_lease}</span><span className="sm:hidden">New</span>
        </button>
      </div>

      {fetchError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive">
          <X size={14} className="shrink-0" /> {fetchError}
          <button onClick={fetchLeases} className="ml-auto text-[12px] underline">{t.btn_retry}</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder={t.leasing_search_placeholder} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
          </div>
          <button onClick={fetchLeases} className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all shrink-0">
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-muted-foreground" />
          {statuses.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2 sm:px-2.5 py-1 text-[11px] font-500 rounded-lg border transition-all ${filterStatus === s ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {(['active', 'pending', 'expired', 'terminated'] as const).map(s => (
          <div key={s} className="bg-white rounded-xl border border-border shadow-card p-3 sm:p-4">
            <p className="text-[10px] sm:text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{s}</p>
            <p className="text-[20px] sm:text-[24px] font-700 text-foreground mt-1">{leases.filter(l => l.status === s).length}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6"><LoadingSkeleton rows={6} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title={t.leasing_empty_title} description={t.leasing_empty_desc} action={{ label: t.leasing_new_lease, onClick: () => setShowAdd(true) }} />
        ) : (
          <>
            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map(lease => (
                <div key={lease.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-600 text-primary">{lease.lease_number || '—'}</span>
                    <Badge variant={statusColors[lease.status] as any || 'default'} size="sm">{lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-500">{lease.units?.unit_name || lease.units?.unit_number || '—'}</span>
                    <span className="font-600 tabular-nums">AED {Number(lease.rent_amount).toLocaleString()}</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    <span>{lease.persons?.name || '—'}</span>
                    <span className="mx-1.5">·</span>
                    <span>{lease.units?.floors?.buildings?.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{lease.start_date} → {lease.end_date}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedLease(lease)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                      {lease.status === 'draft' && (
                        <button onClick={() => setEditingLease(lease)} className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors"><Edit2 size={14} /></button>
                      )}
                      <button onClick={() => generateLeasePDF(lease)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"><Download size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-[13px] min-w-[900px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    {[t.leasing_col_lease_no, t.leasing_col_unit, t.leasing_col_building_floor, t.leasing_col_lessee, t.leasing_col_annual_rent, t.leasing_col_sd, t.leasing_col_payment_term, t.leasing_col_period, t.leasing_col_status, t.leasing_col_actions].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(lease => (
                    <tr key={lease.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[12px] text-primary font-600">{lease.lease_number || '—'}</td>
                      <td className="px-4 py-3 font-500">{lease.units?.unit_name || lease.units?.unit_number || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-[12px]">
                        <div>{lease.units?.floors?.buildings?.name || '—'}</div>
                        <div className="text-[11px]">{lease.units?.floors?.name || ''}</div>
                      </td>
                      <td className="px-4 py-3">{lease.persons?.name || '—'}</td>
                      <td className="px-4 py-3 font-600 tabular-nums">AED {Number(lease.rent_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">AED {Number(lease.security_deposit).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-[12px]">{getPaymentTermLabel(lease.payment_terms)}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{lease.start_date} → {lease.end_date}</td>
                      <td className="px-4 py-3"><Badge variant={statusColors[lease.status] as any || 'default'} size="sm">{lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedLease(lease)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={t.btn_view}><Eye size={14} /></button>
                          {lease.status === 'draft' && (
                            <button onClick={() => setEditingLease(lease)} className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors" title="Edit draft lease"><Edit2 size={14} /></button>
                          )}
                          <button onClick={() => generateLeasePDF(lease)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title={t.btn_download_pdf}><Download size={14} /></button>
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

      <AddLeaseModal open={showAdd} onClose={() => setShowAdd(false)} onSaved={fetchLeases} />
      <LeaseDetailModal lease={selectedLease} open={!!selectedLease} onClose={() => setSelectedLease(null)} onUpdated={fetchLeases} />
      <EditLeaseModal lease={editingLease} open={!!editingLease} onClose={() => setEditingLease(null)} onSaved={fetchLeases} />
    </div>
  );
}
