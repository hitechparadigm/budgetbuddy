// BudgetBuddy Web Application Entry Point
// React web application built with Vite

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '';

/**
 * Vite's built-in preload error event fires when a lazy-loaded chunk 404s
 * (e.g. after a new deploy invalidates old hashed filenames).
 * We handle it here — before React mounts — for the fastest possible recovery:
 * one silent page reload, guarded by a timestamp to prevent infinite loops.
 */
const CHUNK_RELOAD_KEY = 'bb_chunk_reload_at';
window.addEventListener('vite:preloadError', () => {
  const lastReload = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 60_000) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    window.location.reload();
  }
});

const rootEl = document.getElementById('root') as HTMLElement;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded via DOMContentLoaded, initializing app');
    mountApp(rootEl);
  });
} else {
  console.log('Document already loaded, initializing app immediately');
  mountApp(rootEl);
}

function mountApp(el: HTMLElement) {
  const root = ReactDOM.createRoot(el);
  root.render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}
