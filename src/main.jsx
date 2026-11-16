import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { SiteProvider } from './lib/site.jsx';
import { startReveal } from './lib/utils.js';
import { loaderFor, prefetchAll } from './routes.js';
import './index.css';

startReveal();

function mount() {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      {/* React Router 7 wraps route changes in startTransition: the current page stays visible until the next one is ready */}
      <BrowserRouter>
        <SiteProvider>
          <App />
        </SiteProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
  window.addEventListener('load', prefetchAll, { once: true });
  if (document.readyState === 'complete') prefetchAll();
}

// Load the landing page's code first, so the server-rendered first view is replaced by the finished
// page in one step (no blank frame or spinner in between). Falls back to mounting anyway on error.
const first = loaderFor(window.location.pathname);
if (first) first().then(mount, mount); else mount();
