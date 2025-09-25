import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SearchBar.css';
import { assets } from '../../assets/assets';
import { useNavigate, useLocation } from 'react-router-dom';

const defaultSuggestions = [
  'sushi','tacos','Panya','Fujiro','hey pelo','ramen','pizza','Tomibun','kumo ramen','Bread factory'
];

const STORAGE_KEY = 'search_history';

export default function SearchBar({ suggestions = defaultSuggestions }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [history, setHistory] = useState([]);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) {}
  }, []);

  // Close when click outside
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Sync from URL (?q=)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get('q') || '';
      if (q) setValue(q);
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const filteredSuggestions = useMemo(() => {
    if (!value) return suggestions;
    return suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 10);
  }, [value, suggestions]);

  const saveHistory = (term) => {
    const t = term.trim();
    if (!t) return;
    let next = [t, ...history.filter(h => h.toLowerCase() !== t.toLowerCase())];
    if (next.length > 8) next = next.slice(0, 8);
    setHistory(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
  };

  const removeHistoryItem = (term) => {
    const next = history.filter(h => h !== term);
    setHistory(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  };

  const doSearch = (term) => {
    const t = (term ?? value).trim();
    if (!t) return;
    saveHistory(t);
    setOpen(false);
    navigate(`/?q=${encodeURIComponent(t)}`);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
    if (e.key === 'ArrowDown' && !open) setOpen(true);
  };

  return (
    <div className="searchbar" ref={boxRef}>
      <div className={`searchbar-input ${open ? 'active': ''}`} onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Tìm kiếm theo tên nhà hàng, tên món..."
          aria-label="Tìm kiếm"
        />
        <button className="searchbar-icon" onClick={() => doSearch()} aria-label="Tìm kiếm">
          <img src={assets.search_icon} alt="" />
        </button>
      </div>

      {open && (
        <div className="searchbar-panel">
          <div className="panel-section">
            <div className="panel-title">Gợi ý</div>
            <div className="chip-wrap">
              {filteredSuggestions.map(s => (
                <button key={s} className="chip" onClick={() => doSearch(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="divider" />
          <div className="panel-section">
            <div className="panel-title row">
              <span>Lịch sử tìm kiếm</span>
              {history.length > 0 && <button className="clear-link" onClick={clearHistory}>Xoá</button>}
            </div>
            <ul className="history-list">
              {history.length === 0 && <li className="empty">Chưa có lịch sử</li>}
              {history.map(h => (
                <li key={h}>
                  <button className="history-term" onClick={() => doSearch(h)}>{h}</button>
                  <button className="history-remove" aria-label="Xoá" onClick={() => removeHistoryItem(h)}>×</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
