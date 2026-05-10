import './BottomNav.css';

const ITEMS = [
  { id: 'all',      label: 'Accueil',   icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )},
  { id: 'live',     label: 'Direct',    icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
    </svg>
  )},
  { id: 'value',    label: 'Value',     icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  )},
  { id: 'today',    label: "Auj.",      icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { id: 'taux',     label: 'Stats',     icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )},
  { id: 'paris',    label: 'Mes paris', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  )},
];

export default function BottomNav({ activeTab, onTabChange, liveCount, valueCount, pendingBets = 0 }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map(item => (
        <button
          key={item.id}
          className={`bnav-item ${activeTab === item.id ? 'bnav-item--active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className="bnav-icon">
            {item.icon}
            {item.id === 'live'  && liveCount  > 0 && <span className="bnav-badge bnav-badge--red">{liveCount}</span>}
            {item.id === 'value' && valueCount  > 0 && <span className="bnav-badge bnav-badge--green">{valueCount}</span>}
            {item.id === 'paris' && pendingBets > 0 && <span className="bnav-badge bnav-badge--purple">{pendingBets}</span>}
          </span>
          <span className="bnav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
