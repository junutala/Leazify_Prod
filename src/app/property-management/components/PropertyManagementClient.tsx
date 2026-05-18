'use client';

import React, { useState, useCallback } from 'react';
import PropertyHeader from './PropertyHeader';
import HierarchyBreadcrumb from './HierarchyBreadcrumb';
import ProjectsGrid from './ProjectsGrid';
import BuildingsView from './BuildingsView';
import FloorsView from './FloorsView';
import UnitsTable from './UnitsTable';
import AddProjectModal from './AddProjectModal';
import AddUnitModal from './AddUnitModal';

export type HierarchyLevel = 'projects' | 'buildings' | 'floors' | 'units';

export interface BreadcrumbState {
  project?: { id: string; name: string };
  building?: { id: string; name: string };
  floor?: { id: string; name: string };
}

export default function PropertyManagementClient() {
  const [level, setLevel] = useState<HierarchyLevel>('projects');
  const [crumbs, setCrumbs] = useState<BreadcrumbState>({});
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [unitsRefreshKey, setUnitsRefreshKey] = useState(0);
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);
  // Track usage types as we drill down
  const [projectUsageType, setProjectUsageType] = useState<string | undefined>();
  const [buildingUsageType, setBuildingUsageType] = useState<string | undefined>();
  const [buildingMaxFloors, setBuildingMaxFloors] = useState<number | undefined>();

  const drillToBuildings = (project: { id: string; name: string; usage_type?: string }) => {
    setCrumbs({ project });
    setProjectUsageType(project.usage_type);
    setBuildingUsageType(undefined);
    setBuildingMaxFloors(undefined);
    setLevel('buildings');
  };

  const drillToFloors = (building: { id: string; name: string; usage_type?: string; number_of_floors?: number }) => {
    setCrumbs((prev) => ({ ...prev, building }));
    setBuildingUsageType(building.usage_type || projectUsageType);
    setBuildingMaxFloors(building.number_of_floors);
    setLevel('floors');
  };

  const drillToUnits = (floor: { id: string; name: string }) => {
    setCrumbs((prev) => ({ ...prev, floor }));
    setLevel('units');
  };

  const navigateTo = (target: HierarchyLevel) => {
    if (target === 'projects') { setCrumbs({}); setProjectUsageType(undefined); setBuildingUsageType(undefined); }
    if (target === 'buildings') setCrumbs((prev) => ({ project: prev.project }));
    if (target === 'floors') setCrumbs((prev) => ({ project: prev.project, building: prev.building }));
    setLevel(target);
  };

  const handleUnitSaved = useCallback(() => {
    setUnitsRefreshKey(k => k + 1);
  }, []);

  const handleProjectSaved = useCallback(() => {
    setProjectsRefreshKey(k => k + 1);
  }, []);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      <PropertyHeader
        level={level}
        onAddProject={() => setShowAddProject(true)}
        onAddUnit={() => setShowAddUnit(true)}
      />
      <HierarchyBreadcrumb level={level} crumbs={crumbs} onNavigate={navigateTo} />

      {level === 'projects' && <ProjectsGrid key={projectsRefreshKey} onDrillDown={drillToBuildings} />}
      {level === 'buildings' && crumbs.project && (
        <BuildingsView
          projectId={crumbs.project.id}
          projectName={crumbs.project.name}
          onDrillDown={drillToFloors}
          projectUsageType={projectUsageType}
        />
      )}
      {level === 'floors' && crumbs.building && (
        <FloorsView
          buildingId={crumbs.building.id}
          buildingName={crumbs.building.name}
          onDrillDown={drillToUnits}
          buildingUsageType={buildingUsageType}
          buildingMaxFloors={buildingMaxFloors}
        />
      )}
      {level === 'units' && crumbs.floor && (
        <UnitsTable key={unitsRefreshKey} floorId={crumbs.floor.id} floorName={crumbs.floor.name} onAddUnit={() => setShowAddUnit(true)} />
      )}

      <AddProjectModal open={showAddProject} onClose={() => setShowAddProject(false)} onSaved={handleProjectSaved} />
      <AddUnitModal open={showAddUnit} onClose={() => setShowAddUnit(false)} crumbs={crumbs} onSaved={handleUnitSaved} />
    </div>
  );
}