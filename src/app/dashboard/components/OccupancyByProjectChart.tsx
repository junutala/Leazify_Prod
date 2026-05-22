'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectOccupancy {
  project: string;
  occupancy: number;
  units: number;
}

function getBarColor(occ: number) {
  if (occ >= 90) return 'hsl(142,71%,45%)';
  if (occ >= 75) return 'hsl(214,91%,49%)';
  if (occ >= 60) return 'hsl(38,92%,50%)';
  return 'hsl(0,84%,60%)';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { project: string; units: number } }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-border rounded-xl shadow-modal px-4 py-3 text-[13px]">
      <p className="font-600 text-foreground mb-1">{d.payload.project}</p>
      <p className="text-muted-foreground">{t?.opc_occupancy}: <span className="font-600 text-foreground tabular-nums">{d.value}%</span></p>
      <p className="text-muted-foreground">{t?.opc_units}: <span className="font-600 text-foreground tabular-nums">{d.payload.units}</span></p>
    </div>
  );
}

export default function OccupancyByProjectChart() {
  const supabase = createClient();
  const [data, setData] = useState<ProjectOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { assignedProjectIds, authLoading } = useAuth();

  // Keep ref always pointing to latest fetchData to avoid stale closure in realtime callback
  const fetchDataRef = React.useRef<() => void>(() => {});

  async function fetchData() {
    // Wait for auth context to finish loading before fetching
    if (authLoading) return;

    setLoading(true);
    try {
      let projectsQuery = supabase.from('projects').select('id, name').order('name');

      // Filter projects by assignment for staff users
      if (assignedProjectIds !== null) {
        if (assignedProjectIds.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }
        projectsQuery = projectsQuery.in('id', assignedProjectIds);
      }

      const { data: projects } = await projectsQuery;

      if (!projects || projects.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Use leases (active) to determine occupancy — more reliable than units.status
      const [unitsRes, leasesRes] = await Promise.all([
        supabase.from('units').select('id, status, floors(buildings(project_id))'),
        supabase.from('leases').select('id, unit_id, status').eq('status', 'active'),
      ]);

      const units: any[] = unitsRes.data || [];
      const activeLeases: any[] = leasesRes.data || [];
      const occupiedUnitIds = new Set(activeLeases.map((l) => l.unit_id).filter(Boolean));

      const points: ProjectOccupancy[] = projects.map((p) => {
        const projectUnits = units.filter(
          (u: any) => u.floors?.buildings?.project_id === p.id
        );
        const total = projectUnits.length;
        const occupied = projectUnits.filter((u: any) => occupiedUnitIds.has(u.id)).length;
        const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
        return {
          project: p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
          occupancy: pct,
          units: total,
        };
      }).filter((p) => p.units > 0);

      setData(points);
    } catch (e) {
      console.error('OccupancyByProject fetch error', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // Keep ref always pointing to latest fetchData
  useEffect(() => {
    fetchDataRef.current = fetchData;
  });

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('occupancy-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => fetchDataRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, () => fetchDataRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchDataRef.current())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignedProjectIds, authLoading]);

  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5 h-full">
      <div className="mb-5">
        <h3 className="text-[15px] font-600 text-foreground">{t?.opc_title}</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">{t?.opc_subtitle}</p>
      </div>
      <div className="flex gap-3 mb-4">
        {[
          { id: 'leg-high', color: 'hsl(142,71%,45%)', label: '≥90%' },
          { id: 'leg-good', color: 'hsl(214,91%,49%)', label: '75-89%' },
          { id: 'leg-warn', color: 'hsl(38,92%,50%)', label: '60-74%' },
          { id: 'leg-low', color: 'hsl(0,84%,60%)', label: '<60%' },
        ].map((l) => (
          <div key={l.id} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-[13px] text-muted-foreground">
          {t?.opc_no_data}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={20}>
            <CartesianGrid stroke="hsl(220,13%,91%)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="project"
              tick={{ fontSize: 10, fill: 'hsl(220,9%,46%)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: 'hsl(220,9%,46%)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220,14%,96%)' }} />
            <Bar dataKey="occupancy" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.occupancy)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}