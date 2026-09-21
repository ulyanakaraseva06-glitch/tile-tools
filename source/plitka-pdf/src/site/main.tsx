import React from 'react';
import ReactDOM from 'react-dom/client';
import { initAnalytics, pageContextProperties, track } from '../analytics/analyticsClient';
import '../styles/globals.css';
import '../styles/themes.css';
import './sitePages.css';
import { AboutPage } from './AboutPage';
import { HelpPage } from './HelpPage';

const isAbout = window.location.pathname.includes('/about/');

document.body.classList.add('site-runtime');
initAnalytics();
track(isAbout ? 'about_view' : 'help_view', pageContextProperties());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAbout ? <AboutPage /> : <HelpPage />}
  </React.StrictMode>
);
