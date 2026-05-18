'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Wrench, DollarSign, UserPlus, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_label: string | null;
  action: string;
  created_at: string;
}

type ActivityType = 'lease' | 'workorder' | 'payment' | 'onboard' | 'alert' | 'resolved' | 'default';

function getActivityType(entityType: string, action: string): ActivityType {
  if (entityType === 'lease') return 'lease';
  if (entityType === 'work_order') return 'workorder';
  if (entityType === 'invoice' && action === 'paid') return 'payment';
  if (entityType === 'tenant' && action === 'created') return 'onboard';
  if (action === 'deleted' || action === 'cancelled') return 'alert';
  if (action === 'closed' || action === 'resolved') return 'resolved';
  return 'default';
}

const typeConfig: Record<ActivityType, { icon: React.ReactNode; bg: string; text: string }> = {
  lease: { icon: <FileText size={13} />, bg: 'bg-blue-100', text: 'text-blue-600' },
  workorder: { icon: <Wrench size={13} />, bg: 'bg-orange-100', text: 'text-orange-600' },
  payment: { icon: <DollarSign size={13} />, bg: 'bg-green-100', text: 'text-green-600' },
  onboard: { icon: <UserPlus size={13} />, bg: 'bg-violet-100', text: 'text-violet-600' },
  alert: { icon: <AlertTriangle size={13} />, bg: 'bg-red-100', text: 'text-red-600' },
  resolved: { icon: <CheckCircle2 size={13} />, bg: 'bg-emerald-100', text: 'text-emerald-600' },
  default: { icon: <Activity size={13} />, bg: 'bg-secondary', text: 'text-muted-foreground' },
};

export default function ActivityFeed() {
  const supabase = createClient();
  const [activities, setActivities] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t?.af_just_now || 'just now';
    if (mins < 60) return `${mins}${t?.af_minutes_ago || 'm ago'}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t?.af_hours_ago || 'h ago'}`;
    const days = Math.floor(hrs / 24);
    return `${days}${t?.af_days_ago || 'd ago'}`;
  }

  function formatTitle(action: string, entityType: string): string {
    const entity = entityType.replace(/_/g, ' ');
    const actionMap: Record<string, string> = {
      created: t?.af_action_created || 'New',
      updated: t?.af_action_updated || 'Updated',
      deleted: t?.af_action_deleted || 'Deleted',
      paid: t?.af_action_paid || 'Payment received',
      approved: t?.af_action_approved || 'Approved',
      rejected: t?.af_action_rejected || 'Rejected',
      closed: t?.af_action_closed || 'Closed',
      resolved: t?.af_action_resolved || 'Resolved',
      cancelled: t?.af_action_cancelled || 'Cancelled',
    };
    const prefix = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
    return `${prefix} ${entity}`;
  }

  async function fetchActivity() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, entity_type, entity_label, action, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      setActivities(data || []);
    } catch (e) {
      console.error('ActivityFeed fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivity();

    const channel = supabase
      .channel('activity-feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, fetchActivity)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-border shadow-card h-full">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[15px] font-600 text-foreground">{t?.af_title}</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">{t?.af_subtitle}</p>
      </div>
      <div className="divide-y divide-border overflow-y-auto max-h-[400px] scrollbar-thin">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`sk-${i}`} className="flex items-start gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-secondary shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-secondary rounded" />
                <div className="h-2.5 w-48 bg-secondary rounded" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">
            {t?.af_no_activity}
          </div>
        ) : (
          activities.map((a) => {
            const type = getActivityType(a.entity_type, a.action);
            const cfg = typeConfig[type];
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-secondary/30 transition-colors duration-100">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.text}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-500 text-foreground leading-snug">
                    {formatTitle(a.action, a.entity_type)}
                  </p>
                  {a.entity_label && (
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{a.entity_label}</p>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                  {formatRelativeTime(a.created_at)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}