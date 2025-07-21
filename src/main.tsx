import './assets/main.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/i18n';

const cspMeta = document.getElementById('csp-meta') as HTMLElement;
const currentHost = location.host.split(':')[0];

cspMeta.setAttribute(
  'content',
  `img-src 'self' data: https://192.168.50.161:4000 https://${currentHost}:4000 https://localhost:4000 https://127.0.0.1:4000 https://192.168.0.200:4000 ; default-src 'self'; script-src 'self' blob:; connect-src 'self' https: http: wss:; style-src 'self' 'unsafe-inline';`
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
