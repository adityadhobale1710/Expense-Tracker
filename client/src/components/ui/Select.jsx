import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = React.forwardRef(({
  label,
  error,
  required = false,
  className = '',
  children,
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
        </label>
      )}
      <div className="relative w-full">
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`w-full bg-dark-900 border ${error ? 'border-rose-500/80 focus:ring-rose-500/20' : 'border-slate-700/80 focus:ring-primary-500/25'} rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 min-h-[44px] appearance-none cursor-pointer pr-10 ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-rose-400 font-bold leading-normal animate-fade-in">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
