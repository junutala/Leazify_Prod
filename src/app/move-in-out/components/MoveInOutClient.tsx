'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Home, ChevronDown, CheckSquare, Square, AlertCircle, Loader2, Save, LogIn, LogOut, CheckCircle2, Upload, X, Image, Film } from 'lucide-react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HierarchyItem { id: string; name: string; }

interface MoveRecord {
  id: string;
  record_type: 'move_in' | 'move_out';
  unit_id: string;
  [key: string]: any;
}

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

// ─── Checklist field definitions ─────────────────────────────────────────────
const MOVE_IN_SECTIONS = [
  {
    title: 'Documents & Legal',
    fields: [
      { key: 'mi_tenancy_contract_signed', label: 'Signed tenancy contract (Ejari registered in Dubai / Tawtheeq in Abu Dhabi)' },
      { key: 'mi_tenant_id_documents', label: 'Passport copies & visa / Emirates ID of all tenants' },
      { key: 'mi_post_dated_cheques', label: 'Post-dated cheques handed over' },
      { key: 'mi_security_deposit_receipt', label: 'Security Deposit Cheque' },
    ],
  },
  {
    title: 'Utilities & Services',
    fields: [
      { key: 'mi_dewa_account_activated', label: 'DEWA / ADDC / SEWA account activated' },
      { key: 'mi_chiller_account_setup', label: 'Chiller / district cooling account set up' },
      { key: 'mi_internet_tv_arranged', label: 'Internet & TV package arranged' },
      { key: 'mi_building_access_card', label: 'Building access card / parking permit obtained' },
      { key: 'mi_amenity_cards_collected', label: 'Gym, pool & amenity access cards collected' },
    ],
  },
  {
    title: 'Property Inspection',
    fields: [
      { key: 'mi_condition_report_signed', label: 'Full condition report signed by landlord & tenant' },
      { key: 'mi_meter_readings_recorded', label: 'Meter readings recorded (electricity, water, gas)' },
      { key: 'mi_keys_counted_signed', label: 'All keys, fobs & remotes counted and signed for' },
      { key: 'mi_ac_units_tested', label: 'AC units tested (split & central)' },
      { key: 'mi_water_heater_tested', label: 'Water heater & boiler tested' },
      { key: 'mi_appliances_tested', label: 'All appliances tested if furnished' },
      { key: 'mi_pest_mould_check', label: 'Check for pest or mould issues' },
    ],
  },
  {
    title: 'Practical Setup',
    fields: [
      { key: 'mi_move_in_slot_confirmed', label: 'Confirm building move-in slot with management' },
      { key: 'mi_municipality_fees_confirmed', label: 'Municipality fees confirmed' },
      { key: 'mi_renters_insurance_arranged', label: "Renter\'s insurance arranged" },
      { key: 'mi_emergency_contacts_saved', label: 'Emergency maintenance contacts saved (building, AC, plumber)' },
    ],
  },
];

const MOVE_OUT_SECTIONS = [
  {
    title: 'Notice & Legal',
    fields: [
      { key: 'mo_vacating_notice_served', label: 'Written vacating notice served within contract timeline' },
      { key: 'mo_rera_requirements_confirmed', label: 'Confirm RERA / tenancy law notice requirements' },
      { key: 'mo_ejari_cancellation_arranged', label: 'Ejari / Tawtheeq cancellation arranged' },
      { key: 'mo_outstanding_rent_settled', label: 'Outstanding rent / cheques confirmed settled' },
      { key: 'mo_bounced_cheques_resolved', label: 'Any bounced cheque issues resolved before departure', tag: '⚠ Legal' },
    ],
  },
  {
    title: 'Utilities & Services',
    fields: [
      { key: 'mo_dewa_account_closed', label: 'DEWA / ADDC / SEWA account closed & final bill paid' },
      { key: 'mo_chiller_account_closed', label: 'Chiller / district cooling account closed' },
      { key: 'mo_internet_tv_cancelled', label: 'Internet / TV contract cancelled or transferred' },
      { key: 'mo_final_meter_readings', label: 'Final meter readings photographed on exit day' },
      { key: 'mo_municipality_fee_final', label: 'Municipality & housing fee final payment confirmed' },
    ],
  },
  {
    title: 'Property Handover',
    fields: [
      { key: 'mo_deep_clean_completed', label: 'Full property deep clean completed' },
      { key: 'mo_ac_filter_serviced', label: 'AC filter cleaning & servicing done' },
      { key: 'mo_damage_repaired', label: 'Damage beyond fair wear & tear repaired' },
      { key: 'mo_keys_returned', label: 'All keys, fobs, remotes & access cards returned' },
      { key: 'mo_joint_exit_inspection', label: 'Joint exit inspection conducted with landlord' },
      { key: 'mo_handover_certificate', label: 'Signed handover certificate obtained from landlord' },
      { key: 'mo_pest_control_certificate', label: 'Pest control certificate if required by contract' },
    ],
  },
  {
    title: 'Deposit & Finances',
    fields: [
      { key: 'mo_deposit_refund_agreed', label: 'Security deposit refund timeline agreed in writing' },
      { key: 'mo_itemised_deductions_requested', label: 'Itemised deductions list requested if any deductions made' },
      { key: 'mo_dispute_raised_rera', label: 'Dispute raised via RERA Rental Disputes Centre if needed' },
      { key: 'mo_post_dated_cheques_returned', label: 'Post-dated cheques returned or confirmed cancelled' },
    ],
  },
  {
    title: 'Practical Wrap-Up',
    fields: [
      { key: 'mo_mail_redirect_updated', label: 'Mail redirect / PO Box updated' },
      { key: 'mo_address_updated_employer', label: 'Address updated with employer, bank, insurance' },
      { key: 'mo_vehicle_registration_updated', label: 'Vehicle registration address updated (RTA / traffic dept)' },
      { key: 'mo_school_healthcare_updated', label: 'School / healthcare records updated if applicable' },
      { key: 'mo_move_out_slot_confirmed', label: 'Confirm building move-out slot and lift booking' },
    ],
  },
];

// ─── Date helpers (DD-MM-YYYY) ────────────────────────────────────────────────
function formatDateInput(raw: string): string {
  // Allow only digits and dashes, max 10 chars
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
}

function isValidDate(val: string): boolean {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(val)) return false;
  const [dd, mm, yyyy] = val.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
}

// Convert DD-MM-YYYY → YYYY-MM-DD for DB storage
function toISODate(val: string): string | null {
  if (!isValidDate(val)) return null;
  const [dd, mm, yyyy] = val.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

// Convert YYYY-MM-DD (from DB) → DD-MM-YYYY for display
function fromISODate(val: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const [yyyy, mm, dd] = val.split('T')[0].split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  return val;
}

// ─── Checkbox Row ─────────────────────────────────────────────────────────────
function CheckRow({ fieldKey, label, tag, checked, onChange }: {
  fieldKey: string; label: string; tag?: string; checked: boolean; onChange: (key: string, val: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors group">
      <button
        type="button"
        onClick={() => onChange(fieldKey, !checked)}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-all ${
          checked ? 'bg-primary border-primary text-white' : 'border-border bg-white group-hover:border-primary/50'
        }`}
      >
        {checked ? <CheckSquare size={14} className="text-white" /> : <Square size={14} className="text-transparent" />}
      </button>
      <span className="flex-1 text-[13px] text-foreground leading-snug">{label}</span>
      {tag && (
        <span className={`shrink-0 text-[10px] font-600 px-1.5 py-0.5 rounded-full ${
          tag === '⚠ Legal' ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-700'
        }`}>
          {tag}
        </span>
      )}
    </label>
  );
}

// ─── Section Block ────────────────────────────────────────────────────────────
function CheckSection({ title, fields, formData, onChange }: {
  title: string;
  fields: { key: string; label: string; tag?: string }[];
  formData: Record<string, boolean>;
  onChange: (key: string, val: boolean) => void;
}) {
  const checked = fields.filter(f => formData[f.key]).length;
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
        <h3 className="text-[13px] font-700 text-foreground">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{checked}/{fields.length}</span>
      </div>
      <div className="divide-y divide-border/50 px-1 py-1">
        {fields.map(f => (
          <CheckRow
            key={f.key}
            fieldKey={f.key}
            label={f.label}
            tag={f.tag}
            checked={!!formData[f.key]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Media Upload Component ───────────────────────────────────────────────────
const MAX_IMAGES = 10;
const MAX_VIDEOS = 2;

function MediaUpload({ mediaFiles, onAdd, onRemove }: {
  mediaFiles: MediaFile[];
  onAdd: (files: MediaFile[]) => void;
  onRemove: (index: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCount = mediaFiles.filter(m => m.type === 'image').length;
  const videoCount = mediaFiles.filter(m => m.type === 'video').length;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newMedia: MediaFile[] = [];
    let imgCount = imageCount;
    let vidCount = videoCount;

    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (isImage && imgCount < MAX_IMAGES) {
        newMedia.push({ file, preview: URL.createObjectURL(file), type: 'image' });
        imgCount++;
      } else if (isVideo && vidCount < MAX_VIDEOS) {
        newMedia.push({ file, preview: URL.createObjectURL(file), type: 'video' });
        vidCount++;
      }
    });

    if (newMedia.length > 0) onAdd(newMedia);
  };

  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider">
          Photos &amp; Videos
        </label>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Image size={11} /> {imageCount}/{MAX_IMAGES} images</span>
          <span className="flex items-center gap-1"><Film size={11} /> {videoCount}/{MAX_VIDEOS} videos</span>
        </div>
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <Upload size={20} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-[12px] font-600 text-foreground">Click or drag to upload</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Up to {MAX_IMAGES} images &amp; {MAX_VIDEOS} videos</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Preview grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {mediaFiles.map((m, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
              {m.type === 'image' ? (
                <img src={m.preview} alt={`upload-${i}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <Film size={20} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground truncate px-1 w-full text-center">{m.file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
              <span className={`absolute bottom-1 left-1 text-[9px] font-600 px-1 py-0.5 rounded ${m.type === 'image' ? 'bg-green-600/80 text-white' : 'bg-blue-600/80 text-white'}`}>
                {m.type === 'image' ? 'IMG' : 'VID'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MoveInOutClient() {
  const supabase = createClient();
  const { assignedProjectIds } = useAuth();

  const [projects, setProjects] = useState<HierarchyItem[]>([]);
  const [buildings, setBuildings] = useState<HierarchyItem[]>([]);
  const [floors, setFloors] = useState<HierarchyItem[]>([]);
  const [units, setUnits] = useState<HierarchyItem[]>([]);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [existingRecords, setExistingRecords] = useState<MoveRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [activeMode, setActiveMode] = useState<'move_in' | 'move_out' | null>(null);

  const [formData, setFormData] = useState<Record<string, boolean>>({});
  const [notesValue, setNotesValue] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [dateError, setDateError] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Fetch projects ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      let q = supabase.from('projects').select('id, name').order('name');
      if (assignedProjectIds && assignedProjectIds.length > 0) {
        q = q.in('id', assignedProjectIds);
      }
      const { data } = await q;
      setProjects(data || []);
      setLoadingProjects(false);
    };
    fetchProjects();
  }, [assignedProjectIds]);

  // ── Cascade: buildings ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedProject) { setBuildings([]); setSelectedBuilding(''); return; }
    setLoadingBuildings(true);
    setSelectedBuilding(''); setSelectedFloor(''); setSelectedUnit('');
    setFloors([]); setUnits([]);
    supabase.from('buildings').select('id, name').eq('project_id', selectedProject).order('name')
      .then(({ data }) => { setBuildings(data || []); setLoadingBuildings(false); });
  }, [selectedProject]);

  // ── Cascade: floors ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBuilding) { setFloors([]); setSelectedFloor(''); return; }
    setLoadingFloors(true);
    setSelectedFloor(''); setSelectedUnit('');
    setUnits([]);
    supabase.from('floors').select('id, name').eq('building_id', selectedBuilding).order('name')
      .then(({ data }) => { setFloors(data || []); setLoadingFloors(false); });
  }, [selectedBuilding]);

  // ── Cascade: units ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFloor) { setUnits([]); setSelectedUnit(''); return; }
    setLoadingUnits(true);
    setSelectedUnit('');
    supabase.from('units').select('id, unit_number, unit_name').eq('floor_id', selectedFloor).order('unit_number')
      .then(({ data }) => {
        setUnits((data || []).map((u: any) => ({ id: u.id, name: u.unit_name || u.unit_number })));
        setLoadingUnits(false);
      });
  }, [selectedFloor]);

  // ── Fetch existing records when unit selected ───────────────────────────────
  useEffect(() => {
    if (!selectedUnit) { setExistingRecords([]); setActiveMode(null); return; }
    setLoadingRecords(true);
    supabase.from('move_in_out_records').select('*').eq('unit_id', selectedUnit)
      .then(({ data }) => {
        const records = (data || []) as MoveRecord[];
        setExistingRecords(records);
        const hasMoveIn = records.some(r => r.record_type === 'move_in');
        const hasMoveOut = records.some(r => r.record_type === 'move_out');
        if (!hasMoveIn) setActiveMode('move_in');
        else if (!hasMoveOut) setActiveMode('move_out');
        else setActiveMode(null);
        setLoadingRecords(false);
      });
  }, [selectedUnit]);

  // ── Initialize form when mode changes ──────────────────────────────────────
  useEffect(() => {
    if (!activeMode) { setFormData({}); setNotesValue(''); setDateValue(''); setMediaFiles([]); return; }
    const existing = existingRecords.find(r => r.record_type === activeMode);
    if (existing) {
      const data: Record<string, boolean> = {};
      const sections = activeMode === 'move_in' ? MOVE_IN_SECTIONS : MOVE_OUT_SECTIONS;
      sections.forEach(s => s.fields.forEach(f => { data[f.key] = !!existing[f.key]; }));
      setFormData(data);
      setNotesValue(existing[activeMode === 'move_in' ? 'mi_notes' : 'mo_notes'] || '');
      const rawDate = existing[activeMode === 'move_in' ? 'mi_date' : 'mo_date'] || '';
      setDateValue(fromISODate(rawDate));
    } else {
      setFormData({});
      setNotesValue('');
      setDateValue('');
    }
    setMediaFiles([]);
    setDateError('');
    setSaveError('');
    setSaveSuccess(false);
  }, [activeMode, existingRecords]);

  const handleCheck = (key: string, val: boolean) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleDateChange = (raw: string) => {
    const formatted = formatDateInput(raw);
    setDateValue(formatted);
    if (formatted.length === 10 && !isValidDate(formatted)) {
      setDateError('Please enter a valid date in DD-MM-YYYY format');
    } else {
      setDateError('');
    }
  };

  const handleAddMedia = (files: MediaFile[]) => {
    setMediaFiles(prev => [...prev, ...files]);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedUnit || !activeMode) return;
    if (dateValue && !isValidDate(dateValue)) {
      setDateError('Please enter a valid date in DD-MM-YYYY format');
      return;
    }
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    const { data: { user } } = await supabase.auth.getUser();
    const notesKey = activeMode === 'move_in' ? 'mi_notes' : 'mo_notes';
    const dateKey = activeMode === 'move_in' ? 'mi_date' : 'mo_date';
    const isoDate = dateValue ? toISODate(dateValue) : null;
    const payload: Record<string, any> = {
      record_type: activeMode,
      project_id: selectedProject,
      building_id: selectedBuilding,
      floor_id: selectedFloor,
      unit_id: selectedUnit,
      [notesKey]: notesValue || null,
      [dateKey]: isoDate,
      created_by: user?.id || null,
      updated_at: new Date().toISOString(),
      ...formData,
    };
    const existing = existingRecords.find(r => r.record_type === activeMode);
    let dbError: any;
    if (existing) {
      ({ error: dbError } = await supabase.from('move_in_out_records').update(payload).eq('id', existing.id));
    } else {
      ({ error: dbError } = await supabase.from('move_in_out_records').insert(payload));
    }
    setSaving(false);
    if (dbError) { setSaveError(dbError.message); return; }
    setSaveSuccess(true);
    const { data: refreshed } = await supabase.from('move_in_out_records').select('*').eq('unit_id', selectedUnit);
    setExistingRecords((refreshed || []) as MoveRecord[]);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const selectCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all appearance-none';

  const hasMoveIn = existingRecords.some(r => r.record_type === 'move_in');
  const hasMoveOut = existingRecords.some(r => r.record_type === 'move_out');
  const bothExist = hasMoveIn && hasMoveOut;

  const sections = activeMode === 'move_in' ? MOVE_IN_SECTIONS : MOVE_OUT_SECTIONS;
  const totalFields = sections.reduce((s, sec) => s + sec.fields.length, 0);
  const checkedFields = sections.reduce((s, sec) => s + sec.fields.filter(f => formData[f.key]).length, 0);
  const progress = totalFields > 0 ? Math.round((checkedFields / totalFields) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-800 text-foreground">Move In / Move Out</h1>
        <p className="text-[13px] text-muted-foreground mt-1">GCC tenancy checklist — select a unit to begin</p>
      </div>

      {/* Hierarchy Selectors */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <h2 className="text-[14px] font-700 text-foreground flex items-center gap-2">
          <Building2 size={16} className="text-primary" /> Select Unit
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Project */}
          <div>
            <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1.5">
              Project <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              {loadingProjects ? (
                <div className="h-10 bg-secondary/50 rounded-lg animate-pulse" />
              ) : (
                <select className={selectCls} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                  <option value="">Select project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Building */}
          <div>
            <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1.5">
              Building <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              {loadingBuildings ? (
                <div className="h-10 bg-secondary/50 rounded-lg animate-pulse" />
              ) : (
                <select className={selectCls} value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)} disabled={!selectedProject}>
                  <option value="">Select building…</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Floor */}
          <div>
            <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1.5">
              Floor <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              {loadingFloors ? (
                <div className="h-10 bg-secondary/50 rounded-lg animate-pulse" />
              ) : (
                <select className={selectCls} value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} disabled={!selectedBuilding}>
                  <option value="">Select floor…</option>
                  {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1.5">
              Unit <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              {loadingUnits ? (
                <div className="h-10 bg-secondary/50 rounded-lg animate-pulse" />
              ) : (
                <select className={selectCls} value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} disabled={!selectedFloor}>
                  <option value="">Select unit…</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Unit selected — show mode selection */}
      {selectedUnit && (
        <>
          {loadingRecords ? (
            <LoadingSkeleton rows={2} />
          ) : (
            <>
              {/* Status badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-600 ${hasMoveIn ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                  <LogIn size={13} /> Move In {hasMoveIn ? '✓ Recorded' : '— Not recorded'}
                </span>
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-600 ${hasMoveOut ? 'bg-blue-100 text-blue-700' : 'bg-secondary text-muted-foreground'}`}>
                  <LogOut size={13} /> Move Out {hasMoveOut ? '✓ Recorded' : '— Not recorded'}
                </span>
              </div>

              {bothExist && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                  <div>
                    <p className="text-[13px] font-600 text-green-800">Both Move In and Move Out are recorded for this unit.</p>
                    <p className="text-[12px] text-green-700 mt-0.5">Select a different unit to create a new record.</p>
                  </div>
                </div>
              )}

              {/* Mode toggle */}
              {!bothExist && (
                <div className="flex gap-2">
                  {!hasMoveIn && (
                    <button
                      onClick={() => setActiveMode('move_in')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-600 border transition-all ${
                        activeMode === 'move_in' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      <LogIn size={15} /> Move In
                    </button>
                  )}
                  {hasMoveIn && !hasMoveOut && (
                    <button
                      onClick={() => setActiveMode('move_out')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-600 border transition-all ${
                        activeMode === 'move_out' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      <LogOut size={15} /> Move Out
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Checklist form */}
      {activeMode && selectedUnit && !bothExist && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeMode === 'move_in' ? 'bg-green-100' : 'bg-blue-100'}`}>
                {activeMode === 'move_in' ? <LogIn size={18} className="text-green-700" /> : <LogOut size={18} className="text-blue-700" />}
              </div>
              <div>
                <p className="text-[14px] font-700 text-foreground">{activeMode === 'move_in' ? 'Move In Checklist' : 'Move Out Checklist'}</p>
                <p className="text-[11px] text-muted-foreground">{checkedFields} of {totalFields} items completed</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-3 min-w-[160px]">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${activeMode === 'move_in' ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[12px] font-700 text-foreground w-10 text-right">{progress}%</span>
            </div>
          </div>

          {/* Date field — DD-MM-YYYY */}
          <div className="bg-white rounded-xl border border-border p-4">
            <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1.5">
              {activeMode === 'move_in' ? 'Move In Date' : 'Move Out Date'}
            </label>
            <input
              type="text"
              value={dateValue}
              onChange={e => handleDateChange(e.target.value)}
              placeholder="DD-MM-YYYY"
              maxLength={10}
              className={`px-3.5 py-2.5 text-[13px] bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/15 transition-all w-40 ${
                dateError ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'
              }`}
            />
            {dateError && (
              <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> {dateError}
              </p>
            )}
          </div>

          {/* Checklist sections */}
          {sections.map(section => (
            <CheckSection
              key={section.title}
              title={section.title}
              fields={section.fields}
              formData={formData}
              onChange={handleCheck}
            />
          ))}

          {/* Media Upload */}
          <MediaUpload
            mediaFiles={mediaFiles}
            onAdd={handleAddMedia}
            onRemove={handleRemoveMedia}
          />

          {/* Notes */}
          <div className="bg-white rounded-xl border border-border p-4">
            <label className="block text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              rows={3}
              placeholder="Any additional notes or observations…"
              className="w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all resize-none"
            />
          </div>

          {/* Save */}
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">
              <AlertCircle size={13} className="shrink-0" /> {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-700">
              <CheckCircle2 size={13} className="shrink-0" /> Checklist saved successfully.
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-600 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Checklist</>}
            </button>
          </div>
        </div>
      )}

      {/* Empty state when no unit selected */}
      {!selectedUnit && !loadingProjects && (
        <div className="bg-white rounded-2xl border border-border p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Home size={22} className="text-primary" />
          </div>
          <p className="text-[14px] font-600 text-foreground">Select a unit to get started</p>
          <p className="text-[12px] text-muted-foreground mt-1">Choose project → building → floor → unit to view or create a Move In / Move Out checklist.</p>
        </div>
      )}
    </div>
  );
}
