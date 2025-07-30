import './assets/main.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/i18n';

const cspMeta = document.getElementById('csp-meta') as HTMLElement;
const currentHost = location.host.split(':')[0];


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
