import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { inject } from '@vercel/analytics';

// Error boundary — évite l'écran noir en cas de crash React
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('[DoddBet]', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0f1117', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24,
          textAlign: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 48 }}>⚡</div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Une erreur s'est produite</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 14 }}>
            Essaie de rafraîchir la page
          </p>
          <button onClick={() => window.location.reload()} style={{
            background: 'linear-gradient(135deg, #b45309, #eab308)', color: '#fff',
            border: 'none', borderRadius: 12, padding: '10px 24px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8,
          }}>Rafraîchir</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Vercel Analytics
inject();

// Enregistrement du Service Worker (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Enregistré — scope:', reg.scope))
      .catch(err => console.warn('[SW] Erreur:', err.message));
  });
}
