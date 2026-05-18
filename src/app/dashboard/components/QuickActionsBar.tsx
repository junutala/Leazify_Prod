'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, DollarSign, Wrench, Users, RefreshCw, Receipt, Building2, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function QuickActionsBar() {
  const { t } = useLanguage();

  const actions = [
    { labelKey: t?.qa_new_lease, icon: <FileText size={16} />, href: '/leasing', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { labelKey: t?.qa_invoicing, icon: <DollarSign size={16} />, href: '/invoicing', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { labelKey: t?.qa_receipts, icon: <Receipt size={16} />, href: '/receipts', color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
    { labelKey: t?.qa_work_orders, icon: <Wrench size={16} />, href: '/work-orders', color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
    { labelKey: t?.qa_renewals, icon: <RefreshCw size={16} />, href: '/lease-renewals', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { labelKey: t?.qa_properties, icon: <Building2 size={16} />, href: '/property-management', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
    { labelKey: t?.qa_staff, icon: <Users size={16} />, href: '/project-assignment', color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
    { labelKey: t?.qa_reports, icon: <BarChart3 size={16} />, href: '/reports', color: 'text-slate-600 bg-slate-50 hover:bg-slate-100' },
  ];

  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground mb-3">{t?.qa_title}</p>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {actions?.map((action) => (
          <Link
            key={action?.labelKey}
            href={action?.href}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-150 ${action?.color}`}
          >
            {action?.icon}
            <span className="text-[11px] font-600 text-center leading-tight">{action?.labelKey}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
