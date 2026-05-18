'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardHeader() {
  const [lastUpdated, setLastUpdated] = useState('');
  const [greeting, setGreeting] = useState('');
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const now = new Date();
    setLastUpdated(now?.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    const hour = now?.getHours();
    setGreeting(hour < 12 ? t?.dash_greeting_morning : hour < 17 ? t?.dash_greeting_afternoon : t?.dash_greeting_evening);
  }, [t]);

  const displayName = user?.user_metadata?.full_name?.split(' ')?.[0] || 'there';

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h1 className="text-[18px] sm:text-[22px] font-700 text-foreground">
            {greeting}, {displayName} 👋
          </h1>
        </div>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground flex flex-wrap items-center gap-1.5 sm:gap-2">
          {t?.dash_portfolio_overview}
          <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
            {t?.dash_live}
          </span>
          {lastUpdated && <span className="text-[11px] text-muted-foreground/60">· {lastUpdated}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => window.location?.reload()}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] sm:text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary hover:text-foreground transition-all duration-150"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">{t?.dash_refresh}</span>
        </button>
        <Link
          href="/analytics"
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] sm:text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary hover:text-foreground transition-all duration-150"
        >
          <TrendingUp size={14} />
          <span className="hidden sm:inline">{t?.dash_analytics}</span>
        </Link>
        <Link
          href="/property-management"
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">{t?.dash_add_property}</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>
    </div>
  );
}