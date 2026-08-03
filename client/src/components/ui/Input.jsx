import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  required = false,
  className = '',
  type = 'text',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        id={inputId}
        required={required}
        className={`w-full bg-dark-900 border ${error ? 'border-rose-500/80 focus:ring-rose-500/20' : 'border-slate-700/80 focus:ring-primary-500/25'} rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 min-h-[44px] ${className}`}
        {...props}
      />
      {error && (
        <p className="text-[11px] text-rose-400 font-bold leading-normal animate-fade-in">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
