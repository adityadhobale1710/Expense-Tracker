import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  ...props
}, ref) => {
  
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-600/10 hover:shadow-lg hover:shadow-primary-500/20 border border-transparent',
    secondary: 'bg-slate-800 hover:bg-slate-700/80 text-slate-100 border border-slate-700/65',
    danger: 'bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 border border-rose-500/20 hover:border-transparent',
    outline: 'bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 rounded-lg text-xs',
    md: 'px-4 py-2 rounded-xl text-sm',
    lg: 'px-5 py-2.5 rounded-xl text-base',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
});

Button.displayName = 'Button';
