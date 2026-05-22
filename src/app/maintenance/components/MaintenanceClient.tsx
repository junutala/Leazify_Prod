'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Wrench, Plus, Search, Filter, RefreshCw, AlertTriangle, X, Eye, Camera, Upload, DollarSign, CheckCircle, MessageSquare } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useForm } from 'react-hook-form';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoRefresh } from '@/contexts/DataRefreshContext';

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  skill_type: string;
  priority: string;
  status: string;
  payer: string;
  charge_amount?: number;
  charge_submitted?: boolean;
  created_at: string;
  units?: { unit_name: string; unit_number: string };
  service_providers?: { name: string };
}

interface MaintenanceRequest {
  id: string;
  area_description: string;
  description: string;
  skill_type: string;
  status: string;
  payer: string;
  charge_amount?: number;
  charge_submitted?: boolean;
  created_at: string;
  projects?: { name: string };
  buildings?: { name: string };
  floors?: { name: string };
  service_providers?: { name: string };
}

const skillTypes = ['electrical', 'mechanical', 'painting', 'plumbing', 'cleaning'];
const requestStatuses = ['open', 'in_progress', 'completed', 'closed', 'cancelled'];
const statusColors: Record<string, string> = { open: 'warning', in_progress: 'info', completed: 'success', closed: 'default', cancelled: 'error' };

interface SRFormValues { unit_id: string; skill_type: string; provider_id: string; title: string; description: string; priority: string; }
interface MRFormValues { project_id: string; building_id: string; floor_id: string; area_description: string; skill_type: string; provider_id: string; description: string; }

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><X size={10} className="shrink-0" />{message}</p>;
}

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

function AddSRModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selProject, setSelProject] = useState('');
  const [selBuilding, setSelBuilding] = useState('');
  const [selFloor, setSelFloor] = useState('');
  const [selSkill, setSelSkill] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SRFormValues>({ defaultValues: { priority: 'medium' } });

  useEffect(() => {
    if (!open) return;
    setSaveError('');
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      let projectList = data || [];
      if (assignedProjectIds !== null && assignedProjectIds.length >= 0) {
        projectList = projectList.filter((p: any) => assignedProjectIds.includes(p.id));
      }
      setProjects(projectList);
    });
  }, [open, assignedProjectIds]);

  useEffect(() => {
    if (!selProject) { setBuildings([]); setFloors([]); setUnits([]); return; }
    supabase.from('buildings').select('id, name').eq('project_id', selProject).order('name').then(({ data }) => setBuildings(data || []));
    setFloors([]); setUnits([]);
  }, [selProject]);

  useEffect(() => {
    if (!selBuilding) { setFloors([]); setUnits([]); return; }
    supabase.from('floors').select('id, name').eq('building_id', selBuilding).order('name').then(({ data }) => setFloors(data || []));
    setUnits([]);
  }, [selBuilding]);

  useEffect(() => {
    if (!selFloor) { setUnits([]); return; }
    supabase.from('units').select('id, unit_number, unit_name').eq('floor_id', selFloor).order('unit_number').then(({ data }) => setUnits(data || []));
  }, [selFloor]);

  useEffect(() => {
    if (!selSkill) { setProviders([]); return; }
    supabase.from('service_providers').select('id, name').eq('skill_type', selSkill).eq('is_active', true).order('name').then(({ data }) => setProviders(data || []));
  }, [selSkill]);

  const onSubmit = async (values: SRFormValues) => {
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from('service_requests').insert({
      ...values,
      unit_id: values.unit_id || null,
      provider_id: values.provider_id || null,
      payer: 'tenant', status: 'open', is_common_area: false, image_urls: images,
    });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    reset(); setSelProject(''); setSelBuilding(''); setSelFloor(''); setSelSkill(''); setImages([]);
    onSaved(); onClose();
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 text-[13px] bg-background border rounded-lg outline-none focus:ring-2 transition-all ${hasError ? 'border-destructive focus:border-destructive focus:ring-destructive/15' : 'border-border focus:border-primary focus:ring-primary/15'}`;
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  return (
    <Modal open={open} onClose={() => { reset(); setImages([]); onClose(); }} title={t.maint_sr_modal_title} subtitle={t.maint_sr_modal_subtitle} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {saveError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive"><X size={13} className="shrink-0" /> {saveError}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>{t.lbl_project}</label>
            <select className={inputCls()} value={selProject} onChange={e => setSelProject(e.target.value)}>
              <option value="">{t.lbl_select_project}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className={labelCls}>{t.lbl_building}</label>
            <select className={inputCls()} value={selBuilding} onChange={e => setSelBuilding(e.target.value)} disabled={!selProject}>
              <option value="">{t.lbl_select_building}</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>
          <div><label className={labelCls}>{t.lbl_floor}</label>
            <select className={inputCls()} value={selFloor} onChange={e => setSelFloor(e.target.value)} disabled={!selBuilding}>
              <option value="">{t.lbl_select_floor}</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>{t.lbl_unit} <span className="text-destructive">*</span></label>
            <select className={inputCls(!!errors.unit_id)} {...register('unit_id', { required: 'Unit is required' })} disabled={!selFloor}>
              <option value="">{t.lbl_select_unit}</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unit_name || u.unit_number}</option>)}
            </select>
            <FieldError message={errors.unit_id?.message} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>{t.lbl_skill_type} <span className="text-destructive">*</span></label>
            <select className={inputCls(!!errors.skill_type)}
              {...register('skill_type', { required: 'Skill type is required' })}
              onChange={e => setSelSkill(e.target.value)}>
              <option value="">{t.lbl_select_skill}</option>
              {skillTypes.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <FieldError message={errors.skill_type?.message} />
          </div>
          <div><label className={labelCls}>{t.lbl_priority}</label>
            <select className={inputCls()} {...register('priority')}>
              {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className={labelCls}>{t.lbl_provider}</label>
            <select className={inputCls()} {...register('provider_id')}>
              <option value="">{t.lbl_select_provider}</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
        </div>
        <div><label className={labelCls}>{t.maint_title_label} <span className="text-destructive">*</span></label>
          <input className={inputCls(!!errors.title)}
            {...register('title', {
              required: 'Title is required',
              minLength: { value: 5, message: 'Title must be at least 5 characters' },
              maxLength: { value: 200, message: 'Title cannot exceed 200 characters' },
            })}
            placeholder={t.maint_title_placeholder} />
          <FieldError message={errors.title?.message} />
        </div>
        <div><label className={labelCls}>{t.lbl_description}</label>
          <textarea rows={3} className={`${inputCls(!!errors.description)} resize-none`}
            {...register('description', {
              maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' },
            })}
            placeholder={t.maint_desc_placeholder} />
          <FieldError message={errors.description?.message} />
        </div>

        {/* Image Upload */}
        <ImageUpload images={images} onChange={setImages} maxImages={5} />

        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
          <p className="text-[12px] text-amber-700">{t.maint_tenant_paid_note}</p>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={() => { reset(); setImages([]); onClose(); }} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_cancel}</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? t.btn_submitting : t.btn_submit}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddMRModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selProject, setSelProject] = useState('');
  const [selBuilding, setSelBuilding] = useState('');
  const [selSkill, setSelSkill] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MRFormValues>();

  useEffect(() => {
    if (!open) return;
    setSaveError('');
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      let projectList = data || [];
      if (assignedProjectIds !== null && assignedProjectIds.length >= 0) {
        projectList = projectList.filter((p: any) => assignedProjectIds.includes(p.id));
      }
      setProjects(projectList);
    });
  }, [open, assignedProjectIds]);

  useEffect(() => {
    if (!selProject) { setBuildings([]); setFloors([]); return; }
    supabase.from('buildings').select('id, name').eq('project_id', selProject).order('name').then(({ data }) => setBuildings(data || []));
    setFloors([]);
  }, [selProject]);

  useEffect(() => {
    if (!selBuilding) { setFloors([]); return; }
    supabase.from('floors').select('id, name').eq('building_id', selBuilding).order('name').then(({ data }) => setFloors(data || []));
  }, [selBuilding]);

  useEffect(() => {
    if (!selSkill) { setProviders([]); return; }
    supabase.from('service_providers').select('id, name').eq('skill_type', selSkill).eq('is_active', true).order('name').then(({ data }) => setProviders(data || []));
  }, [selSkill]);

  const onSubmit = async (values: MRFormValues) => {
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from('maintenance_requests').insert({
      ...values,
      project_id: values.project_id || null,
      building_id: values.building_id || null,
      floor_id: values.floor_id || null,
      provider_id: values.provider_id || null,
      payer: 'landlord', status: 'open', image_urls: images,
    });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    reset(); setSelProject(''); setSelBuilding(''); setSelSkill(''); setImages([]);
    onSaved(); onClose();
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 text-[13px] bg-background border rounded-lg outline-none focus:ring-2 transition-all ${hasError ? 'border-destructive focus:border-destructive focus:ring-destructive/15' : 'border-border focus:border-primary focus:ring-primary/15'}`;
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  return (
    <Modal open={open} onClose={() => { reset(); setImages([]); onClose(); }} title={t.maint_mr_modal_title} subtitle={t.maint_mr_modal_subtitle} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {saveError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {saveError}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>{t.lbl_project} <span className="text-destructive">*</span></label>
            <select className={inputCls(!!errors.project_id)}
              {...register('project_id', { required: 'Project is required' })}
              onChange={e => setSelProject(e.target.value)}>
              <option value="">{t.lbl_select_project}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldError message={errors.project_id?.message} />
          </div>
          <div><label className={labelCls}>{t.lbl_building}</label>
            <select className={inputCls()} {...register('building_id')} onChange={e => setSelBuilding(e.target.value)} disabled={!selProject}>
              <option value="">{t.lbl_select_building}</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>{t.lbl_floor}</label>
            <select className={inputCls()} {...register('floor_id')} disabled={!selBuilding}>
              <option value="">{t.lbl_select_floor}</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>{t.maint_area_desc}</label>
            <input className={inputCls()}
              {...register('area_description')}
              placeholder="e.g. Lobby, Corridor B" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>{t.lbl_skill_type} <span className="text-destructive">*</span></label>
            <select className={inputCls(!!errors.skill_type)}
              {...register('skill_type', { required: 'Skill type is required' })}
              onChange={e => setSelSkill(e.target.value)}>
              <option value="">{t.lbl_select_skill}</option>
              {skillTypes.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <FieldError message={errors.skill_type?.message} />
          </div>
          <div><label className={labelCls}>{t.lbl_provider}</label>
            <select className={inputCls()} {...register('provider_id')}>
              <option value="">{t.lbl_select_provider}</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div><label className={labelCls}>{t.lbl_description} <span className="text-destructive">*</span></label>
          <textarea rows={3} className={`${inputCls(!!errors.description)} resize-none`}
            {...register('description', {
              required: 'Description is required',
              minLength: { value: 10, message: 'Min 10 characters' },
              maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' },
            })}
            placeholder={t.maint_desc_mr_placeholder} />
          <FieldError message={errors.description?.message} />
        </div>

        {/* Image Upload */}
        <ImageUpload images={images} onChange={setImages} maxImages={5} />

        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertTriangle size={14} className="text-blue-600 shrink-0" />
          <p className="text-[12px] text-blue-700">{t.maint_landlord_paid_note}</p>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={() => { reset(); setImages([]); onClose(); }} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_cancel}</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? t.btn_submitting : t.btn_submit}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UpdateStatusModal({ type, record, open, onClose, onUpdated }: {
  type: 'service' | 'maintenance'; record: any; open: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [submittingCharge, setSubmittingCharge] = useState(false);

  if (!record) return null;

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setUpdateError('');
    const table = type === 'service' ? 'service_requests' : 'maintenance_requests';
    const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', record.id);
    setUpdating(false);
    if (error) { setUpdateError(error.message); return; }
    onUpdated(); onClose();
  };

  const submitCharge = async () => {
    if (!chargeAmount) return;
    setSubmittingCharge(true);
    const table = type === 'service' ? 'service_requests' : 'maintenance_requests';
    const { error } = await supabase.from(table).update({ charge_amount: Number(chargeAmount), charge_submitted: true, status: 'in_progress' }).eq('id', record.id);
    setSubmittingCharge(false);
    if (error) { setUpdateError(error.message); return; }
    onUpdated(); onClose();
  };

  const title = type === 'service' ? record.title : record.description?.slice(0, 60);

  return (
    <Modal open={open} onClose={onClose} title={t.maint_update_title} subtitle={title} size="sm">
      <div className="p-5 space-y-4">
        {updateError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {updateError}</div>}

        {/* Images if any */}
        {record.image_urls && record.image_urls.length > 0 && (
          <div>
            <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-2">{t.maint_images}</p>
            <div className="grid grid-cols-5 gap-1">
              {record.image_urls.map((img: string, i: number) => (
                <img key={i} src={img} alt={`Image ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-border" />
              ))}
            </div>
          </div>
        )}

        {/* Service Provider Charge Submission */}
        {record.service_providers && (
          <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
            <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{t.maint_provider_charges}</p>
            {record.charge_submitted ? (
              <div className="flex items-center gap-2 text-[12px] text-green-700">
                <CheckCircle size={13} /> {t.maint_charge_submitted}: AED {Number(record.charge_amount || 0).toLocaleString()}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="number" step="0.01" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)}
                  placeholder={t.maint_enter_charge} className="flex-1 px-3 py-1.5 text-[12px] border border-border rounded-lg outline-none focus:border-primary" />
                <button onClick={submitCharge} disabled={submittingCharge || !chargeAmount}
                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  <DollarSign size={12} /> {t.btn_submit}
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-[12px] text-muted-foreground mb-2">{t.maint_current_status} <Badge variant={statusColors[record.status] as any || 'default'} size="sm">{record.status.replace('_', ' ')}</Badge></p>
          <div className="flex flex-col gap-2">
            {requestStatuses.filter(s => s !== record.status).map(s => (
              <button key={s} onClick={() => updateStatus(s)} disabled={updating}
                className="w-full px-4 py-2.5 text-[13px] font-500 text-left border border-border rounded-lg hover:bg-secondary disabled:opacity-50 transition-all capitalize">
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface QuoteSubmission {
  id: string;
  provider_id: string;
  request_type: string;
  service_request_id: string | null;
  maintenance_request_id: string | null;
  quote_amount: number;
  notes: string | null;
  status: string;
  submitted_at: string;
  service_providers?: { name: string; skills?: string[]; skill_type?: string };
}

function QuotesModal({ requestId, requestType, open, onClose, onApproved }: {
  requestId: string;
  requestType: 'service' | 'maintenance';
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
}) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [quotes, setQuotes] = useState<QuoteSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !requestId) return;
    setLoading(true);
    setError('');
    const column = requestType === 'service' ? 'service_request_id' : 'maintenance_request_id';
    supabase
      .from('quote_submissions')
      .select('*, service_providers(name, skill_type)')
      .eq(column, requestId)
      .order('submitted_at', { ascending: false })
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) { setError(err.message); return; }
        setQuotes(data || []);
      });
  }, [open, requestId, requestType]);

  const approveQuote = async (quote: QuoteSubmission) => {
    const table = requestType === 'service' ? 'service_requests' : 'maintenance_requests';
    const { error: err } = await supabase
      .from(table)
      .update({ provider_id: quote.provider_id, charge_amount: quote.quote_amount, status: 'in_progress' })
      .eq('id', requestId);
    if (err) { setError(err.message); return; }
    await supabase.from('quote_submissions').update({ status: 'approved' }).eq('id', quote.id);
    onApproved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t.maint_quotes_title} subtitle={t.maint_quotes_subtitle} size="sm">
      <div className="p-5 space-y-3">
        {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {error}</div>}
        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : quotes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground text-center py-4">{t.maint_no_quotes}</p>
        ) : (
          <div className="space-y-2">
            {quotes.map(q => (
              <div key={q.id} className="p-3 border border-border rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-500">{q.service_providers?.name || '—'}</span>
                  <span className="text-[13px] font-600 text-primary">AED {Number(q.quote_amount).toLocaleString()}</span>
                </div>
                {q.notes && <p className="text-[12px] text-muted-foreground">{q.notes}</p>}
                <div className="flex items-center justify-between">
                  <Badge variant={q.status === 'approved' ? 'success' : 'default'} size="sm">{q.status}</Badge>
                  {q.status !== 'approved' && (
                    <button onClick={() => approveQuote(q)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                      <CheckCircle size={11} /> {t.maint_approve_quote}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function MaintenanceClient() {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds, authLoading } = useAuth();
  const [tab, setTab] = useState<'service' | 'maintenance'>('service');
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddSR, setShowAddSR] = useState(false);
  const [showAddMR, setShowAddMR] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'service' | 'maintenance'>('service');
  const [quotesRecord, setQuotesRecord] = useState<any>(null);
  const [quotesType, setQuotesType] = useState<'service' | 'maintenance'>('service');

  const fetchData = useCallback(async () => {
    // Wait for auth context to finish loading before fetching
    if (authLoading) return;

    setLoading(true);
    setFetchError('');

    // If staff user with no assigned projects, show nothing
    if (assignedProjectIds !== null && assignedProjectIds.length === 0) {
      setServiceRequests([]);
      setMaintenanceRequests([]);
      setLoading(false);
      return;
    }

    const [srRes, mrRes] = await Promise.all([
      supabase.from('service_requests').select('*, units(unit_name, unit_number, floors(buildings(project_id))), service_providers(name)').order('created_at', { ascending: false }),
      supabase.from('maintenance_requests').select('*, projects(name), buildings(name), floors(name), service_providers(name)').order('created_at', { ascending: false }),
    ]);

    if (srRes.error) setFetchError(srRes.error.message);

    let srList = srRes.data || [];
    let mrList = mrRes.data || [];

    // Filter by assigned projects for staff users
    if (assignedProjectIds !== null && assignedProjectIds.length > 0) {
      srList = srList.filter((r: any) => {
        const projectId = r.units?.floors?.buildings?.project_id;
        return projectId && assignedProjectIds.includes(projectId);
      });
      mrList = mrList.filter((r: any) => {
        return r.project_id && assignedProjectIds.includes(r.project_id);
      });
    }

    setServiceRequests(srList);
    setMaintenanceRequests(mrList);
    setLoading(false);
  }, [assignedProjectIds, authLoading]);

  // Refetch when navigating back to this page
  useAutoRefresh('maintenance', fetchData);

  useEffect(() => {
    fetchData();
    const srChannel = supabase.channel('sr-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => fetchData()).subscribe();
    const mrChannel = supabase.channel('mr-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_requests' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(srChannel); supabase.removeChannel(mrChannel); };
  }, [fetchData]);

  const statuses = ['all', 'open', 'in_progress', 'completed', 'closed', 'cancelled'];

  const filteredSR = serviceRequests.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.units?.unit_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredMR = maintenanceRequests.filter(r => {
    const matchSearch = !search || r.description?.toLowerCase().includes(search.toLowerCase()) || r.projects?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openStatusModal = (record: any, type: 'service' | 'maintenance') => {
    setSelectedRecord(record);
    setSelectedType(type);
  };

  const openQuotesModal = (record: any, type: 'service' | 'maintenance') => {
    setQuotesRecord(record);
    setQuotesType(type);
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.maint_title}</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.maint_subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button onClick={() => setShowAddMR(true)} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 active:scale-95 transition-all">
            <Plus size={14} /> <span className="hidden sm:inline">{t.maint_new_mr}</span><span className="sm:hidden">MR</span>
          </button>
          <button onClick={() => setShowAddSR(true)} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
            <Plus size={14} /> <span className="hidden sm:inline">{t.maint_new_sr}</span><span className="sm:hidden">SR</span>
          </button>
        </div>
      </div>

      {fetchError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive"><X size={14} className="shrink-0" /> {fetchError}<button onClick={fetchData} className="ml-auto text-[12px] underline">{t.btn_retry}</button></div>}

      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
        {(['service', 'maintenance'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-500 rounded-lg transition-all ${tab === tb ? 'bg-white shadow-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tb === 'service' ? `${t.maint_tab_sr} (${serviceRequests.length})` : `${t.maint_tab_mr} (${maintenanceRequests.length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder={t.maint_search_placeholder} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all shrink-0">
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-muted-foreground" />
          {statuses.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2 sm:px-2.5 py-1 text-[11px] font-500 rounded-lg border transition-all ${filterStatus === s ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
              {s === 'all' ? t.lbl_all : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6"><LoadingSkeleton rows={5} /></div>
        ) : tab === 'service' ? (
          filteredSR.length === 0 ? (
            <EmptyState icon={Wrench} title={t.maint_sr_empty_title} description={t.maint_sr_empty_desc} action={{ label: t.maint_new_sr, onClick: () => setShowAddSR(true) }} />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {filteredSR.map(r => (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-500 text-[13px]">{r.units?.unit_name || r.units?.unit_number || '—'}</span>
                      <Badge variant={statusColors[r.status] as any || 'default'} size="sm">{r.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-[13px]">{r.title}</p>
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                      <span className="capitalize">{r.skill_type || '—'} · {r.service_providers?.name || t.lbl_unassigned}</span>
                      <Badge variant={r.priority === 'urgent' ? 'error' : r.priority === 'high' ? 'warning' : 'default'} size="sm">{r.priority}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      <button onClick={() => openStatusModal(r, 'service')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[13px] min-w-[900px]">
                  <thead><tr className="bg-secondary/50 border-b border-border">
                    {[t.maint_col_unit, t.maint_col_title, t.maint_col_skill, t.maint_col_provider, t.maint_col_priority, t.maint_col_status, t.maint_col_quotes, t.maint_col_charge, t.maint_col_date, t.maint_col_actions].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {filteredSR.map(r => (
                      <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-500">{r.units?.unit_name || r.units?.unit_number || '—'}</td>
                        <td className="px-4 py-3">{r.title}</td>
                        <td className="px-4 py-3 capitalize">{r.skill_type || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.service_providers?.name || t.lbl_unassigned}</td>
                        <td className="px-4 py-3"><Badge variant={r.priority === 'urgent' ? 'error' : r.priority === 'high' ? 'warning' : 'default'} size="sm">{r.priority}</Badge></td>
                        <td className="px-4 py-3"><Badge variant={statusColors[r.status] as any || 'default'} size="sm">{r.status.replace('_', ' ')}</Badge></td>
                        <td className="px-4 py-3">
                          {(r as any).quote_status && (r as any).quote_status !== 'none' ? (
                            <button onClick={() => openQuotesModal(r, 'service')} className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-500 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors">
                              <MessageSquare size={10} /> {(r as any).quote_status}
                            </button>
                          ) : (
                            <button onClick={() => openQuotesModal(r, 'service')} className="text-[11px] text-muted-foreground hover:text-primary transition-colors">{t.maint_view_quotes}</button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px]">{(r as any).charge_submitted ? <span className="text-green-600 font-500">AED {Number((r as any).charge_amount || 0).toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-muted-foreground text-[12px]">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openStatusModal(r, 'service')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={t.btn_view}><Eye size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          filteredMR.length === 0 ? (
            <EmptyState icon={Wrench} title={t.maint_mr_empty_title} description={t.maint_mr_empty_desc} action={{ label: t.maint_new_mr, onClick: () => setShowAddMR(true) }} />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {filteredMR.map(r => (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-500 text-[13px]">{r.projects?.name || '—'}</span>
                      <Badge variant={statusColors[r.status] as any || 'default'} size="sm">{r.status.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      <span>{r.buildings?.name || '—'}</span>
                      {r.floors?.name && <span> · {r.floors.name}</span>}
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="capitalize text-muted-foreground">{r.skill_type} · {r.service_providers?.name || t.lbl_unassigned}</span>
                      <button onClick={() => openStatusModal(r, 'maintenance')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[13px] min-w-[900px]">
                  <thead><tr className="bg-secondary/50 border-b border-border">
                    {[t.maint_col_project, t.maint_col_building_floor, t.maint_col_area, t.maint_col_skill, t.maint_col_provider, t.maint_col_status, t.maint_col_quotes, t.maint_col_charge, t.maint_col_date, t.maint_col_actions].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {filteredMR.map(r => (
                      <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-500">{r.projects?.name || '—'}</td>
                        <td className="px-4 py-3 text-[12px]"><div>{r.buildings?.name || '—'}</div><div className="text-muted-foreground">{r.floors?.name || ''}</div></td>
                        <td className="px-4 py-3 text-muted-foreground">{r.area_description || '—'}</td>
                        <td className="px-4 py-3 capitalize">{r.skill_type}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.service_providers?.name || t.lbl_unassigned}</td>
                        <td className="px-4 py-3"><Badge variant={statusColors[r.status] as any || 'default'} size="sm">{r.status.replace('_', ' ')}</Badge></td>
                        <td className="px-4 py-3">
                          {(r as any).quote_status && (r as any).quote_status !== 'none' ? (
                            <button onClick={() => openQuotesModal(r, 'maintenance')} className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-500 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors">
                              <MessageSquare size={10} /> {(r as any).quote_status}
                            </button>
                          ) : (
                            <button onClick={() => openQuotesModal(r, 'maintenance')} className="text-[11px] text-muted-foreground hover:text-primary transition-colors">{t.maint_view_quotes}</button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px]">{(r as any).charge_submitted ? <span className="text-green-600 font-500">AED {Number((r as any).charge_amount || 0).toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-muted-foreground text-[12px]">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openStatusModal(r, 'maintenance')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={t.btn_view}><Eye size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </div>

      <AddSRModal open={showAddSR} onClose={() => setShowAddSR(false)} onSaved={fetchData} />
      <AddMRModal open={showAddMR} onClose={() => setShowAddMR(false)} onSaved={fetchData} />
      <UpdateStatusModal type={selectedType} record={selectedRecord} open={!!selectedRecord} onClose={() => setSelectedRecord(null)} onUpdated={fetchData} />
      <QuotesModal requestId={quotesRecord?.id || ''} requestType={quotesType} open={!!quotesRecord} onClose={() => setQuotesRecord(null)} onApproved={fetchData} />
    </div>
  );
}
