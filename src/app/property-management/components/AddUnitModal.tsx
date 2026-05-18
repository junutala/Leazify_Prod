'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import type { BreadcrumbState } from './PropertyManagementClient';
import { useAuth } from '@/contexts/AuthContext';

/** Convert any string to Init Caps (Title Case) */
function toInitCaps(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

interface AddUnitValues {
  unitName: string;
  gla: number;
  usageType: string;
  lockable: boolean;
  numBalconies?: number;
  numBedrooms?: number;
  kitchen?: string;
  numCarParks?: number;
  pantry?: string;
  washrooms?: string;
  parking?: string;
  guestParking?: string;
  mallStoreType?: string;
}

const usageTypes = ['Office', 'Retail', 'Mall', 'Residential'];
const mallStoreTypes = ['Anchor', 'Apparel', 'Electronics', 'Food Courts', 'Entertainment', 'Convenience', 'Book Stores', 'Kiosks', 'Specialty'];

interface AddUnitModalProps {
  open: boolean;
  onClose: () => void;
  crumbs: BreadcrumbState;
  onSaved?: () => void;
}

export default function AddUnitModal({ open, onClose, crumbs, onSaved }: AddUnitModalProps) {
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [floorUnitLimit, setFloorUnitLimit] = useState<number>(0);
  const [currentUnitCount, setCurrentUnitCount] = useState<number>(0);
  const supabase = createClient();
  const { session } = useAuth();

  // Fetch floor's unit limit and current count when floor changes
  useEffect(() => {
    if (!crumbs.floor?.id) return;
    const fetchFloorInfo = async () => {
      const { data: floor } = await supabase
        .from('floors')
        .select('number_of_units')
        .eq('id', crumbs.floor!.id)
        .maybeSingle();
      setFloorUnitLimit(floor?.number_of_units || 0);

      const { count } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('floor_id', crumbs.floor!.id);
      setCurrentUnitCount(count || 0);
    };
    fetchFloorInfo();
  }, [crumbs.floor?.id, open]);

  const atUnitLimit = floorUnitLimit > 0 && currentUnitCount >= floorUnitLimit;

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<AddUnitValues>({ defaultValues: { lockable: false } });
  const usageType = watch('usageType');

  const onSubmit = async (data: AddUnitValues) => {
    if (!crumbs.floor?.id) {
      setSaveError('Please navigate to a floor before adding a unit.');
      return;
    }
    setLoading(true);
    setSaveError('');

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
      setSaveError('You must be logged in to add a unit');
      setLoading(false);
      return;
    }

    const insertData: any = {
      floor_id: crumbs.floor.id,
      unit_number: data.unitName,
      unit_name: data.unitName,
      gla_sqft: Number(data.gla),
      usage_type: data.usageType.toLowerCase() as any,
      lockable: data.lockable,
      status: 'vacant',
    };

    if (data.usageType === 'Residential') {
      insertData.num_bedrooms = Number(data.numBedrooms) || 0;
      insertData.num_balconies = Number(data.numBalconies) || 0;
      insertData.kitchen_type = data.kitchen;
      insertData.num_car_parks = Number(data.numCarParks) || 0;
    } else if (data.usageType === 'Office' || data.usageType === 'Retail') {
      insertData.pantry_type = data.pantry;
      insertData.washroom_type = data.washrooms;
      insertData.parking = data.parking;
      insertData.guest_parking = data.guestParking === 'available';
    } else if (data.usageType === 'Mall') {
      insertData.mall_store_type = data.mallStoreType?.toLowerCase().replace(' ', '_') as any;
    }

    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(insertData),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setSaveError(json.error || 'Failed to add unit'); return; }
    reset();
    setSaveError('');
    onSaved?.();
    onClose();
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 text-[14px] bg-background border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all ${hasError ? 'border-destructive' : 'border-border'}`;

  return (
    <Modal open={open} onClose={() => { reset(); setSaveError(''); onClose(); }} title="Add New Unit" subtitle="Configure unit details and usage type" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
        {saveError && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">{saveError}</div>}

        {/* Unit limit indicator */}
        {floorUnitLimit > 0 && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border ${atUnitLimit ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>
              {atUnitLimit
                ? `Unit limit reached: ${currentUnitCount} / ${floorUnitLimit} units defined for this floor.`
                : `${currentUnitCount} of ${floorUnitLimit} allowed units added.`}
            </span>
          </div>
        )}

        {/* Breadcrumb context */}
        {(crumbs.project || crumbs.building || crumbs.floor) && (
          <div className="bg-secondary/60 rounded-lg px-4 py-2.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            {crumbs.project && <span className="font-500 text-foreground">{crumbs.project.name}</span>}
            {crumbs.building && <><span>›</span><span className="font-500 text-foreground">{crumbs.building.name}</span></>}
            {crumbs.floor && <><span>›</span><span className="font-500 text-foreground">{crumbs.floor.name}</span></>}
          </div>
        )}

        {!crumbs.floor && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-700">
            Please navigate to a specific floor first before adding a unit.
          </div>
        )}

        {/* Basic Info */}
        <div>
          <h4 className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-3">Unit Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-500 text-foreground mb-1.5">Unit Name / Number *</label>
              <input
                type="text"
                placeholder="e.g. U-204"
                className={inputCls(!!errors.unitName)}
                disabled={atUnitLimit}
                {...register('unitName', { required: 'Unit name is required' })}
                onChange={e => {
                  const caps = toInitCaps(e.target.value);
                  setValue('unitName', caps, { shouldValidate: true });
                }}
              />
              {errors.unitName && <p className="mt-1 text-[12px] text-destructive">{errors.unitName.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-500 text-foreground mb-1.5">Gross Leasable Area (sqft) *</label>
              <input type="number" min={1} placeholder="e.g. 2400" className={inputCls(!!errors.gla)}
                {...register('gla', { required: 'GLA is required', min: { value: 1, message: 'Must be greater than 0' } })} />
              {errors.gla && <p className="mt-1 text-[12px] text-destructive">{errors.gla.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-500 text-foreground mb-1.5">Usage Type *</label>
              <select className={inputCls(!!errors.usageType)} {...register('usageType', { required: 'Usage type is required' })}>
                <option value="">Select usage type</option>
                {usageTypes.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {errors.usageType && <p className="mt-1 text-[12px] text-destructive">{errors.usageType.message}</p>}
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" {...register('lockable')} />
                <div className="w-10 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors duration-200 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <span className="text-[13px] font-500 text-foreground">Lockable Unit</span>
            </div>
          </div>
        </div>

        {/* Residential */}
        {usageType === 'Residential' && (
          <div className="animate-fade-in">
            <hr className="border-border mb-4" />
            <h4 className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-3">Residential Configuration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[13px] font-500 text-foreground mb-1.5">Bedrooms</label><input type="number" min={0} className={inputCls()} {...register('numBedrooms')} /></div>
              <div><label className="block text-[13px] font-500 text-foreground mb-1.5">Balconies</label><input type="number" min={0} className={inputCls()} {...register('numBalconies')} /></div>
              <div><label className="block text-[13px] font-500 text-foreground mb-1.5">Kitchen</label>
                <select className={inputCls()} {...register('kitchen')}><option value="">Select</option><option value="separate">Separate</option><option value="open">Open</option></select></div>
              <div><label className="block text-[13px] font-500 text-foreground mb-1.5">Car Parks</label><input type="number" min={0} className={inputCls()} {...register('numCarParks')} /></div>
            </div>
          </div>
        )}

        {/* Office / Retail */}
        {(usageType === 'Office' || usageType === 'Retail') && (
          <div className="animate-fade-in">
            <hr className="border-border mb-4" />
            <h4 className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{usageType} Configuration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[13px] font-500 text-foreground mb-1.5">Pantry</label>
                <select className={inputCls()} {...register('pantry')}><option value="">Select</option><option value="separate">Separate</option><option value="common">Common</option></select></div>
              <div><label className="block text-[13px] font-500 text-foreground mb-1.5">Washrooms</label>
                <select className={inputCls()} {...register('washrooms')}><option value="">Select</option><option value="separate">Separate</option><option value="common">Common</option></select></div>
              <div><label className="block text-[13px] font-500 text-foreground mb-1.5">Parking</label>
                <select className={inputCls()} {...register('parking')}><option value="">Select</option><option value="available">Available</option><option value="not_available">Not Available</option></select></div>
              <div><label className="block text-[13px] font-500 text-foreground mb-1.5">Guest Parking</label>
                <select className={inputCls()} {...register('guestParking')}><option value="">Select</option><option value="available">Available</option><option value="no">No</option></select></div>
            </div>
          </div>
        )}

        {/* Mall */}
        {usageType === 'Mall' && (
          <div className="animate-fade-in">
            <hr className="border-border mb-4" />
            <h4 className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-3">Mall Configuration</h4>
            <div>
              <label className="block text-[13px] font-500 text-foreground mb-1.5">Mall Store Type *</label>
              <select className={inputCls(!!errors.mallStoreType)} {...register('mallStoreType', { required: usageType === 'Mall' ? 'Mall store type is required' : false })}>
                <option value="">Select store type</option>
                {mallStoreTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.mallStoreType && <p className="mt-1 text-[12px] text-destructive">{errors.mallStoreType.message}</p>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => { reset(); setSaveError(''); onClose(); }}
            className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
          <button type="submit" disabled={loading || !crumbs.floor || atUnitLimit}
            className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2 transition-all"
            style={{ minWidth: '120px', justifyContent: 'center' }}>
            {loading ? (<><Loader2 size={14} className="animate-spin" />Saving...</>) : 'Add Unit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}