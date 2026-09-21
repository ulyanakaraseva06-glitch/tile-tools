import React from 'react';
import ReactDOM from 'react-dom/client';
import { LandingPage } from './LandingPage';
import { initAnalytics, pageContextProperties, track } from '../analytics/analyticsClient';
import '../styles/globals.css';
import '../styles/themes.css';
import '../styles/modal-shell.css';
import '../styles/site-info-modal.css';
import '../site/sitePages.css';
import './landing.css';

document.body.classList.add('landing-runtime');
initAnalytics();
track('landing_view', pageContextProperties());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>
);
