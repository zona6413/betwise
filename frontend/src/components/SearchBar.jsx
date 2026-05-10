import { useState, useRef, useEffect } from 'react';
import './SearchBar.css';

export default function SearchBar({ matches, onResult, onClear }) {
  const [query, setQuery]       = useState('');
  const [focused, setFocused]   = useState(false);
  const inputRef                = useRef(null);

  const suggestions = query.length >= 2
    ? getSuggestions(query, matches)
    : [];

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    if (q.length >= 2) {
      onResult(q);
    } else {
      onClear();
    }
  }

  function handleClear() {
    setQuery('');
    onClear();
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { handleClear(); inputRef.current?.blur(); }
  }

  return (
    <div className={`search-bar ${focused ? 'search-bar--focused' : ''}`}>
      <span className="search-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="Chercher une ligue ou un club…"
        value={query}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {query && (
        <button className="search-clear" onClick={handleClear} tabIndex={-1}>✕</button>
      )}
      {focused && suggestions.length > 0 && (
        <ul className="search-suggestions">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="search-suggestion"
              onMouseDown={() => {
                setQuery(s.label);
                onResult(s.label);
                inputRef.current?.blur();
              }}
            >
              <span className="sug-type">{s.type}</span>
              <span className="sug-label">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getSuggestions(query, matches) {
  const q = query.toLowerCase();
  const seen = new Set();
  const results = [];

  for (const m of matches) {
    // Ligue
    if (m.league?.toLowerCase().includes(q) && !seen.has(m.league)) {
      seen.add(m.league);
      results.push({ type: 'Ligue', label: m.league });
    }
    // Équipes
    for (const team of [m.homeTeam?.name, m.awayTeam?.name]) {
      if (team?.toLowerCase().includes(q) && !seen.has(team)) {
        seen.add(team);
        results.push({ type: 'Club', label: team });
      }
    }
    if (results.length >= 8) break;
  }

  return results;
}
