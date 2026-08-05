import React, { useState } from 'react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { FileText, Download } from 'lucide-react';

/**
 * Download buttons component to retrieve PDF and DOCX reports using authorization tokens
 */
export default function DownloadButtons() {
  const [downloading, setDownloading] = useState(null); // 'pdf' | 'docx' | null

  const handleDownload = async (format) => {
    setDownloading(format);
    const toastId = toast.loading(`Preparing your ${format.toUpperCase()} report...`);
    try {
      const response = await api.get(`/ai/report/download?format=${format}`, {
        responseType: 'blob',
      });
      
      const fileExtension = format === 'docx' ? 'docx' : 'pdf';
      const blob = new Blob([response.data], { 
        type: format === 'docx' ? 'application/msword' : 'application/pdf' 
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FinMate_Financial_Report_${Date.now()}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} Statement downloaded successfully!`, { id: toastId });
    } catch (err) {
      console.error(`Failed to download ${format} report:`, err);
      toast.error(`Could not generate the ${format.toUpperCase()} file.`, { id: toastId });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <button
        onClick={() => handleDownload('pdf')}
        disabled={downloading !== null}
        className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95 border border-primary-500/20 shadow-md"
      >
        <FileText size={14} />
        {downloading === 'pdf' ? 'Creating PDF...' : 'Download PDF Statement'}
      </button>

      <button
        onClick={() => handleDownload('docx')}
        disabled={downloading !== null}
        className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95 border border-slate-600/30 shadow-md"
      >
        <Download size={14} />
        {downloading === 'docx' ? 'Creating DOCX...' : 'Download Word DOCX'}
      </button>
    </div>
  );
}
