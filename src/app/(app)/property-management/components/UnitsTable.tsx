'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ChevronUp, ChevronDown, Edit2, Trash2, Plus, CheckSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { Building2 } from 'lucide-react';

interface Unit {
  id: string;
  unit_number: string;
  unit_name: string;
  gla_sqft: number;
  usage_type: string;
  status: string;
  lockable: boolean;
  floors?: { name: string; buildings?: { name: string } };
}

interface UnitsTableProps {
  floorId: string;
  floorName: string;
  onAddUnit: () => void;
}

function EditUnitModal({ unit, open, onClose, onSaved }: { unit: Unit | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (unit) setForm({ unit_name: unit.unit_name || unit.unit_number, gla_sqft: unit.gla_sqft || 0, usage_type: unit.usage_type || 'office', status: unit.status || 'vacant', lockable: unit.lockable || false });
  }, [unit]);

  if (!unit) return null;
  const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('units').update(form).eq('id', unit.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Unit" size="sm">
      <div className="p-5 space-y-4">
        {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive">{error}</div>}
        <div>
          <label className={labelCls}>Unit Name</label>
          <input className={inputCls} value={form.unit_name || ''} onChange={e => setForm((f: any) => ({ ...f, unit_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>GLA (sqft)</label>
            <input type="number" className={inputCls} value={form.gla_sqft || 0} onChange={e => setForm((f: any) => ({ ...f, gla_sqft: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={labelCls}>Usage Type</label>
            <select className={inputCls} value={form.usage_type || 'office'} onChange={e => setForm((f: any) => ({ ...f, usage_type: e.target.value }))}>
              {['office', 'retail', 'mall', 'residential'].map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status || 'vacant'} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
              {['vacant', 'occupied', 'maintenance', 'reserved'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="lockable-edit" checked={form.lockable || false} onChange={e => setForm((f: any) => ({ ...f, lockable: e.target.checked }))} className="accent-primary" />
            <label htmlFor="lockable-edit" className="text-[13px] font-500 text-foreground cursor-pointer">Lockable</label>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? 'Saving...' : 'Update Unit'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function UnitsTable({ floorId, onAddUnit }: UnitsTableProps) {
  const supabase = createClient();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUsage, setFilterUsage] = useState('all');
  const [sortField, setSortField] = useState<keyof Unit>('unit_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('units')
      .select('*, floors(name, buildings(name))')
      .eq('floor_id', floorId)
      .order('unit_name');
    setUnits(data || []);
    setLoading(false);
  }, [floorId]);

  useEffect(() => { if (floorId) fetchUnits(); }, [fetchUnits]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this unit?')) return;
    await supabase.from('units').delete().eq('id', id);
    fetchUnits();
  };

  const toggleSort = (field: keyof Unit) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = units
    .filter(u => {
      const matchSearch = !search || (u.unit_name || u.unit_number || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || u.status === filterStatus;
      const matchUsage = filterUsage === 'all' || u.usage_type === filterUsage;
      return matchSearch && matchStatus && matchUsage;
    })
    .sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const SortIcon = ({ field }: { field: keyof Unit }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-muted-foreground/30" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  };

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search units..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground font-500">Status:</span>
            {['all', 'vacant', 'occupied', 'maintenance'].map(s => (
              <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`px-2.5 py-1 text-[11px] font-500 rounded-lg border transition-all ${filterStatus === s ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <span className="text-[12px] text-muted-foreground font-500 ml-2">Type:</span>
            {['all', 'office', 'retail', 'mall', 'residential'].map(u => (
              <button key={u} onClick={() => { setFilterUsage(u); setPage(1); }}
                className={`px-2.5 py-1 text-[11px] font-500 rounded-lg border transition-all ${filterUsage === u ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={onAddUnit}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all shrink-0">
            <Plus size={14} /> Add Unit
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary text-white px-5 py-3 rounded-xl shadow-card">
          <CheckSquare size={15} />
          <span className="text-[13px] font-500">{selected.size} unit{selected.size > 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button className="px-3 py-1.5 text-[12px] font-500 bg-white/15 rounded-lg hover:bg-white/25 transition-colors">Export Selected</button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-[12px] font-500 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <p className="text-[13px] text-muted-foreground">
            Showing <span className="font-600 text-foreground">{paginated.length}</span> of <span className="font-600 text-foreground">{filtered.length}</span> units
          </p>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>Rows per page:</span>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-border rounded-md px-2 py-1 text-[12px] bg-white outline-none focus:border-primary">
              {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ minWidth: '900px' }}>
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="px-4 py-2.5 w-10">
                  <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={() => {
                    if (selected.size === paginated.length) setSelected(new Set());
                    else setSelected(new Set(paginated.map(u => u.id)));
                  }} className="w-4 h-4 rounded border-border accent-primary" />
                </th>
                {[
                  { label: 'Unit ID', field: 'unit_name' as keyof Unit },
                  { label: 'GLA (sqft)', field: 'gla_sqft' as keyof Unit },
                  { label: 'Usage Type', field: 'usage_type' as keyof Unit },
                  { label: 'Status', field: 'status' as keyof Unit },
                  { label: 'Lockable', field: 'lockable' as keyof Unit },
                ].map(col => (
                  <th key={col.label} onClick={() => toggleSort(col.field)}
                    className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">{col.label}<SortIcon field={col.field} /></div>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState icon={Building2} title="No units found" description="Add a unit to this floor" action={{ label: 'Add Unit', onClick: onAddUnit }} />
                </td></tr>
              ) : (
                paginated.map((unit, rowIdx) => (
                  <tr key={unit.id} className={`border-b border-border transition-colors ${selected.has(unit.id) ? 'bg-primary/4' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-secondary/20'} hover:bg-primary/5`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(unit.id)} onChange={() => toggleSelect(unit.id)} className="w-4 h-4 rounded border-border accent-primary" />
                    </td>
                    <td className="px-4 py-3"><span className="font-mono text-[12px] font-500 text-primary">{unit.unit_name || unit.unit_number}</span></td>
                    <td className="px-4 py-3"><span className="font-mono text-[12px] tabular-nums">{(unit.gla_sqft || 0).toLocaleString()}</span></td>
                    <td className="px-4 py-3"><Badge variant={(unit.usage_type || 'office') as any}>{(unit.usage_type || 'office').charAt(0).toUpperCase() + (unit.usage_type || 'office').slice(1)}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={unit.status === 'occupied' ? 'active' : unit.status === 'vacant' ? 'default' : 'warning' as any}>{(unit.status || 'vacant').charAt(0).toUpperCase() + (unit.status || 'vacant').slice(1)}</Badge></td>
                    <td className="px-4 py-3"><span className={`text-[11px] font-500 px-2 py-0.5 rounded-md ${unit.lockable ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{unit.lockable ? 'Yes' : 'No'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditUnit(unit)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Edit unit"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(unit.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors" title="Delete unit"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <p className="text-[12px] text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-[12px] font-500 border border-border rounded-lg disabled:opacity-40 hover:bg-secondary transition-all">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-[12px] font-500 border border-border rounded-lg disabled:opacity-40 hover:bg-secondary transition-all">Next</button>
            </div>
          </div>
        )}
      </div>

      <EditUnitModal unit={editUnit} open={!!editUnit} onClose={() => setEditUnit(null)} onSaved={fetchUnits} />
    </div>
  );
}