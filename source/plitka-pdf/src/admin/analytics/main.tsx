import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminAnalyticsApp } from './AdminAnalyticsApp';
import '../../styles/globals.css';
import '../../styles/themes.css';
import './analytics.css';

document.body.classList.add('analytics-admin-runtime');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminAnalyticsApp />
  </React.StrictMode>
);

