'use client';

import React from 'react';
import Sidebar from './Sidebar';
import MimicUserBar from './MimicUserBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <MimicUserBar />
        {/* On mobile, add top padding to account for the hamburger button */}
        <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}