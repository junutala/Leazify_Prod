'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Home, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';

interface FloorsViewProps {
  buildingId: string;
  buildingName: string;
  onDrillDown: (floor: { id: string; name: string }) => void;
  buildingUsageType?: string;
  buildingMaxFloors?: number;
}

const EMPTY_FLOOR_FORM = { name: '', description: '', usage_type: 'office' };

/** Convert any string to Init Caps (Title Case) */
function toInitCaps(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function AddFloorModal({ open, onClose, buildingId, onSaved, defaultUsageType, maxFloors, currentFloorCount }: {
  open: boolean;
  onClose: () => void;
  buildingId: string;
  onSaved: () => void;
  defaultUsageType?: string;
  maxFloors?: number;
  currentFloorCount: number;
}) {
  const supabase = createClient();
  const { session } = useAuth();
  const [form, setForm] = useState({ ...EMPTY_FLOOR_FORM, usage_type: defaultUsageType || 'office' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  const atLimit = maxFloors !== undefined && maxFloors > 0 && currentFloorCount >= maxFloors;

  // Reset form with defaultUsageType whenever modal opens
  useEffect(() => {
    if (open) setForm({ ...EMPTY_FLOOR_FORM, usage_type: defaultUsageType || 'office' });
  }, [open, defaultUsageType]);

  const handleClose = () => {
    setForm({ ...EMPTY_FLOOR_FORM, usage_type: defaultUsageType || 'office' });
    setError('');
    onClose();
  };

  const handleSave = async () => {
    if (atLimit) {
      setError(`This building is limited to ${maxFloors} floor${maxFloors === 1 ? '' : 's'}. Remove an existing floor to add a new one.`);
      return;
    }
    if (!form.name.trim()) { setError('Floor name is required'); return; }
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
    if (!accessToken) { setError('You must be logged in to add a floor'); setSaving(false); return; }

    const res = await fetch('/api/floors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ ...form, building_id: buildingId }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error || 'Failed to add floor'); return; }
    setForm({ ...EMPTY_FLOOR_FORM, usage_type: defaultUsageType || 'office' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Floor" size="sm">
      <div className="p-5 space-y-4">
        {maxFloors !== undefined && maxFloors > 0 && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] ${atLimit ? 'bg-destructive/10 border border-destructive/30 text-destructive' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
            <AlertCircle size={13} className="shrink-0" />
            <span>
              {atLimit
                ? `Floor limit reached: ${currentFloorCount} / ${maxFloors} floors defined for this building.`
                : `${currentFloorCount} of ${maxFloors} allowed floors added.`}
            </span>
          </div>
        )}
        {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">{error}</div>}
        <div>
          <label className={labelCls}>Floor Name *</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: toInitCaps(e.target.value) }))}
            placeholder="e.g. Ground Floor, Level 1"
            disabled={atLimit}
          />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input
            className={inputCls}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: toInitCaps(e.target.value) }))}
            placeholder="e.g. Lobby & reception units"
            disabled={atLimit}
          />
        </div>
        <div>
          <label className={labelCls}>Usage Type <span className="text-[10px] text-muted-foreground font-400">(inherited from building)</span></label>
          <select className={inputCls} value={form.usage_type} onChange={e => setForm(f => ({ ...f, usage_type: e.target.value }))} disabled={atLimit}>
            {['office', 'retail', 'mall', 'residential'].map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving || atLimit} className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? 'Saving...' : 'Add Floor'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function FloorsView({ buildingId, onDrillDown, buildingUsageType, buildingMaxFloors }: FloorsViewProps) {
  const supabase = createClient();
  const { session } = useAuth();
  const [floors, setFloors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [currentBuildingUsageType, setCurrentBuildingUsageType] = useState(buildingUsageType || 'office');

  const atFloorLimit = buildingMaxFloors !== undefined && buildingMaxFloors > 0 && floors.length >= buildingMaxFloors;

  const fetchFloors = async () => {
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
      setFloors([]);
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/floors?building_id=${buildingId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const json = await res.json();
      setFloors(json.floors || []);
      // Infer usage type from first floor if not passed from parent
      if (!buildingUsageType && json.floors?.length > 0) {
        setCurrentBuildingUsageType(json.floors[0].usage_type || 'office');
      }
    } else {
      setFloors([]);
    }
    setLoading(false);
  };

  useEffect(() => { if (buildingId) fetchFloors(); }, [buildingId]);
  useEffect(() => { if (buildingUsageType) setCurrentBuildingUsageType(buildingUsageType); }, [buildingUsageType]);

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {buildingMaxFloors !== undefined && buildingMaxFloors > 0 && (
          <div className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border ${atFloorLimit ? 'bg-destructive/8 border-destructive/25 text-destructive' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <AlertCircle size={12} />
            <span>{floors.length} / {buildingMaxFloors} floors{atFloorLimit ? ' — limit reached' : ''}</span>
          </div>
        )}
        <button
          onClick={() => setShowAdd(true)}
          disabled={atFloorLimit}
          title={atFloorLimit ? `Floor limit of ${buildingMaxFloors} reached` : undefined}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Plus size={14} /> Add Floor
        </button>
      </div>
      {floors.length === 0 ? (
        <EmptyState icon={Layers} title="No floors" description="Add the first floor to this building" action={{ label: 'Add Floor', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {floors.map((floor) => {
            const unitCount = typeof floor.units === 'number'
              ? floor.units
              : Array.isArray(floor.units)
                ? (floor.units[0]?.count ?? 0)
                : 0;
            return (
              <div key={floor.id}
                className="bg-white rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-200 p-5 cursor-pointer group"
                onClick={() => onDrillDown({ id: floor.id, name: floor.name })}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-600 text-foreground group-hover:text-primary transition-colors">{floor.name}</h3>
                    {floor.description && <p className="text-[11px] text-muted-foreground mt-0.5">{floor.description}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-secondary/60 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1 text-muted-foreground text-[10px] mb-0.5"><Home size={10} /> Units</div>
                    <p className="text-[15px] font-700 tabular-nums">{unitCount}{floor.number_of_units > 0 ? ` / ${floor.number_of_units}` : ''}</p>
                  </div>
                  <div className="bg-secondary/60 rounded-lg px-3 py-2">
                    <div className="text-muted-foreground text-[10px] mb-0.5">Usage</div>
                    <p className="text-[12px] font-600 capitalize">{floor.usage_type || 'office'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <Badge variant={(floor.usage_type || 'office') as any}>{(floor.usage_type || 'office').charAt(0).toUpperCase() + (floor.usage_type || 'office').slice(1)}</Badge>
                  <div className="flex items-center gap-1 text-[12px] text-primary font-500">
                    View Units <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AddFloorModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        buildingId={buildingId}
        onSaved={fetchFloors}
        defaultUsageType={currentBuildingUsageType}
        maxFloors={buildingMaxFloors}
        currentFloorCount={floors.length}
      />
    </div>
  );
}