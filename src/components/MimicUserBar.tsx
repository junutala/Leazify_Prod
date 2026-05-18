'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth, MimicTarget } from '@/contexts/AuthContext';
import { Eye, EyeOff, ChevronDown, User, HardHat, Search, X, AlertCircle } from 'lucide-react';

interface TenantOption {
  person_id: string;
  name: string;
  email: string | null;
}

interface ProviderOption {
  provider_id: string;
  name: string;
  email: string | null;
}

export default function MimicUserBar() {
  const { isSuperAdmin, mimicTarget, startMimic, stopMimic } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [roleTab, setRoleTab] = useState<'tenant' | 'service_provider'>('tenant');
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = isSuperAdmin();

  // Close dropdown on outside click
  useEffect(() => {
    if (!isAdmin) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isAdmin]);

  // Load tenants and providers when dropdown opens
  useEffect(() => {
    if (!isAdmin || !open) return;
    setLoadingList(true);
    setListError('');

    const load = async () => {
      try {
        // Load tenants: persons who have at least one lease as lessee
        const { data: lesseePersons, error: lpErr } = await supabase
          .from('leases')
          .select('lessee_person_id, persons!leases_lessee_person_id_fkey(id, name, email)')
          .not('lessee_person_id', 'is', null);

        if (lpErr) throw lpErr;

        const tenantMap = new Map<string, TenantOption>();
        (lesseePersons || []).forEach((row: any) => {
          const p = row.persons;
          if (p && !tenantMap.has(p.id)) {
            tenantMap.set(p.id, { person_id: p.id, name: p.name || 'Unknown', email: p.email });
          }
        });
        setTenants(Array.from(tenantMap.values()).sort((a, b) => a.name.localeCompare(b.name)));

        // Load service providers
        const { data: providerData, error: pvErr } = await supabase
          .from('service_providers')
          .select('id, name, email')
          .eq('is_active', true)
          .order('name');

        if (pvErr) throw pvErr;
        setProviders((providerData || []).map((p: any) => ({ provider_id: p.id, name: p.name, email: p.email })));
      } catch (err: any) {
        setListError(err.message || 'Failed to load users');
      } finally {
        setLoadingList(false);
      }
    };

    load();
  }, [isAdmin, open]);

  // Only render for superadmin — placed AFTER all hooks
  if (!isAdmin) return null;

  const handleSelect = (target: MimicTarget) => {
    startMimic(target);
    setOpen(false);
    setSearch('');
    // Navigate to the appropriate portal
    if (target.role === 'tenant') {
      router.push('/tenant-portal');
    } else {
      router.push('/service-provider-portal');
    }
  };

  const handleStop = () => {
    stopMimic();
    router.push('/dashboard');
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredProviders = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase())
  );

  // ─── Active mimic banner ──────────────────────────────────────────────────
  if (mimicTarget) {
    return (
      <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 z-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 shrink-0">
            {mimicTarget.role === 'tenant' ? <User size={13} className="text-amber-700" /> : <HardHat size={13} className="text-amber-700" />}
          </div>
          <div className="min-w-0">
            <span className="text-[12px] font-700 text-amber-800">Mimicking as {mimicTarget.role === 'tenant' ? 'Tenant' : 'Service Provider'}:</span>
            <span className="ml-1.5 text-[12px] font-600 text-amber-900">{mimicTarget.name}</span>
            {mimicTarget.email && (
              <span className="ml-1 text-[11px] text-amber-600 hidden sm:inline">({mimicTarget.email})</span>
            )}
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-700 uppercase tracking-wide">
            <Eye size={10} /> Helpdesk View
          </span>
        </div>
        <button
          onClick={handleStop}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-600 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg transition-colors shrink-0"
        >
          <EyeOff size={13} />
          Exit Mimic
        </button>
      </div>
    );
  }

  // ─── Selector bar (only visible to superadmin when not mimicking) ─────────
  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-3 z-50" ref={dropdownRef}>
      <div className="flex items-center gap-1.5 text-[11.5px] font-600 text-slate-500 shrink-0">
        <Eye size={13} />
        <span className="hidden sm:inline">Helpdesk Mimic:</span>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-500 bg-white border border-slate-200 hover:border-primary/50 text-slate-700 rounded-lg transition-colors shadow-sm"
        >
          <User size={13} className="text-slate-400" />
          <span>Select user to mimic…</span>
          <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1.5 w-80 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {/* Role tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setRoleTab('tenant')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-600 transition-colors ${
                  roleTab === 'tenant' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User size={13} />
                Tenants
              </button>
              <button
                onClick={() => setRoleTab('service_provider')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-600 transition-colors ${
                  roleTab === 'service_provider' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <HardHat size={13} />
                Providers
              </button>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-7 pr-7 py-1.5 text-[12px] bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto">
              {loadingList ? (
                <div className="flex items-center justify-center py-6 text-[12px] text-muted-foreground gap-2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Loading…
                </div>
              ) : listError ? (
                <div className="flex items-center gap-2 px-4 py-4 text-[12px] text-destructive">
                  <AlertCircle size={13} /> {listError}
                </div>
              ) : roleTab === 'tenant' ? (
                filteredTenants.length === 0 ? (
                  <p className="text-center py-6 text-[12px] text-muted-foreground">No tenants found</p>
                ) : (
                  filteredTenants.map(t => (
                    <button
                      key={t.person_id}
                      onClick={() => handleSelect({
                        id: t.person_id,
                        name: t.name,
                        email: t.email,
                        role: 'tenant',
                        person_id: t.person_id,
                      })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-700 shrink-0">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-600 text-foreground truncate">{t.name}</p>
                        {t.email && <p className="text-[11px] text-muted-foreground truncate">{t.email}</p>}
                      </div>
                    </button>
                  ))
                )
              ) : (
                filteredProviders.length === 0 ? (
                  <p className="text-center py-6 text-[12px] text-muted-foreground">No service providers found</p>
                ) : (
                  filteredProviders.map(p => (
                    <button
                      key={p.provider_id}
                      onClick={() => handleSelect({
                        id: p.provider_id,
                        name: p.name,
                        email: p.email,
                        role: 'service_provider',
                        provider_id: p.provider_id,
                      })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#0f766e]/10 flex items-center justify-center text-[#0f766e] text-[11px] font-700 shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-600 text-foreground truncate">{p.name}</p>
                        {p.email && <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>}
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>

      <span className="text-[11px] text-slate-400 hidden md:inline">
        Assume a tenant or service provider's view for helpdesk support
      </span>
    </div>
  );
}
