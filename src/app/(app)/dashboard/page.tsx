import DashboardHeader from './components/DashboardHeader';
import KpiBentoGrid from './components/KpiBentoGrid';
import RentCollectionChart from './components/RentCollectionChart';
import OccupancyByProjectChart from './components/OccupancyByProjectChart';
import ExpiringLeasesTable from './components/ExpiringLeasesTable';
import ActivityFeed from './components/ActivityFeed';
import QuickActionsBar from './components/QuickActionsBar';

export default function DashboardPage() {
  return (      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <DashboardHeader />
        <QuickActionsBar />
        <div>
          <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground mb-3">Key Performance Indicators</p>
          <KpiBentoGrid />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-5">
          <div className="xl:col-span-3">
            <RentCollectionChart />
          </div>
          <div className="xl:col-span-2">
            <OccupancyByProjectChart />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
          <div className="xl:col-span-2">
            <ExpiringLeasesTable />
          </div>
          <div className="xl:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </div>
  );
}