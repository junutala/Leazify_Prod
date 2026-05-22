'use client';

import React from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import type { HierarchyLevel } from './PropertyManagementClient';

interface PropertyHeaderProps {
  level: HierarchyLevel;
  onAddProject: () => void;
  onAddUnit: () => void;
}

const levelTitles: Record<HierarchyLevel, { title: string; sub: string }> = {
  projects: { title: 'Property Management', sub: 'Browse and manage your entire real estate portfolio hierarchy' },
  buildings: { title: 'Buildings', sub: 'Manage buildings within the selected project' },
  floors: { title: 'Floors', sub: 'Browse floors within the selected building' },
  units: { title: 'Units', sub: 'Manage individual units, leases, and financials' },
};

export default function PropertyHeader({ level, onAddProject, onAddUnit }: PropertyHeaderProps) {
  const { title, sub } = levelTitles[level];
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h1 className="text-[18px] sm:text-[22px] font-600 text-foreground">{title}</h1>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button className="flex items-center gap-1.5 px-3 py-2 text-[12px] sm:text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary hover:text-foreground transition-all duration-150">
          <Download size={14} />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 text-[12px] sm:text-[13px] font-500 text-muted-foreground border border-border rounded-lg hover:bg-secondary hover:text-foreground transition-all duration-150">
          <Upload size={14} />
          <span className="hidden sm:inline">Bulk Upload</span>
        </button>
        {level === 'projects' && (
          <button
            onClick={onAddProject}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Project</span><span className="sm:hidden">Add</span>
          </button>
        )}
        {level === 'units' && (
          <button
            onClick={onAddUnit}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-500 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Unit</span><span className="sm:hidden">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}