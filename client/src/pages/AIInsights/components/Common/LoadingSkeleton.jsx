import React from 'react';

/**
 * Common LoadingSkeleton to render clean placeholder panels while APIs process
 */
export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      {/* Title & Subtitle skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2.5 w-1/2 md:w-1/3">
          <div className="h-7 bg-slate-800 rounded-lg w-2/3" />
          <div className="h-3.5 bg-slate-800 rounded-lg w-full" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="h-10 bg-slate-800 rounded-xl w-32 flex-1 md:flex-initial" />
          <div className="h-10 bg-slate-800 rounded-xl w-32 flex-1 md:flex-initial" />
        </div>
      </div>

      {/* Primary Dashboard score and executive brief deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-72 bg-slate-800 rounded-2xl" />
        <div className="lg:col-span-2 h-72 bg-slate-800 rounded-2xl" />
      </div>

      {/* Small stats cards skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-slate-800 rounded-2xl" />
        ))}
      </div>

      {/* Bottom section block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-800 rounded-2xl" />
        <div className="h-80 bg-slate-800 rounded-2xl" />
      </div>
    </div>
  );
}
