import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Load persisted theme preference
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
        .catch((err) => console.error('PWA Service Worker registration failed:', err));
    });
  } else {
    window.addEventListener('load', async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
        if (registrations.length > 0) {
          console.log('Unregistered old service workers in development:', registrations.length);
        }
      } catch (err) {
        console.error('Failed to unregister service workers in dev:', err);
      }
    });
  }
}
