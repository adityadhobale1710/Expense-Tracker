import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Info, Download, MoreHorizontal } from 'lucide-react';

export default function ChartCard({
  title,
  subtitle,
  children,
  onDownload,
  infoText,
  headerActions
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const cardContent = (
    <div className={`flex flex-col h-full space-y-4 ${isFullscreen ? 'p-8 bg-dark-900' : ''}`}>
      {/* Header Row */}
      <div className="flex justify-between items-start gap-4">
        
        {/* Title + Subtitle */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider truncate">{title}</h3>
            {infoText && (
              <div className="relative">
                <button
                  onMouseEnter={() => setShowInfo(true)}
                  onMouseLeave={() => setShowInfo(false)}
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 cursor-pointer"
                >
                  <Info size={12} />
                </button>
                <AnimatePresence>
                  {showInfo && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute left-0 mt-1 w-64 bg-dark-950 border border-slate-700/80 p-3 rounded-xl shadow-2xl z-50 text-[10px] text-slate-300 leading-relaxed font-medium backdrop-blur-md"
                    >
                      {infoText}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{subtitle}</p>}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {headerActions}
          
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-1.5 hover:bg-slate-700/40 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Download Graphic"
            >
              <Download size={14} />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-700/40 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Full Screen' : 'View Full Screen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

      </div>

      {/* Main Chart Body Container */}
      <div className={`flex-1 w-full min-h-0 ${isFullscreen ? 'h-[75dvh]' : 'h-64 sm:h-72'}`}>
        {children}
      </div>

    </div>
  );

  return (
    <>
      {/* Standard Inline Render */}
      {!isFullscreen ? (
        <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl hover:shadow-2xl transition-all h-full">
          {cardContent}
        </div>
      ) : (
        /* Fullscreen Overlay Render */
        <div className="fixed inset-0 bg-dark-900/90 z-50 p-4 md:p-6 backdrop-blur-md overflow-hidden flex flex-col justify-center">
          <motion.div
            layoutId={`fullscreen-chart-${title}`}
            className="bg-dark-900 border border-slate-700/60 rounded-3xl p-4 md:p-6 shadow-2xl w-full max-w-5xl mx-auto h-[90dvh] flex flex-col justify-between"
          >
            {cardContent}
          </motion.div>
        </div>
      )}
    </>
  );
}
