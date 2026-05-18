'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, MapPin, Navigation, Map, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Modal from '@/components/ui/Modal';
import { logAuditEvent } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

interface AddProjectValues {
  projectName: string;
  description: string;
  address: string;
  country: string;
  city: string;
  latitude: string;
  longitude: string;
  usageType: string;
  numberOfBuildings: number;
  vatRegistration: boolean;
  vatNumber: string;
  rentVatPct: number;
  sdVatPct: number;
  turnoverVatPct: number;
  amcVatPct: number;
  miscVatPct: number;
}

const usageTypes = ['Office', 'Retail', 'Mall', 'Residential'];

const countryCityMap: Record<string, string[]> = {
  'United Arab Emirates': ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Tabuk'],
  'Qatar': ['Doha', 'Al Wakrah', 'Al Khor', 'Lusail', 'Umm Salal'],
  'Kuwait': ['Kuwait City', 'Hawalli', 'Salmiya', 'Farwaniya', 'Ahmadi'],
  'Bahrain': ['Manama', 'Muharraq', 'Riffa', 'Hamad Town', 'Isa Town'],
  'Oman': ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur'],
};

// Approximate city center coordinates for map centering
const cityCenterCoords: Record<string, [number, number]> = {
  'Abu Dhabi': [24.4539, 54.3773], 'Dubai': [25.2048, 55.2708], 'Sharjah': [25.3463, 55.4209],
  'Ajman': [25.4052, 55.5136], 'Ras Al Khaimah': [25.7895, 55.9432], 'Fujairah': [25.1288, 56.3265],
  'Umm Al Quwain': [25.5647, 55.5554], 'Riyadh': [24.7136, 46.6753], 'Jeddah': [21.4858, 39.1925],
  'Mecca': [21.3891, 39.8579], 'Medina': [24.5247, 39.5692], 'Dammam': [26.4207, 50.0888],
  'Khobar': [26.2172, 50.1971], 'Tabuk': [28.3838, 36.5550], 'Doha': [25.2854, 51.5310],
  'Al Wakrah': [25.1664, 51.6004], 'Al Khor': [25.6836, 51.4965], 'Lusail': [25.4200, 51.4900],
  'Umm Salal': [25.4000, 51.3900], 'Kuwait City': [29.3759, 47.9774], 'Hawalli': [29.3327, 48.0270],
  'Salmiya': [29.3399, 48.0773], 'Farwaniya': [29.2776, 47.9590], 'Ahmadi': [29.0769, 48.0838],
  'Manama': [26.2235, 50.5876], 'Muharraq': [26.2577, 50.6196], 'Riffa': [26.1300, 50.5550],
  'Hamad Town': [26.1100, 50.5100], 'Isa Town': [26.1700, 50.5500], 'Muscat': [23.5880, 58.3829],
  'Salalah': [17.0151, 54.0924], 'Sohar': [24.3473, 56.7470], 'Nizwa': [22.9333, 57.5333], 'Sur': [22.5667, 59.5167],
};

const countryCenterCoords: Record<string, [number, number]> = {
  'United Arab Emirates': [24.0, 54.0], 'Saudi Arabia': [24.0, 45.0], 'Qatar': [25.3, 51.2],
  'Kuwait': [29.3, 47.7], 'Bahrain': [26.0, 50.5], 'Oman': [21.0, 57.0],
};

const countries = Object.keys(countryCityMap);

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

// ─── Map Picker Modal ─────────────────────────────────────────────────────────
function MapPickerModal({
  open, onClose, onConfirm, initialLat, initialLng, centerLat, centerLng,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (lat: string, lng: string) => void;
  initialLat?: string;
  initialLng?: string;
  centerLat: number;
  centerLng: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pickedLat, setPickedLat] = useState(initialLat || '');
  const [pickedLng, setPickedLng] = useState(initialLng || '');
  const [mapReady, setMapReady] = useState(false);

  // Build the leaflet map HTML as a data URL
  const mapHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; }
  .crosshair-hint {
    position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.7); color: #fff; padding: 6px 14px;
    border-radius: 20px; font-size: 12px; z-index: 1000; pointer-events: none;
    white-space: nowrap;
  }
</style>
</head>
<body>
<div id="map"></div>
<div class="crosshair-hint">Click anywhere on the map to set location</div>
<script>
  var initLat = ${initialLat && !isNaN(parseFloat(initialLat)) ? parseFloat(initialLat) : centerLat};
  var initLng = ${initialLng && !isNaN(parseFloat(initialLng)) ? parseFloat(initialLng) : centerLng};
  var map = L.map('map').setView([initLat, initLng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(map);
  var marker = null;
  if (${initialLat && initialLng ? 'true' : 'false'}) {
    marker = L.marker([initLat, initLng]).addTo(map);
  }
  map.on('click', function(e) {
    var lat = e.latlng.lat.toFixed(6);
    var lng = e.latlng.lng.toFixed(6);
    if (marker) { marker.setLatLng(e.latlng); } else { marker = L.marker(e.latlng).addTo(map); }
    window.parent.postMessage({ type: 'MAP_PICK', lat: lat, lng: lng }, '*');
  });
  window.parent.postMessage({ type: 'MAP_READY' }, '*');
</script>
</body>
</html>`;

  useEffect(() => {
    if (!open) { setMapReady(false); return; }
    setPickedLat(initialLat || '');
    setPickedLng(initialLng || '');

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'MAP_READY') setMapReady(true);
      if (e.data?.type === 'MAP_PICK') {
        setPickedLat(e.data.lat);
        setPickedLng(e.data.lng);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [open, initialLat, initialLng]);

  if (!open) return null;

  const blob = new Blob([mapHtml], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Map size={16} />
            </div>
            <div>
              <h3 className="text-[14px] font-600 text-foreground">Choose Location on Map</h3>
              <p className="text-[11px] text-muted-foreground">Click on the map to pin the exact location</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Map */}
        <div className="relative flex-1" style={{ height: '420px' }}>
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/30 z-10">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 size={16} className="animate-spin" /> Loading map...
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={blobUrl}
            className="w-full h-full border-0"
            title="Map Picker"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Coordinates display */}
        <div className="px-5 py-3 bg-secondary/30 border-t border-border">
          {pickedLat && pickedLng ? (
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-primary shrink-0" />
              <span className="text-[12px] text-foreground font-500">
                Selected: <span className="font-mono text-primary">{pickedLat}, {pickedLng}</span>
              </span>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <MapPin size={12} /> No location selected yet — click on the map above
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose}
            className="px-4 py-2 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">
            Cancel
          </button>
          <button
            onClick={() => { if (pickedLat && pickedLng) { onConfirm(pickedLat, pickedLng); onClose(); } }}
            disabled={!pickedLat || !pickedLng}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
            <Check size={14} /> Use This Location
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddProjectModal({ open, onClose, onSaved }: AddProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const supabase = createClient();
  const { session } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddProjectValues>({ defaultValues: { vatRegistration: false, numberOfBuildings: 1, rentVatPct: 5, sdVatPct: 0, turnoverVatPct: 5, amcVatPct: 5, miscVatPct: 5 } });

  const vatEnabled = watch('vatRegistration');
  const selectedCountry = watch('country');
  const selectedCity = watch('city');
  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');

  const getCities = () => selectedCountry ? (countryCityMap[selectedCountry] || []) : [];

  // Determine map center based on selected city/country
  const getMapCenter = (): [number, number] => {
    if (selectedCity && cityCenterCoords[selectedCity]) return cityCenterCoords[selectedCity];
    if (selectedCountry && countryCenterCoords[selectedCountry]) return countryCenterCoords[selectedCountry];
    return [25.2048, 55.2708]; // Default: Dubai
  };

  const detectGeoLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude', pos.coords.latitude.toFixed(6));
        setValue('longitude', pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  };

  const onSubmit = async (data: AddProjectValues) => {
    setLoading(true);
    setSaveError('');
    const geoLocation = data.latitude && data.longitude ? `${data.latitude},${data.longitude}` : null;

    const projectPayload = {
      name: data.projectName,
      description: data.description,
      address: data.address,
      city: data.city,
      country: data.country,
      geo_location: geoLocation,
      usage_type: data.usageType.toLowerCase().replace(/\s+/g, '_') as any,
      number_of_buildings: Number(data.numberOfBuildings),
      vat_registered: data.vatRegistration,
      vat_number: data.vatRegistration ? data.vatNumber : null,
      status: 'active',
    };

    // Prefer session from AuthContext; fall back to getSession() on the local client
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
      setSaveError('You must be logged in to create a project');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(projectPayload),
    });

    const json = await res.json();

    if (!res.ok) {
      setSaveError(json.error || 'Failed to create project');
      setLoading(false);
      return;
    }

    const project = json.project;

    // If VAT enabled, save VAT config using authed client
    if (data.vatRegistration && project) {
      const authedClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      );
      await authedClient.from('vat_config').upsert({
        project_id: project.id,
        vat_number: data.vatNumber,
        rent_vat_pct: Number(data.rentVatPct),
        security_deposit_vat_pct: Number(data.sdVatPct),
        turnover_rent_vat_pct: Number(data.turnoverVatPct),
        amc_vat_pct: Number(data.amcVatPct),
        misc_vat_pct: Number(data.miscVatPct),
      }, { onConflict: 'project_id' });
    }

    // Audit log: project created
    await logAuditEvent({
      entityType: 'project',
      entityId: project?.id,
      entityLabel: data.projectName,
      action: 'created',
      afterValues: projectPayload,
    });

    setLoading(false);
    reset();
    setSaveError('');
    onSaved?.();
    onClose();
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 text-[14px] bg-background border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all ${hasError ? 'border-destructive' : 'border-border'}`;

  const [mapCenter, setMapCenter] = useState<[number, number]>([25.2048, 55.2708]);
  useEffect(() => { setMapCenter(getMapCenter()); }, [selectedCity, selectedCountry]);

  return (
    <>
      <Modal open={open} onClose={() => { reset(); setSaveError(''); onClose(); }} title="Create New Project" subtitle="Add a new property project to your portfolio" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {saveError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">{saveError}</div>
          )}

          {/* Section: Basic Info */}
          <div>
            <h4 className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-3">Project Information</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-500 text-foreground mb-1.5">Project Name *</label>
                <input type="text" placeholder="e.g. Horizon Business Centre" className={inputCls(!!errors.projectName)}
                  {...register('projectName', { required: 'Project name is required' })} />
                {errors.projectName && <p className="mt-1 text-[12px] text-destructive">{errors.projectName.message}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-500 text-foreground mb-1.5">Project Description</label>
                <textarea rows={2} placeholder="Brief description..." className={`${inputCls()} resize-none`} {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-500 text-foreground mb-1.5">Usage Type *</label>
                  <select className={inputCls(!!errors.usageType)} {...register('usageType', { required: 'Usage type is required' })}>
                    <option value="">Select usage type</option>
                    {usageTypes.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {errors.usageType && <p className="mt-1 text-[12px] text-destructive">{errors.usageType.message}</p>}
                </div>
                <div>
                  <label className="block text-[13px] font-500 text-foreground mb-1.5">Number of Buildings</label>
                  <input type="number" min={1} className={inputCls()} {...register('numberOfBuildings', { required: true, min: 1 })} />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section: Location */}
          <div>
            <h4 className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin size={12} /> Location Details
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-500 text-foreground mb-1.5">Project Address *</label>
                <input type="text" placeholder="Street address" className={inputCls(!!errors.address)}
                  {...register('address', { required: 'Address is required' })} />
                {errors.address && <p className="mt-1 text-[12px] text-destructive">{errors.address.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-500 text-foreground mb-1.5">Country *</label>
                  <select className={inputCls(!!errors.country)} {...register('country', { required: 'Country is required' })}>
                    <option value="">Select country</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.country && <p className="mt-1 text-[12px] text-destructive">{errors.country.message}</p>}
                </div>
                <div>
                  <label className="block text-[13px] font-500 text-foreground mb-1.5">City *</label>
                  <select className={inputCls(!!errors.city)} {...register('city', { required: 'City is required' })} disabled={!selectedCountry}>
                    <option value="">Select city</option>
                    {getCities().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.city && <p className="mt-1 text-[12px] text-destructive">{errors.city.message}</p>}
                  {!selectedCountry && <p className="mt-1 text-[11px] text-muted-foreground">Select a country first</p>}
                </div>
              </div>

              {/* Geo Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[13px] font-500 text-foreground">Geo Coordinates <span className="text-[11px] text-muted-foreground font-400">(optional)</span></label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowMapPicker(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-500 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                      <Map size={11} /> Choose on Map
                    </button>
                    <button type="button" onClick={detectGeoLocation} disabled={geoLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-500 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-60">
                      <Navigation size={11} /> {geoLoading ? 'Detecting...' : 'Detect Location'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Latitude (e.g. 25.204849)" className={inputCls()} {...register('latitude')} />
                  <input type="text" placeholder="Longitude (e.g. 55.270782)" className={inputCls()} {...register('longitude')} />
                </div>
                {watchedLat && watchedLng && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-primary">
                    <MapPin size={11} />
                    <span className="font-mono">{watchedLat}, {watchedLng}</span>
                    <button type="button" onClick={() => { setValue('latitude', ''); setValue('longitude', ''); }}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section: VAT */}
          <div>
            <h4 className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-3">VAT Configuration</h4>
            <div className="flex items-center gap-3 mb-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" {...register('vatRegistration')} />
                <div className="w-10 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors duration-200 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <span className="text-[13px] font-500 text-foreground">VAT Registered</span>
            </div>
            {vatEnabled && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-[13px] font-500 text-foreground mb-1.5">VAT Registration Number</label>
                  <input type="text" placeholder="e.g. 100234567890003" className={`${inputCls()} font-mono`} {...register('vatNumber')} />
                </div>
                <div>
                  <p className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-2">VAT Rates by Invoice Type (%)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { field: 'rentVatPct' as const, label: 'Rent VAT %' },
                      { field: 'sdVatPct' as const, label: 'Security Deposit VAT %' },
                      { field: 'turnoverVatPct' as const, label: 'Turnover Rent VAT %' },
                      { field: 'amcVatPct' as const, label: 'AMC VAT %' },
                      { field: 'miscVatPct' as const, label: 'Miscellaneous VAT %' },
                    ].map(({ field, label }) => (
                      <div key={field}>
                        <label className="block text-[12px] font-500 text-foreground mb-1">{label}</label>
                        <input type="number" step="0.01" min="0" max="100" className={inputCls()} {...register(field, { valueAsNumber: true })} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => { reset(); setSaveError(''); onClose(); }}
              className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary hover:text-foreground transition-all duration-150">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-60 flex items-center gap-2"
              style={{ minWidth: '140px', justifyContent: 'center' }}>
              {loading ? (<><Loader2 size={14} className="animate-spin" />Creating...</>) : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Map Picker — rendered outside the main modal to avoid z-index conflicts */}
      <MapPickerModal
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(lat, lng) => { setValue('latitude', lat); setValue('longitude', lng); }}
        initialLat={watchedLat}
        initialLng={watchedLng}
        centerLat={mapCenter[0]}
        centerLng={mapCenter[1]}
      />
    </>
  );
}