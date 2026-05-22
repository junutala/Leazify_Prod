'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChartPoint {
  week: string;
  collected: number;
  invoiced: number;
}

const fmt = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const { t } = useLanguage();
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-modal px-4 py-3 text-[13px]">
      <p className="font-600 text-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={`tooltip-row-${i}`} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">
              {p.name === 'collected' ? t?.rcc_collected : p.name === 'invoiced' ? t?.rcc_invoiced : p.name}
            </span>
          </div>
          <span className="font-600 text-foreground tabular-nums">{fmt(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && payload[1].value > 0 && (
        <div className="mt-2 pt-2 border-t border-border flex justify-between">
          <span className="text-muted-foreground text-[11px]">{t?.rcc_collection_rate}</span>
          <span className="font-600 text-[11px] tabular-nums">
            {((payload[0].value / payload[1].value) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function RentCollectionChart() {
  const supabase = createClient();
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // Keep ref always pointing to latest fetchData to avoid stale closure in realtime callback
  const fetchDataRef = React.useRef<() => void>(() => {});

  async function fetchData() {
    setLoading(true);
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const fromDate = sixMonthsAgo.toISOString().split('T')[0];

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_type, status, total_amount, created_at, due_date')
        .eq('invoice_type', 'rent')
        .gte('created_at', fromDate)
        .order('created_at', { ascending: true });

      if (!invoices || invoices.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }

      const monthMap: Record<string, { collected: number; invoiced: number }> = {};
      const monthLabels: Record<string, string> = {};

      invoices.forEach((inv) => {
        const d = new Date(inv.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        monthLabels[key] = label;
        if (!monthMap[key]) monthMap[key] = { collected: 0, invoiced: 0 };
        monthMap[key].invoiced += Number(inv.total_amount || 0);
        if (inv.status === 'paid') {
          monthMap[key].collected += Number(inv.total_amount || 0);
        }
      });

      const points: ChartPoint[] = Object.keys(monthMap)
        .sort()
        .map((key) => ({
          week: monthLabels[key],
          collected: monthMap[key].collected,
          invoiced: monthMap[key].invoiced,
        }));

      setChartData(points);
    } catch (e) {
      console.error('RentCollectionChart fetch error', e);
      setChartData([]);
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
      .channel('rent-collection-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchDataRef.current())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5 h-full">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-600 text-foreground">{t?.rcc_title}</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t?.rcc_subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-primary inline-block" />
            <span className="text-muted-foreground">{t?.rcc_collected}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-border inline-block border border-dashed border-muted-foreground" />
            <span className="text-muted-foreground">{t?.rcc_invoiced}</span>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="h-[240px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-[13px] text-muted-foreground">
          {t?.rcc_no_data}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(214,91%,49%)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(214,91%,49%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradInvoiced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220,13%,91%)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="hsl(220,13%,91%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(220,13%,91%)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: 'hsl(220,9%,46%)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fontSize: 11, fill: 'hsl(220,9%,46%)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="invoiced"
              stroke="hsl(220,13%,78%)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#gradInvoiced)"
              name="invoiced"
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke="hsl(214,91%,49%)"
              strokeWidth={2}
              fill="url(#gradCollected)"
              name="collected"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}