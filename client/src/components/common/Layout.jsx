import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 1.2 — Body scroll lock: prevent background scroll while mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [sidebarOpen]);

  // 1.3 — Auto-close drawer when viewport crosses into desktop/tablet width (≥1024px)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e) => {
      if (e.matches) setSidebarOpen(false);
    };
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return (
    // 1.1 — h-dvh replaces h-screen; CSS fallback (100vh) lives in index.css on .app-shell
    <div className="app-shell flex bg-dark-900 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        {/* 1.6 — Responsive padding: tight on phones, full on desktop */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
