'use client';

import React from 'react';
import { ChevronRight, Building2, Layers, Home, LayoutGrid } from 'lucide-react';
import type { HierarchyLevel, BreadcrumbState } from './PropertyManagementClient';

interface HierarchyBreadcrumbProps {
  level: HierarchyLevel;
  crumbs: BreadcrumbState;
  onNavigate: (target: HierarchyLevel) => void;
}

export default function HierarchyBreadcrumb({ level, crumbs, onNavigate }: HierarchyBreadcrumbProps) {
  const steps: Array<{ id: HierarchyLevel; label: string; icon: React.ReactNode; active: boolean; clickable: boolean }> = [
    { id: 'projects', label: 'Projects', icon: <LayoutGrid size={13} />, active: level === 'projects', clickable: level !== 'projects' },
    { id: 'buildings', label: crumbs.project?.name ?? 'Buildings', icon: <Building2 size={13} />, active: level === 'buildings', clickable: level === 'floors' || level === 'units' },
    { id: 'floors', label: crumbs.building?.name ?? 'Floors', icon: <Layers size={13} />, active: level === 'floors', clickable: level === 'units' },
    { id: 'units', label: crumbs.floor?.name ?? 'Units', icon: <Home size={13} />, active: level === 'units', clickable: false },
  ];

  const visibleSteps = steps.slice(0, ['projects', 'buildings', 'floors', 'units'].indexOf(level) + 1);

  return (
    <div className="flex items-center gap-1 bg-white border border-border rounded-xl px-4 py-2.5 shadow-card">
      {visibleSteps.map((step, i) => (
        <React.Fragment key={`crumb-${step.id}`}>
          {i > 0 && <ChevronRight size={13} className="text-muted-foreground/50 mx-0.5" />}
          <button
            onClick={() => step.clickable && onNavigate(step.id)}
            disabled={!step.clickable && !step.active}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-500 transition-all duration-150 ${
              step.active
                ? 'bg-primary/10 text-primary'
                : step.clickable
                ? 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                : 'text-muted-foreground/50 cursor-default'
            }`}
          >
            {step.icon}
            {step.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}