import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all duration-300 ${
        hoverable ? 'hover:scale-[1.01] hover:border-slate-600/70 hover:shadow-xl' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between pb-4 border-b border-slate-700/50 mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', icon: Icon }) => (
  <h3 className={`text-base font-black text-slate-100 flex items-center gap-2 ${className}`}>
    {Icon && <Icon className="w-4 h-4 text-primary-400 flex-shrink-0" />}
    <span>{children}</span>
  </h3>
);
