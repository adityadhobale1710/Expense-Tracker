import React from 'react';
import { X } from 'lucide-react';

export default function ConfirmDialog({ dialog, config, IconComponent }) {
  return (
    <div className="relative w-full max-w-[480px] bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col gap-4 text-slate-100 z-10">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex gap-3 items-center">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.iconBg}`}>
            <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <h3 className="text-base font-black tracking-tight">{dialog.title}</h3>
        </div>
        <button
          onClick={() => dialog.resolve(false)}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 bg-slate-955/20 hover:bg-slate-850 border border-slate-800 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div>
        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          {dialog.message}
        </p>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-850/50">
        <button
          type="button"
          onClick={() => dialog.resolve(false)}
          className="px-4 py-2 bg-slate-950/30 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-xl text-xs font-black transition-all cursor-pointer"
        >
          {dialog.cancelText || 'Cancel'}
        </button>
        <button
          type="button"
          onClick={() => dialog.resolve(true)}
          className={`px-5 py-2 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg ${config.btnBg}`}
        >
          {dialog.confirmText || 'Confirm'}
        </button>
      </div>
    </div>
  );
}
