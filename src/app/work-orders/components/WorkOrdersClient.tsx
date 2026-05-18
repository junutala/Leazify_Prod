'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ListChecks, Search, Filter, RefreshCw, X, Eye } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface WorkOrder {
  id: string;
  wo_number: string;
  skill_type: string;
  amount: number;
  payment_terms: string;
  payer: string;
  status: string;
  other_instructions: string;
  created_at: string;
  projects?: { name: string };
  buildings?: { name: string };
  floors?: { name: string };
  service_providers?: { name: string };
}

const woStatuses = ['draft', 'issued', 'in_progress', 'completed', 'cancelled'];
const statusColors: Record<string, string> = { draft: 'default', issued: 'info', in_progress: 'warning', completed: 'success', cancelled: 'error' };
const paymentTermLabels: Record<string, string> = { immediate: 'Immediate', '15_days': '15 Days', '30_days': '30 Days', quarterly: 'Quarterly', half_yearly: 'Half Yearly', annually: 'Annually' };

function GenerateWOModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [approvedSRs, setApprovedSRs] = useState<any[]>([]);
  const [approvedMRs, setApprovedMRs] = useState<any[]>([]);
  const [selProject, setSelProject] = useState('');
  const [selProvider, setSelProvider] = useState('');
  const [selectedSRs, setSelectedSRs] = useState<string[]>([]);
  const [selectedMRs, setSelectedMRs] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('immediate');
  const [payer, setPayer] = useState('landlord');
  const [instructions, setInstructions] = useState('');

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
    supabase.from('service_providers').select('id, name, skill_type, skills').eq('is_active', true).order('name').then(({ data }) => setProviders(data || []));
  }, [open, assignedProjectIds]);

  const handleSearch = async () => {
    if (!selProject || !selProvider) { setSaveError('Please select both a project and a service provider'); return; }
    setSearching(true);
    setSaveError('');

    // Find approved quotes for this provider
    const { data: approvedQuotes } = await supabase
      .from('quote_submissions')
      .select('service_request_id, maintenance_request_id, quote_amount')
      .eq('provider_id', selProvider)
      .eq('status', 'approved');

    const approvedSRIds = (approvedQuotes || []).filter((q: any) => q.service_request_id).map((q: any) => q.service_request_id);
    const approvedMRIds = (approvedQuotes || []).filter((q: any) => q.maintenance_request_id).map((q: any) => q.maintenance_request_id);
    const quoteAmountMap = new Map<string, number>();
    (approvedQuotes || []).forEach((q: any) => {
      if (q.service_request_id) quoteAmountMap.set(q.service_request_id, q.quote_amount);
      if (q.maintenance_request_id) quoteAmountMap.set(q.maintenance_request_id, q.quote_amount);
    });

    const srPromise = approvedSRIds.length > 0
      ? supabase.from('service_requests').select('id, title, status, charge_amount, charge_submitted, units(unit_name, unit_number)').in('id', approvedSRIds)
      : Promise.resolve({ data: [] });

    const mrPromise = approvedMRIds.length > 0
      ? supabase.from('maintenance_requests').select('id, description, area_description, status, charge_amount, charge_submitted').in('id', approvedMRIds).eq('project_id', selProject)
      : Promise.resolve({ data: [] });

    // Also include completed requests assigned to this provider (legacy flow)
    const [srRes, mrRes, completedSRRes, completedMRRes] = await Promise.all([
      srPromise,
      mrPromise,
      supabase.from('service_requests').select('id, title, status, charge_amount, charge_submitted, units(unit_name, unit_number)').eq('status', 'completed').eq('provider_id', selProvider),
      supabase.from('maintenance_requests').select('id, description, area_description, status, charge_amount, charge_submitted').eq('status', 'completed').eq('provider_id', selProvider).eq('project_id', selProject),
    ]);

    // Merge and deduplicate
    const allSRs = [...(srRes.data || []), ...(completedSRRes.data || [])];
    const allMRs = [...(mrRes.data || []), ...(completedMRRes.data || [])];
    const uniqueSRs = Array.from(new Map(allSRs.map(r => [r.id, r])).values());
    const uniqueMRs = Array.from(new Map(allMRs.map(r => [r.id, r])).values());

    // Attach quote amounts
    const srWithQuotes = uniqueSRs.map(r => ({ ...r, quote_amount: quoteAmountMap.get(r.id) || r.charge_amount || 0 }));
    const mrWithQuotes = uniqueMRs.map(r => ({ ...r, quote_amount: quoteAmountMap.get(r.id) || r.charge_amount || 0 }));

    setApprovedSRs(srWithQuotes);
    setApprovedMRs(mrWithQuotes);
    setSearched(true);
    setSearching(false);
  };

  const handleGenerate = async () => {
    if (selectedSRs.length === 0 && selectedMRs.length === 0) { setSaveError('Select at least one SR or MR'); return; }
    setSaving(true);
    setSaveError('');

    const srTotal = approvedSRs.filter(sr => selectedSRs.includes(sr.id)).reduce((s: number, sr: any) => s + Number(sr.quote_amount || sr.charge_amount || 0), 0);
    const mrTotal = approvedMRs.filter(mr => selectedMRs.includes(mr.id)).reduce((s: number, mr: any) => s + Number(mr.quote_amount || mr.charge_amount || 0), 0);
    const totalAmount = srTotal + mrTotal;

    const woNum = `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    const provider = providers.find(p => p.id === selProvider);
    const { data: wo, error } = await supabase.from('work_orders').insert({
      wo_number: woNum,
      project_id: selProject,
      provider_id: selProvider,
      amount: totalAmount,
      payment_terms: paymentTerms,
      payer,
      other_instructions: instructions,
      status: 'issued',
      skill_type: provider?.skill_type || (provider?.skills?.[0]) || 'electrical',
    }).select().single();

    if (error) { setSaving(false); setSaveError(error.message); return; }

    if (wo) {
      const links = [
        ...selectedSRs.map(id => ({ work_order_id: wo.id, service_request_id: id })),
        ...selectedMRs.map(id => ({ work_order_id: wo.id, maintenance_request_id: id })),
      ];
      if (links.length > 0) await supabase.from('work_order_service_requests').insert(links);
    }

    setSaving(false);
    setSelProject(''); setSelProvider(''); setSelectedSRs([]); setSelectedMRs([]); setSearched(false);
    onSaved(); onClose();
  };

  const inputCls = 'w-full px-3.5 py-2.5 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const labelCls = 'block text-[12px] font-500 text-foreground mb-1';

  const totalSelected = selectedSRs.length + selectedMRs.length;
  const totalAmount = [
    ...approvedSRs.filter(sr => selectedSRs.includes(sr.id)),
    ...approvedMRs.filter(mr => selectedMRs.includes(mr.id)),
  ].reduce((s: number, r: any) => s + Number(r.quote_amount || r.charge_amount || 0), 0);

  return (
    <Modal open={open} onClose={() => { setSelProject(''); setSelProvider(''); setSelectedSRs([]); setSelectedMRs([]); setSearched(false); onClose(); }} title={t.wo_modal_title} subtitle={t.wo_modal_subtitle} size="lg">
      <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
        {saveError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {saveError}</div>}

        <div>
          <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.wo_step1_title}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.lbl_project} *</label>
              <select className={inputCls} value={selProject} onChange={e => setSelProject(e.target.value)}>
                <option value="">{t.lbl_select_project}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.lbl_provider} *</label>
              <select className={inputCls} value={selProvider} onChange={e => setSelProvider(e.target.value)}>
                <option value="">{t.wo_select_provider}</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.skills || [p.skill_type]).join(', ')})</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={handleSearch} disabled={searching || !selProject || !selProvider}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
              <Search size={14} /> {searching ? t.wo_searching : t.wo_search_requests}
            </button>
          </div>
        </div>

        {searched && (
          <>
            <hr className="border-border" />
            <div>
              <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.wo_step2_title}</h4>

              {approvedSRs.length === 0 && approvedMRs.length === 0 ? (
                <div className="p-4 bg-secondary/50 rounded-xl text-center text-[13px] text-muted-foreground">
                  {t.wo_no_approved}
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedSRs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[12px] font-600 text-foreground">{t.wo_sr_section} ({approvedSRs.length})</p>
                        <button onClick={() => setSelectedSRs(selectedSRs.length === approvedSRs.length ? [] : approvedSRs.map(sr => sr.id))}
                          className="text-[11px] text-primary hover:underline">
                          {selectedSRs.length === approvedSRs.length ? 'Deselect All' : t.inv_select_all}
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                        {approvedSRs.map(sr => (
                          <label key={sr.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 px-2 py-1.5 rounded">
                            <input type="checkbox" checked={selectedSRs.includes(sr.id)}
                              onChange={e => setSelectedSRs(prev => e.target.checked ? [...prev, sr.id] : prev.filter(id => id !== sr.id))}
                              className="accent-primary" />
                            <span className="text-[12px] flex-1">{sr.title} <span className="text-muted-foreground">({(sr.units as any)?.unit_name || 'Unit'})</span></span>
                            <span className="text-[11px] font-500 text-green-600">AED {Number(sr.quote_amount || 0).toLocaleString()}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{t.leasing_tenant_paid}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {approvedMRs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[12px] font-600 text-foreground">{t.wo_mr_section} ({approvedMRs.length})</p>
                        <button onClick={() => setSelectedMRs(selectedMRs.length === approvedMRs.length ? [] : approvedMRs.map(mr => mr.id))}
                          className="text-[11px] text-primary hover:underline">
                          {selectedMRs.length === approvedMRs.length ? 'Deselect All' : t.inv_select_all}
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                        {approvedMRs.map(mr => (
                          <label key={mr.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 px-2 py-1.5 rounded">
                            <input type="checkbox" checked={selectedMRs.includes(mr.id)}
                              onChange={e => setSelectedMRs(prev => e.target.checked ? [...prev, mr.id] : prev.filter(id => id !== mr.id))}
                              className="accent-primary" />
                            <span className="text-[12px] flex-1">{mr.description?.slice(0, 60)} <span className="text-muted-foreground">({mr.area_description || 'Common Area'})</span></span>
                            <span className="text-[11px] font-500 text-green-600">AED {Number(mr.quote_amount || 0).toLocaleString()}</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{t.leasing_landlord_paid}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {totalSelected > 0 && (
              <>
                <hr className="border-border" />
                <div>
                  <h4 className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{t.wo_step3_title}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>{t.wo_payment_terms}</label>
                      <select className={inputCls} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                        {Object.entries(paymentTermLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{t.wo_payer}</label>
                      <select className={inputCls} value={payer} onChange={e => setPayer(e.target.value)}>
                        <option value="landlord">Landlord</option>
                        <option value="tenant">Tenant</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>{t.wo_instructions}</label>
                      <textarea rows={2} className={`${inputCls} resize-none`} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder={t.wo_instructions_placeholder} />
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                    <span className="text-[13px] font-500 text-foreground">{totalSelected} {t.wo_total_selected}</span>
                    <span className="text-[15px] font-700 text-primary">Total: AED {totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={() => { setSelProject(''); setSelProvider(''); setSelectedSRs([]); setSelectedMRs([]); setSearched(false); onClose(); }}
            className="px-4 py-2.5 text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all">{t.btn_cancel}</button>
          {searched && totalSelected > 0 && (
            <button onClick={handleGenerate} disabled={saving}
              className="px-5 py-2.5 text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
              {saving ? t.wo_generating_btn : `${t.wo_generate_btn} (${totalSelected} items)`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function WODetailModal({ wo, open, onClose, onUpdated }: { wo: WorkOrder | null; open: boolean; onClose: () => void; onUpdated: () => void }) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [linkedItems, setLinkedItems] = useState<any[]>([]);

  useEffect(() => {
    if (!wo || !open) return;
    supabase.from('work_order_service_requests')
      .select('*, service_requests(title, units(unit_name)), maintenance_requests(description, area_description)')
      .eq('work_order_id', wo.id)
      .then(({ data }) => setLinkedItems(data || []));
  }, [wo, open]);

  if (!wo) return null;

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setUpdateError('');
    const updateData: any = { status: newStatus };
    if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();
    const { error } = await supabase.from('work_orders').update(updateData).eq('id', wo.id);
    setUpdating(false);
    if (error) { setUpdateError(error.message); return; }
    onUpdated(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`${t.wo_detail_title} ${wo.wo_number}`} subtitle={t.wo_detail_subtitle} size="md">
      <div className="p-5 space-y-4">
        {updateError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive"><X size={13} className="shrink-0" /> {updateError}</div>}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_project}</span><p className="font-500 mt-0.5">{wo.projects?.name || '—'}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_provider}</span><p className="font-500 mt-0.5">{wo.service_providers?.name || t.lbl_unassigned}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_amount}</span><p className="font-600 mt-0.5">AED {Number(wo.amount).toLocaleString()}</p></div>
          <div><span className="text-muted-foreground text-[12px]">{t.lbl_status}</span><div className="mt-1"><Badge variant={statusColors[wo.status] as any || 'default'} size="sm">{wo.status.replace('_', ' ')}</Badge></div></div>
        </div>

        {linkedItems.length > 0 && (
          <div>
            <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-2">Line Items ({linkedItems.length})</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
              {linkedItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 text-[12px]">
                  {item.service_requests ? (
                    <><span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full">SR</span><span>{item.service_requests.title}</span></>
                  ) : (
                    <><span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full">MR</span><span>{item.maintenance_requests?.description?.slice(0, 50)}</span></>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {wo.other_instructions && (
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider mb-1">{t.wo_instructions_label}</p>
            <p className="text-[13px]">{wo.other_instructions}</p>
          </div>
        )}
        <hr className="border-border" />
        <div>
          <p className="text-[12px] font-600 text-muted-foreground uppercase tracking-wider mb-2">{t.wo_update_status}</p>
          <div className="flex flex-wrap gap-2">
            {woStatuses.filter(s => s !== wo.status).map(s => (
              <button key={s} onClick={() => updateStatus(s)} disabled={updating}
                className="px-3 py-1.5 text-[12px] font-500 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 transition-all capitalize">
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function WorkOrdersClient() {
  const supabase = createClient();
  const { t } = useLanguage();
  const { assignedProjectIds } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    // If staff user with no assigned projects, show nothing
    if (assignedProjectIds !== null && assignedProjectIds.length === 0) {
      setWorkOrders([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('work_orders')
      .select('*, projects(name), buildings(name), floors(name), service_providers(name)')
      .order('created_at', { ascending: false });

    // Filter by assigned projects for staff users
    if (assignedProjectIds !== null && assignedProjectIds.length > 0) {
      query = query.in('project_id', assignedProjectIds);
    }

    const { data, error } = await query;
    if (error) setFetchError(error.message);
    setWorkOrders(data || []);
    setLoading(false);
  }, [assignedProjectIds]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('work-orders-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const filtered = workOrders.filter(wo => {
    const matchSearch = !search || wo.wo_number?.toLowerCase().includes(search.toLowerCase()) || wo.projects?.name?.toLowerCase().includes(search.toLowerCase()) || wo.service_providers?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || wo.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statuses = ['all', 'draft', 'issued', 'in_progress', 'completed', 'cancelled'];
  const counts = woStatuses.reduce((acc, s) => ({ ...acc, [s]: workOrders.filter(w => w.status === s).length }), {} as Record<string, number>);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.wo_title}</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.wo_subtitle}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all shrink-0">
          <ListChecks size={14} /> <span className="hidden sm:inline">{t.wo_new}</span><span className="sm:hidden">New</span>
        </button>
      </div>

      {fetchError && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive"><X size={14} className="shrink-0" /> {fetchError}<button onClick={fetchData} className="ml-auto text-[12px] underline">{t.btn_retry}</button></div>}

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {woStatuses.map(s => (
          <div key={s} className="bg-white rounded-xl border border-border shadow-card p-3 sm:p-4">
            <p className="text-[10px] sm:text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{s.replace('_', ' ')}</p>
            <p className="text-[20px] sm:text-[24px] font-700 text-foreground mt-1">{counts[s] || 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder={t.wo_search_placeholder} value={search} onChange={e => setSearch(e.target.value)}
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
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListChecks} title={t.wo_empty_title} description={t.wo_empty_desc} action={{ label: t.wo_new, onClick: () => setShowAdd(true) }} />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map(wo => (
                <div key={wo.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-600 text-primary">{wo.wo_number}</span>
                    <Badge variant={statusColors[wo.status] as any || 'default'} size="sm">{wo.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-500">{wo.projects?.name || '—'}</span>
                    <span className="font-600 tabular-nums">AED {Number(wo.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>{wo.service_providers?.name || t.lbl_unassigned}</span>
                    <button onClick={() => setSelectedWO(wo)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-[13px] min-w-[800px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    {[t.wo_col_wo_no, t.wo_col_project, t.wo_col_provider, t.wo_col_amount, t.wo_col_payer, t.wo_col_payment_terms, t.wo_col_status, t.wo_col_date, t.wo_col_actions].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(wo => (
                    <tr key={wo.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[12px] text-primary font-600">{wo.wo_number}</td>
                      <td className="px-4 py-3 font-500">{wo.projects?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{wo.service_providers?.name || t.lbl_unassigned}</td>
                      <td className="px-4 py-3 font-600 tabular-nums">AED {Number(wo.amount).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[11px] font-500 rounded-full ${wo.payer === 'tenant' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{wo.payer === 'tenant' ? 'Tenant' : 'Landlord'}</span></td>
                      <td className="px-4 py-3 text-[12px]">{paymentTermLabels[wo.payment_terms] || wo.payment_terms}</td>
                      <td className="px-4 py-3"><Badge variant={statusColors[wo.status] as any || 'default'} size="sm">{wo.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground text-[12px]">{new Date(wo.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedWO(wo)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={t.btn_view}><Eye size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <GenerateWOModal open={showAdd} onClose={() => setShowAdd(false)} onSaved={fetchData} />
      <WODetailModal wo={selectedWO} open={!!selectedWO} onClose={() => setSelectedWO(null)} onUpdated={fetchData} />
    </div>
  );
}
