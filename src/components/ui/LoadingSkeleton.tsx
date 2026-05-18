import React from 'react';

export function SkeletonBlock({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} style={style} />;
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-card">
      <SkeletonBlock className="h-3 w-24 mb-3" />
      <SkeletonBlock className="h-8 w-32 mb-2" />
      <SkeletonBlock className="h-3 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 8 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`skel-col-${i}`} className="px-4 py-3">
          <SkeletonBlock className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <SkeletonBlock className={`w-full rounded-lg`} style={{ height }} />;
}

export default function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`skel-row-${i}`} className="flex gap-3">
          <SkeletonBlock className="h-4 flex-1" />
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}