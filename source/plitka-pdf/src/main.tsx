import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { initAnalytics, pageContextProperties, track } from './analytics/analyticsClient';
import './styles/globals.css';
import './styles/cabinet-header.css';
import './styles/cabinet-layout.css';
import './styles/cabinet-modal.css';
import './styles/cabinet-projects.css';
import './styles/cabinet-settings.css';
import './styles/cabinet-tabs.css';
import './styles/confirm-modal.css';
import './styles/editor-warning.css';
import './styles/export-check-modal.css';
import './styles/fullscreen-viewer.css';
import './styles/legal-modal.css';
import './styles/site-info-modal.css';
import './styles/library-modal.css';
import './site/sitePages.css';
import './styles/add-page-modal.css';
import './styles/modal-shell.css';
import './styles/page-library-controls.css';
import './styles/storage-warning.css';
import './styles/template-preview-modal.css';
import './styles/desktop-required.css';
import './styles/vilray-promos.css';
import './styles/themes.css';

document.body.classList.add('app-runtime');
initAnalytics();
track('editor_open', pageContextProperties());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
