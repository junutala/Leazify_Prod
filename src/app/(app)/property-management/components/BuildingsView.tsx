'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Layers, ChevronRight, MapPin, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';

interface BuildingsViewProps {
  projectId: string;
  projectName: string;
  onDrillDown: (building: { id: string; name: string; usage_type?: string; number_of_floors?: number }) => void;
  projectUsageType?: string;
}

const EMPTY_BUILDING_FORM = { name: '', address: '', number_of_floors: 1, usage_type: 'office' };

/** Convert any string to Init Caps (Title Case) */
function toInitCaps(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function AddBuildingModal({ open, onClose, projectId, onSaved, defaultUsageType }: { open: boolean; onClose: () => void; projectId: string; onSaved: () => void; defaultUsageType?: string }) {
  const supabase = createClient();
  const { session } = useAuth();
  const [form, setForm] = useState({ ...EMPTY_BUILDING_FORM, usage_type: defaultUsageType || 'office' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  // Reset form with defaultUsageType whenever modal opens
  useEffect(() => {
    if (open) setForm({ ...EMPTY_BUILDING_FORM, usage_type: defaultUsageType || 'office' });
  }, [open, defaultUsageType]);

  const handleClose = () => {
    setForm({ ...EMPTY_BUILDING_FORM, usage_type: defaultUsageType || 'office' });
    setError('');
    onClose();
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Building name is required'); return; }
    setSaving(true);
    setError('');

    let accessToken = session?.access_token ?? null;
    if (!accessToken) {
      const { data: { session: localSession } } = await supabase.auth.getSession();
      accessToken = localSession?.access_token ?? null;
    }
    if (!accessToken) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        accessToken = refreshedSession?.access_token ?? null;
      }
    }
    if (!accessToken) { setError('You must be logged in to add a building'); setSaving(false); return; }

    const res = await fetch('/api/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ ...form, project_id: projectId }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error || 'Failed to add building'); return; }
    setForm({ ...EMPTY_BUILDING_FORM, usage_type: defaultUsageType || 'office' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Building" size="sm">
      <div className="p-5 space-y-4">
        {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">{error}</div>}
        <div>
          <label className={labelCls}>Building Name *</label>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: toInitCaps(e.target.value) }))} placeholder="e.g. Tower A" />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <input className={inputCls} value={form.address} onChange={e => setForm(f => ({ ...f, address: toInitCaps(e.target.value) }))} placeholder="Street address" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Number of Floors</label>
            <input type="number" min={1} className={inputCls} value={form.number_of_floors} onChange={e => setForm(f => ({ ...f, number_of_floors: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={labelCls}>Usage Type <span className="text-[10px] text-muted-foreground font-400">(inherited from project)</span></label>
            <select className={inputCls} value={form.usage_type} onChange={e => setForm(f => ({ ...f, usage_type: e.target.value }))}>
              {['office', 'retail', 'mall', 'residential'].map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? 'Saving...' : 'Add Building'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function BuildingsView({ projectId, projectName: _projectName, onDrillDown, projectUsageType }: BuildingsViewProps) {
  const supabase = createClient();
  const { session } = useAuth();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchBuildings = async () => {
    setLoading(true);

    let accessToken = session?.access_token ?? null;
    if (!accessToken) {
      const { data: { session: localSession } } = await supabase.auth.getSession();
      accessToken = localSession?.access_token ?? null;
    }
    if (!accessToken) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        accessToken = refreshedSession?.access_token ?? null;
      }
    }

    if (!accessToken) {
      setBuildings([]);
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/buildings?project_id=${projectId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const json = await res.json();
      setBuildings(json.buildings || []);
    } else {
      setBuildings([]);
    }
    setLoading(false);
  };

  useEffect(() => { if (projectId) fetchBuildings(); }, [projectId]);

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all">
          <Plus size={14} /> Add Building
        </button>
      </div>
      {buildings.length === 0 ? (
        <EmptyState icon={Building2} title="No buildings" description="Add the first building to this project" action={{ label: 'Add Building', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {buildings.map((b) => (
            <div key={b.id}
              className="bg-white rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-200 p-5 cursor-pointer group"
              onClick={() => onDrillDown({ id: b.id, name: b.name, usage_type: b.usage_type, number_of_floors: b.number_of_floors })}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-600 text-foreground group-hover:text-primary transition-colors truncate">{b.name}</h3>
                  {b.address && (
                    <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-[11px]">
                      <MapPin size={10} />{b.address}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-secondary/60 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5"><Layers size={10} /> Floors</div>
                  <p className="text-[15px] font-700 tabular-nums text-foreground">{b.number_of_floors || 0}</p>
                </div>
                <div className="bg-secondary/60 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5"><Building2 size={10} /> Usage</div>
                  <p className="text-[12px] font-600 capitalize text-foreground">{b.usage_type || 'office'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Badge variant={(b.usage_type || 'office') as any}>{(b.usage_type || 'office').charAt(0).toUpperCase() + (b.usage_type || 'office').slice(1)}</Badge>
                <div className="flex items-center gap-1 text-[12px] text-primary font-500">
                  View Floors <ChevronRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <AddBuildingModal open={showAdd} onClose={() => setShowAdd(false)} projectId={projectId} onSaved={fetchBuildings} defaultUsageType={projectUsageType} />
    </div>
  );
}