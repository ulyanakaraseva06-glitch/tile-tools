import React from 'react';
import ReactDOM from 'react-dom/client';
import { initAnalytics, pageContextProperties, track } from '../analytics/analyticsClient';
import '../styles/globals.css';
import '../styles/themes.css';
import './legal.css';
import { LegalPage } from './LegalPage';

const kind = window.location.pathname.includes('/privacy/') ? 'privacy' : 'terms';

document.body.classList.add('legal-runtime');
initAnalytics();
track(kind === 'privacy' ? 'privacy_view' : 'terms_view', pageContextProperties());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LegalPage kind={kind} />
  </React.StrictMode>
);
