'use client';

import React, { useState, useEffect } from 'react';
import { Building2, MapPin, TrendingUp, ChevronRight, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectsGridProps {
  onDrillDown: (project: { id: string; name: string; usage_type?: string }) => void;
}

export default function ProjectsGrid({ onDrillDown }: ProjectsGridProps) {
  const supabase = createClient();
  // assignedProjectIds: null = full access, string[] = scoped to these project IDs
  const { assignedProjectIds, authLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUsage, setFilterUsage] = useState('all');

  useEffect(() => {
    // Wait for auth context to finish loading permissions
    if (authLoading) return;

    const fetchProjects = async () => {
      setLoading(true);

      let query = supabase.from('projects').select('*, buildings(count)').order('name');

      // Scope to assigned projects for staff users
      if (assignedProjectIds !== null) {
        if (assignedProjectIds.length === 0) {
          setProjects([]);
          setLoading(false);
          return;
        }
        query = query.in('id', assignedProjectIds);
      }
      // assignedProjectIds === null → superadmin → no filter, fetch all

      const { data, error } = await query;
      if (error) console.error('[ProjectsGrid] fetch error:', error.message);
      setProjects(data || []);
      setLoading(false);
    };

    fetchProjects();
  }, [assignedProjectIds, authLoading]);

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase());
    const matchUsage = filterUsage === 'all' || p.usage_type === filterUsage;
    return matchSearch && matchUsage;
  });

  if (loading || authLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[13px] bg-white border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'office', 'retail', 'mall', 'residential'].map(u => (
            <button key={u} onClick={() => setFilterUsage(u)}
              className={`px-3 py-2 text-[12px] font-500 rounded-lg border transition-all duration-150 ${filterUsage === u ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary hover:text-foreground'}`}>
              {u.charAt(0).toUpperCase() + u.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'sum-projects', label: 'Total Projects', value: String(projects.length), icon: <Building2 size={15} /> },
          { id: 'sum-buildings', label: 'Total Buildings', value: String(projects.reduce((s, p) => s + ((p.buildings as any)?.[0]?.count || 0), 0)), icon: <Building2 size={15} /> },
          { id: 'sum-active', label: 'Active', value: String(projects.filter(p => p.status === 'active').length), icon: <TrendingUp size={15} /> },
          { id: 'sum-vat', label: 'VAT Registered', value: String(projects.filter(p => p.vat_registered).length), icon: <TrendingUp size={15} /> },
        ].map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-border px-4 py-3 shadow-card flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0">{s.icon}</div>
            <div>
              <p className="text-[11px] text-muted-foreground font-500">{s.label}</p>
              <p className="text-[15px] font-700 text-foreground tabular-nums">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Project cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No projects found" description="No projects have been assigned to you, or none match your search." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const buildingCount = (project.buildings as any)?.[0]?.count || 0;
            return (
              <div key={project.id}
                className="bg-white rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden cursor-pointer group"
                onClick={() => onDrillDown({ id: project.id, name: project.name, usage_type: project.usage_type })}>
                <div className={`h-1.5 w-full ${project.vat_registered ? 'bg-primary' : 'bg-secondary'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-600 text-foreground group-hover:text-primary transition-colors truncate">{project.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-muted-foreground text-[12px]">
                        <MapPin size={11} />
                        {[project.city, project.country].filter(Boolean).join(', ') || 'Location not set'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {project.usage_type && <Badge variant={project.usage_type as any}>{project.usage_type.charAt(0).toUpperCase() + project.usage_type.slice(1)}</Badge>}
                      {project.vat_registered && <span className="px-2 py-0.5 text-[10px] font-600 bg-green-100 text-green-700 rounded-full">VAT</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
                      <p className="text-[14px] font-700 text-foreground tabular-nums">{buildingCount}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Buildings</p>
                    </div>
                    <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
                      <p className="text-[14px] font-700 text-foreground tabular-nums capitalize">{project.status || 'active'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Status</p>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-[12px] text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-end pt-3 border-t border-border">
                    <div className="flex items-center gap-1 text-[12px] text-primary font-500 group-hover:gap-2 transition-all duration-150">
                      View Buildings <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}