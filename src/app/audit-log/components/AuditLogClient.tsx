'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ClipboardList, Search, Filter, RefreshCw, ChevronDown, ChevronRight, X, Clock, User, Tag, ArrowRight } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Badge from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAutoRefresh } from '@/contexts/DataRefreshContext';

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action: string;
  performed_by: string | null;
  performed_by_email: string | null;
  before_values: Record<string, any> | null;
  after_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  created: 'success',
  generated: 'success',
  updated: 'info',
  approved: 'success',
  rejected: 'error',
  deleted: 'error',
};

const entityColors: Record<string, string> = {
  project: 'info',
  lease: 'warning',
  invoice: 'success',
  work_order: 'default',
};

const actionLabels: Record<string, string> = {
  created: 'Created',
  generated: 'Generated',
  updated: 'Updated',
  approved: 'Approved',
  rejected: 'Rejected',
  deleted: 'Deleted',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-AE', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

function DiffViewer({ before, after }: { before: Record<string, any> | null; after: Record<string, any> | null }) {
  if (!before && !after) return <p className="text-[12px] text-muted-foreground italic">No value snapshot recorded.</p>;

  const allKeys = Array.from(new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]));

  if (allKeys.length === 0) return <p className="text-[12px] text-muted-foreground italic">No changes recorded.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-secondary/60">
            <th className="px-3 py-2 text-left font-600 text-muted-foreground uppercase tracking-wider text-[10px] w-1/4">Field</th>
            {before && <th className="px-3 py-2 text-left font-600 text-muted-foreground uppercase tracking-wider text-[10px] w-[37.5%]">Before</th>}
            {after && <th className="px-3 py-2 text-left font-600 text-muted-foreground uppercase tracking-wider text-[10px] w-[37.5%]">After</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {allKeys.map((key) => {
            const bVal = before?.[key];
            const aVal = after?.[key];
            const changed = JSON.stringify(bVal) !== JSON.stringify(aVal);
            return (
              <tr key={key} className={changed && before && after ? 'bg-amber-50/60' : ''}>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground font-500">{key}</td>
                {before && (
                  <td className={`px-3 py-2 font-mono text-[11px] ${changed && after ? 'text-destructive' : 'text-foreground'}`}>
                    {bVal === null || bVal === undefined ? <span className="italic text-muted-foreground">null</span> : String(bVal)}
                  </td>
                )}
                {after && (
                  <td className={`px-3 py-2 font-mono text-[11px] ${changed && before ? 'text-green-700 font-600' : 'text-foreground'}`}>
                    {aVal === null || aVal === undefined ? <span className="italic text-muted-foreground">null</span> : String(aVal)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.before_values || log.after_values;

  return (
    <div className="border-b border-border last:border-0">
      <div
        className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && setExpanded(e => !e)}
      >
        {/* Expand toggle */}
        <div className="mt-0.5 shrink-0 w-4">
          {hasDetails ? (
            expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />
          ) : null}
        </div>

        {/* Timestamp */}
        <div className="shrink-0 w-40">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock size={11} />
            <span>{formatDate(log.created_at)}</span>
          </div>
        </div>

        {/* Entity + Action */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={(entityColors[log.entity_type] as any) || 'default'} size="sm">
              {log.entity_type}
            </Badge>
            <Badge variant={(actionColors[log.action] as any) || 'default'} size="sm">
              {actionLabels[log.action] || log.action}
            </Badge>
            {log.entity_label && (
              <span className="text-[13px] font-600 text-foreground truncate">{log.entity_label}</span>
            )}
          </div>
          {log.entity_id && (
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">ID: {log.entity_id}</p>
          )}
        </div>

        {/* User */}
        <div className="shrink-0 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <User size={12} />
          <span className="truncate max-w-[160px]">{log.performed_by_email || 'System'}</span>
        </div>
      </div>

      {/* Expanded diff */}
      {expanded && hasDetails && (
        <div className="mx-4 mb-3 border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-secondary/40 border-b border-border flex items-center gap-2">
            <Tag size={12} className="text-muted-foreground" />
            <span className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">Change Details</span>
            {log.before_values && log.after_values && (
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="text-destructive font-500">Before</span>
                <ArrowRight size={11} />
                <span className="text-green-700 font-500">After</span>
              </div>
            )}
          </div>
          <DiffViewer before={log.before_values} after={log.after_values} />
        </div>
      )}
    </div>
  );
}

const ENTITY_TYPES = ['all', 'project', 'lease', 'invoice', 'work_order'];
const ACTIONS = ['all', 'created', 'generated', 'updated', 'approved', 'rejected', 'deleted'];

export default function AuditLogClient() {
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const { t } = useLanguage();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filterEntity !== 'all') query = query.eq('entity_type', filterEntity);
    if (filterAction !== 'all') query = query.eq('action', filterAction);
    if (filterDateFrom) query = query.gte('created_at', filterDateFrom);
    if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59');

    const { data, error } = await query;
    if (error) setFetchError(error.message);
    setLogs(data || []);
    setLoading(false);
  }, [filterEntity, filterAction, filterDateFrom, filterDateTo]);

  // Refetch when navigating back to this page
  useAutoRefresh('audit-log', fetchLogs);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.entity_label?.toLowerCase().includes(q) ||
      l.performed_by_email?.toLowerCase().includes(q) ||
      l.entity_type?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: logs.length,
    created: logs.filter(l => l.action === 'created' || l.action === 'generated').length,
    updated: logs.filter(l => l.action === 'updated').length,
    approved: logs.filter(l => l.action === 'approved').length,
    rejected: logs.filter(l => l.action === 'rejected').length,
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">{t.audit_title}</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{t.audit_subtitle}</p>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-all shrink-0">
          <RefreshCw size={13} /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: 'Total Events', value: stats.total, color: 'text-foreground' },
          { label: 'Created / Generated', value: stats.created, color: 'text-green-600' },
          { label: 'Updated', value: stats.updated, color: 'text-blue-600' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border shadow-card p-3 sm:p-4">
            <p className="text-[10px] sm:text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={`text-[20px] sm:text-[24px] font-700 mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by label, user, entity ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 text-[12px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              title="From date"
            />
            <span className="text-[12px] text-muted-foreground">→</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="px-3 py-2 text-[12px] bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              title="To date"
            />
            {(filterDateFrom || filterDateTo) && (
              <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Clear dates">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={12} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-500 uppercase tracking-wider">Entity:</span>
            {ENTITY_TYPES.map(e => (
              <button key={e} onClick={() => setFilterEntity(e)}
                className={`px-2.5 py-1 text-[11px] font-500 rounded-lg border transition-all ${filterEntity === e ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
                {e === 'all' ? 'All' : e.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-500 uppercase tracking-wider">Action:</span>
            {ACTIONS.map(a => (
              <button key={a} onClick={() => setFilterAction(a)}
                className={`px-2.5 py-1 text-[11px] font-500 rounded-lg border transition-all ${filterAction === a ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
                {a === 'all' ? 'All' : actionLabels[a] || a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive">
          <X size={14} className="shrink-0" /> {fetchError}
          <button onClick={fetchLogs} className="ml-auto text-[12px] underline">Retry</button>
        </div>
      )}

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {/* Column headers */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 bg-secondary/50 border-b border-border text-[11px] font-600 text-muted-foreground uppercase tracking-wider">
          <div className="w-4 shrink-0" />
          <div className="w-40 shrink-0">Timestamp</div>
          <div className="flex-1">Entity / Action / Label</div>
          <div className="shrink-0 w-44">Performed By</div>
        </div>

        {loading ? (
          <div className="p-6"><LoadingSkeleton rows={8} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audit events found"
            description="Entity changes will appear here once actions are performed"
          />
        ) : (
          <div>
            {filtered.map(log => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-[12px] text-muted-foreground text-center">
          Showing {filtered.length} of {logs.length} events (latest 500)
        </p>
      )}
    </div>
  );
}
