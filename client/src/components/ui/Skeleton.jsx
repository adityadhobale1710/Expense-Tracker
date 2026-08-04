import React from 'react';

export const Skeleton = ({
  className = '',
  ...props
}) => {
  return (
    <div
      className={`animate-pulse bg-slate-800 rounded-xl ${className}`}
      {...props}
    />
  );
};

Skeleton.Card = ({ className = '' }) => (
  <div className={`card p-5 space-y-4 animate-pulse ${className}`}>
    <div className="flex justify-between items-center">
      <div className="h-4 bg-slate-700 rounded-lg w-1/3" />
      <div className="w-8 h-8 rounded-lg bg-slate-700" />
    </div>
    <div className="h-8 bg-slate-700 rounded-xl w-1/2" />
    <div className="h-3 bg-slate-800 rounded-md w-2/3" />
  </div>
);

Skeleton.Row = ({ cols = 4, className = '' }) => (
  <div className={`flex items-center gap-4 py-3 border-b border-slate-800 animate-pulse ${className}`}>
    <div className="w-8 h-8 rounded-lg bg-slate-700 flex-shrink-0" />
    <div className="flex-1 grid grid-cols-4 gap-4">
      <div className="h-3.5 bg-slate-700 rounded w-3/4 col-span-2" />
      <div className="h-3 bg-slate-700 rounded w-1/2" />
      <div className="h-3.5 bg-slate-700 rounded w-1/3 ml-auto" />
    </div>
  </div>
);

Skeleton.Chart = ({ className = '' }) => (
  <div className={`card p-5 animate-pulse flex flex-col justify-between ${className}`}>
    <div className="h-4 bg-slate-700 rounded-lg w-1/4 mb-6" />
    <div className="flex items-end gap-3.5 h-48 w-full px-2">
      <div className="h-[20%] bg-slate-700/60 rounded-t w-full" />
      <div className="h-[50%] bg-slate-700/70 rounded-t w-full" />
      <div className="h-[35%] bg-slate-700/60 rounded-t w-full" />
      <div className="h-[80%] bg-slate-700/70 rounded-t w-full" />
      <div className="h-[60%] bg-slate-700/60 rounded-t w-full" />
      <div className="h-[95%] bg-slate-700/70 rounded-t w-full" />
      <div className="h-[45%] bg-slate-700/60 rounded-t w-full" />
    </div>
  </div>
);
