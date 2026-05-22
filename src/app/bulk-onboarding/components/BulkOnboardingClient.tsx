'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type UploadType = 'projects' | 'buildings' | 'floors' | 'units' | 'persons' | 'service_providers' | 'leases';

interface UploadResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

const uploadTypes: { value: UploadType; label: string; description: string; template: string[][] }[] = [
  {
    value: 'projects',
    label: 'Projects',
    description: 'Upload multiple projects at once',
    template: [['name', 'description', 'address', 'city', 'country', 'usage_type', 'number_of_buildings', 'vat_number'],
               ['Horizon Centre', 'Main office complex', 'Sheikh Zayed Road', 'Dubai', 'United Arab Emirates', 'office', '2', '100234567890003']],
  },
  {
    value: 'buildings',
    label: 'Buildings',
    description: 'Upload buildings linked to existing projects',
    template: [['project_name', 'name', 'address', 'number_of_floors', 'usage_type'],
               ['Horizon Centre', 'Tower A', 'Block A', '6', 'office']],
  },
  {
    value: 'floors',
    label: 'Floors',
    description: 'Upload floors linked to existing buildings',
    template: [['project_name', 'building_name', 'name', 'description', 'number_of_units', 'usage_type'],
               ['Horizon Centre', 'Tower A', 'Ground Floor', 'Ground level', '4', 'office']],
  },
  {
    value: 'units',
    label: 'Units',
    description: 'Upload units — specify project, building AND floor to avoid ambiguity',
    template: [['project_name', 'building_name', 'floor_name', 'unit_name', 'unit_number', 'gla_sqft', 'usage_type', 'lockable'],
               ['Horizon Centre', 'Tower A', 'Ground Floor', 'Unit 101', 'U-101', '2400', 'office', 'true']],
  },
  {
    value: 'leases',
    label: 'New Leases',
    description: 'Upload new leases linked to existing units and persons',
    template: [
      ['project_name', 'building_name', 'floor_name', 'unit_number', 'tenant_name', 'start_date', 'end_date', 'rent_amount', 'rent_payment_term', 'security_deposit', 'sd_payment_term', 'annual_increment_pct', 'turnover_rent_pct', 'turnover_payment_term', 'amc_amount', 'amc_payment_term', 'notes'],
      ['Horizon Centre', 'Tower A', 'Ground Floor', 'U-101', 'Vertex Analytics Ltd', '2025-01-01', '2026-12-31', '120000', 'annually', '30000', 'immediate', '5', '0', 'monthly', '0', 'annually', 'New lease'],
    ],
  },
  {
    value: 'persons',
    label: 'Persons',
    description: 'Upload person records (tenants, contacts)',
    template: [['person_type', 'name', 'trade_licence_no', 'email', 'mobile', 'contact_address'],
               ['company', 'Vertex Analytics Ltd', 'TL-2024-001234', 'info@vertex.ae', '+971501234567', 'DIFC, Dubai']],
  },
  {
    value: 'service_providers',
    label: 'Service Providers',
    description: 'Upload service providers with skill types',
    template: [['person_type', 'name', 'skill_type', 'email', 'mobile', 'response_time_hours'],
               ['company', 'ElectroPro Services', 'electrical', 'ops@electropro.ae', '+971551234567', '4']],
  },
];

function downloadTemplate(type: UploadType) {
  const config = uploadTypes.find(t => t.value === type);
  if (!config) return;
  const csvContent = config.template.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `template_${type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

/**
 * Accepts dates in DD/MM/YYYY or YYYY-MM-DD format and always returns YYYY-MM-DD.
 * Throws a descriptive error if the value cannot be parsed.
 */
function parseDate(value: string, fieldName: string, rowIndex: number): string {
  const trimmed = value.trim();
  // Already ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('-');
    return `${year}-${month}-${day}`;
  }
  throw new Error(`Row ${rowIndex}: "${fieldName}" has an unrecognised date format "${trimmed}". Use DD/MM/YYYY or YYYY-MM-DD.`);
}

// Map CSV payment term values to valid PostgreSQL enum values
const PAYMENT_TERM_MAP: Record<string, string> = {
  'immediately': 'immediate',
  'immediate': 'immediate',
  'on receipt': 'immediate',
  '15 days': '15_days',
  '15days': '15_days',
  '15_days': '15_days',
  '30 days': '30_days',
  '30days': '30_days',
  '30_days': '30_days',
  'monthly': 'monthly',
  'month': 'monthly',
  'quarterly': 'quarterly',
  'quarter': 'quarterly',
  'half yearly': 'half_yearly',
  'half-yearly': 'half_yearly',
  'halfyearly': 'half_yearly',
  'half_yearly': 'half_yearly',
  'semi-annual': 'half_yearly',
  'semi annual': 'half_yearly',
  'annually': 'annually',
  'annual': 'annually',
  'yearly': 'annually',
  'year': 'annually',
};

function normalizePaymentTerm(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const key = value.trim().toLowerCase();
  return PAYMENT_TERM_MAP[key] ?? fallback;
}

export default function BulkOnboardingClient() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [activeType, setActiveType] = useState<UploadType>('projects');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const processUpload = async (rows: Record<string, string>[], type: UploadType): Promise<UploadResult> => {
    const errors: string[] = [];
    let success = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (type === 'projects') {
          const { error } = await supabase.from('projects').insert({
            name: row.name,
            description: row.description || null,
            address: row.address || null,
            city: row.city || null,
            country: row.country || 'United Arab Emirates',
            usage_type: (row.usage_type || 'office').toLowerCase(),
            number_of_buildings: parseInt(row.number_of_buildings) || 1,
            vat_number: row.vat_number || null,
          });
          if (error) throw error;
        } else if (type === 'buildings') {
          const { data: proj } = await supabase.from('projects').select('id').ilike('name', row.project_name).single();
          if (!proj) throw new Error(`Project "${row.project_name}" not found`);
          const { error } = await supabase.from('buildings').insert({
            project_id: proj.id,
            name: row.name,
            address: row.address || null,
            number_of_floors: parseInt(row.number_of_floors) || 1,
            usage_type: (row.usage_type || 'office').toLowerCase(),
          });
          if (error) throw error;
        } else if (type === 'floors') {
          // Require project_name + building_name for unambiguous lookup
          if (!row.project_name) throw new Error(`Row ${i + 2}: project_name is required`);
          if (!row.building_name) throw new Error(`Row ${i + 2}: building_name is required`);

          const { data: proj } = await supabase.from('projects').select('id').ilike('name', row.project_name).single();
          if (!proj) throw new Error(`Project "${row.project_name}" not found`);

          const { data: bldg } = await supabase
            .from('buildings')
            .select('id')
            .eq('project_id', proj.id)
            .ilike('name', row.building_name)
            .single();
          if (!bldg) throw new Error(`Building "${row.building_name}" not found in project "${row.project_name}"`);

          const { error } = await supabase.from('floors').insert({
            building_id: bldg.id,
            name: row.name,
            description: row.description || null,
            number_of_units: parseInt(row.number_of_units) || 0,
            usage_type: (row.usage_type || 'office').toLowerCase(),
          });
          if (error) throw error;
        } else if (type === 'units') {
          // Require project_name + building_name + floor_name for unambiguous lookup
          if (!row.project_name) throw new Error(`Row ${i + 2}: project_name is required`);
          if (!row.building_name) throw new Error(`Row ${i + 2}: building_name is required`);
          if (!row.floor_name) throw new Error(`Row ${i + 2}: floor_name is required`);

          // Resolve project
          const { data: proj } = await supabase
            .from('projects')
            .select('id')
            .ilike('name', row.project_name)
            .single();
          if (!proj) throw new Error(`Project "${row.project_name}" not found`);

          // Resolve building within that project
          const { data: bldg } = await supabase
            .from('buildings')
            .select('id')
            .eq('project_id', proj.id)
            .ilike('name', row.building_name)
            .single();
          if (!bldg) throw new Error(`Building "${row.building_name}" not found in project "${row.project_name}"`);

          // Resolve floor within that building
          const { data: floor } = await supabase
            .from('floors')
            .select('id')
            .eq('building_id', bldg.id)
            .ilike('name', row.floor_name)
            .single();
          if (!floor) throw new Error(`Floor "${row.floor_name}" not found in building "${row.building_name}"`);

          const { error } = await supabase.from('units').insert({
            floor_id: floor.id,
            unit_name: row.unit_name,
            unit_number: row.unit_number || row.unit_name,
            gla_sqft: parseFloat(row.gla_sqft) || null,
            usage_type: (row.usage_type || 'office').toLowerCase(),
            lockable: row.lockable?.toLowerCase() === 'true',
            status: 'vacant',
          });
          if (error) throw error;
        } else if (type === 'persons') {
          const { error } = await supabase.from('persons').insert({
            person_type: row.person_type || 'individual',
            name: row.name,
            trade_licence_no: row.trade_licence_no || null,
            email: row.email || null,
            mobile: row.mobile || null,
            contact_address: row.contact_address || null,
          });
          if (error) throw error;
        } else if (type === 'service_providers') {
          const { error } = await supabase.from('service_providers').insert({
            person_type: row.person_type || 'company',
            name: row.name,
            skill_type: row.skill_type,
            email: row.email || null,
            mobile: row.mobile || null,
            response_time_hours: parseInt(row.response_time_hours) || 24,
          });
          if (error) throw error;
        } else if (type === 'leases') {
          // Resolve unit via project → building → floor → unit_number
          if (!row.project_name) throw new Error(`Row ${i + 2}: project_name is required`);
          if (!row.building_name) throw new Error(`Row ${i + 2}: building_name is required`);
          if (!row.floor_name) throw new Error(`Row ${i + 2}: floor_name is required`);
          if (!row.unit_number) throw new Error(`Row ${i + 2}: unit_number is required`);
          if (!row.tenant_name) throw new Error(`Row ${i + 2}: tenant_name is required`);
          if (!row.start_date) throw new Error(`Row ${i + 2}: start_date is required`);
          if (!row.end_date) throw new Error(`Row ${i + 2}: end_date is required`);
          if (!row.rent_amount) throw new Error(`Row ${i + 2}: rent_amount is required`);

          const { data: proj } = await supabase.from('projects').select('id').ilike('name', row.project_name).single();
          if (!proj) throw new Error(`Project "${row.project_name}" not found`);

          const { data: bldg } = await supabase.from('buildings').select('id').eq('project_id', proj.id).ilike('name', row.building_name).single();
          if (!bldg) throw new Error(`Building "${row.building_name}" not found in project "${row.project_name}"`);

          const { data: floor } = await supabase.from('floors').select('id').eq('building_id', bldg.id).ilike('name', row.floor_name).single();
          if (!floor) throw new Error(`Floor "${row.floor_name}" not found in building "${row.building_name}"`);

          const { data: unit } = await supabase.from('units').select('id').eq('floor_id', floor.id).ilike('unit_number', row.unit_number).single();
          if (!unit) throw new Error(`Unit "${row.unit_number}" not found in floor "${row.floor_name}"`);

          // Resolve tenant person by name
          const { data: person } = await supabase.from('persons').select('id').ilike('name', row.tenant_name).single();
          if (!person) throw new Error(`Person/Tenant "${row.tenant_name}" not found — upload the person first`);

          const leaseNum = `LSE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
          const { error } = await supabase.from('leases').insert({
            lease_number: leaseNum,
            unit_id: unit.id,
            lessee_person_id: person.id,
            start_date: parseDate(row.start_date, 'start_date', i + 2),
            end_date: parseDate(row.end_date, 'end_date', i + 2),
            payment_terms: normalizePaymentTerm(row.rent_payment_term, 'annually'),
            sd_payment_term: normalizePaymentTerm(row.sd_payment_term, 'immediate'),
            turnover_payment_term: normalizePaymentTerm(row.turnover_payment_term, 'monthly'),
            amc_payment_term: normalizePaymentTerm(row.amc_payment_term, 'annually'),
            notes: row.notes || null,
            contract_generated: false,
            status: 'draft',
            rent_amount: parseFloat(row.rent_amount) || 0,
            security_deposit: parseFloat(row.security_deposit) || 0,
            annual_increment_pct: parseFloat(row.annual_increment_pct) || 0,
            turnover_rent_pct: parseFloat(row.turnover_rent_pct) || 0,
            amc_amount: parseFloat(row.amc_amount) || 0,
          });
          if (error) throw error;
        }
        success++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    return { total: rows.length, success, failed: rows.length - success, errors };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      setResult({ total: 0, success: 0, failed: 0, errors: ['No valid rows found in file'] });
      setUploading(false);
      return;
    }

    const uploadResult = await processUpload(rows, activeType);
    setResult(uploadResult);

    // Log to bulk_upload_logs
    await supabase.from('bulk_upload_logs').insert({
      entity_type: activeType,
      file_name: file.name,
      total_rows: uploadResult.total,
      success_rows: uploadResult.success,
      error_rows: uploadResult.failed,
      errors: uploadResult.errors,
    });

    // Refresh logs
    const { data } = await supabase.from('bulk_upload_logs').select('*').order('created_at', { ascending: false }).limit(10);
    setLogs(data || []);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  React.useEffect(() => {
    supabase.from('bulk_upload_logs').select('*').order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setLogs(data || []));
  }, []);

  const activeConfig = uploadTypes.find(t => t.value === activeType)!;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.bulk_title}</h1>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.bulk_subtitle}</p>
      </div>

      {/* Hierarchy mapping guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-[13px] font-600 text-blue-800 mb-2">📋 How CSV Hierarchy Linking Works</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[12px] text-blue-700">
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
            <p className="font-600 mb-1">1. Projects</p>
            <p className="text-blue-600">Upload first. No parent required.</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
            <p className="font-600 mb-1">2. Buildings</p>
            <p className="text-blue-600">Requires <code className="bg-blue-100 px-1 rounded">project_name</code> to link to a project.</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
            <p className="font-600 mb-1">3. Floors</p>
            <p className="text-blue-600">Requires <code className="bg-blue-100 px-1 rounded">project_name</code> + <code className="bg-blue-100 px-1 rounded">building_name</code>.</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
            <p className="font-600 mb-1">4. Units</p>
            <p className="text-blue-600">Requires <code className="bg-blue-100 px-1 rounded">project_name</code> + <code className="bg-blue-100 px-1 rounded">building_name</code> + <code className="bg-blue-100 px-1 rounded">floor_name</code>.</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
            <p className="font-600 mb-1">5. New Leases</p>
            <p className="text-blue-600">Requires unit path + <code className="bg-blue-100 px-1 rounded">tenant_name</code> matching an existing Person.</p>
          </div>
        </div>
        <p className="text-[11px] text-blue-600 mt-2">⚠️ Names must match exactly (case-insensitive) what is already in the system. Upload in order: Projects → Buildings → Floors → Units → Persons → Leases.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Type selector */}
        <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-1">
          <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">Upload Type</p>
          {uploadTypes.map(t => (
            <button key={t.value} onClick={() => { setActiveType(t.value); setResult(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-500 transition-all ${activeType === t.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              {t.label}
              <p className="text-[11px] font-400 mt-0.5 opacity-70">{t.description}</p>
            </button>
          ))}
        </div>

        {/* Right: Upload area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-border shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-600 text-foreground">{activeConfig.label} Upload</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">{activeConfig.description}</p>
              </div>
              <button onClick={() => downloadTemplate(activeType)}
                className="flex items-center gap-2 px-3.5 py-2 text-[12px] font-500 text-primary border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-all">
                <Download size={13} /> Download Template
              </button>
            </div>

            {/* Template preview */}
            <div className="mb-4 overflow-x-auto">
              <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-2">Expected CSV Format</p>
              <table className="text-[11px] border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-secondary/50">
                    {activeConfig.template[0].map(h => (
                      <th key={h} className="px-3 py-1.5 text-left font-600 text-muted-foreground border-r border-border last:border-r-0 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {activeConfig.template[1].map((v, i) => (
                      <td key={i} className="px-3 py-1.5 text-muted-foreground border-r border-border last:border-r-0 whitespace-nowrap">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Upload zone */}
            <label className="block cursor-pointer">
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${uploading ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-primary/3'}`}>
                {uploading ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[13px] font-500 text-primary">Processing upload...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileSpreadsheet size={32} className="text-muted-foreground mx-auto" />
                    <p className="text-[14px] font-500 text-foreground">Drop CSV file here or click to browse</p>
                    <p className="text-[12px] text-muted-foreground">Only .csv files are supported</p>
                  </div>
                )}
              </div>
            </label>

            {/* Result */}
            {result && (
              <div className={`mt-4 p-4 rounded-xl border ${result.failed === 0 ? 'bg-green-50 border-green-200' : result.success === 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  {result.failed === 0 ? <CheckCircle size={18} className="text-green-600" /> : result.success === 0 ? <XCircle size={18} className="text-red-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
                  <p className="text-[14px] font-600 text-foreground">
                    {result.success} of {result.total} rows imported successfully
                  </p>
                </div>
                {result.errors.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-[12px] text-red-700 flex items-start gap-1.5">
                        <XCircle size={11} className="mt-0.5 shrink-0" /> {err}
                      </p>
                    ))}
                    {result.errors.length > 5 && <p className="text-[12px] text-muted-foreground">...and {result.errors.length - 5} more errors</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upload history */}
          {logs.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-[13px] font-600 text-foreground">Recent Upload History</p>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    {['Type', 'File', 'Total', 'Success', 'Failed', 'Date'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-2.5 capitalize font-500">{log.upload_type}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{log.file_name || '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums">{log.total_rows}</td>
                      <td className="px-4 py-2.5 tabular-nums text-green-700 font-500">{log.success_rows}</td>
                      <td className="px-4 py-2.5 tabular-nums text-red-600 font-500">{log.failed_rows}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
