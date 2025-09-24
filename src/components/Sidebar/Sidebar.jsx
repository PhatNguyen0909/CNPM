import React, { useState, useEffect, useRef } from 'react';
import './Sidebar.css';
import { menu_list } from '../../assets/assets';

/*
  Sidebar lọc:
  - Theo danh mục (menu_list) -> gọi setSelectedCuisine
  - Theo rating (>= ngưỡng)
*/
const ratingOptions = [4.5, 4, 3.5];

const Sidebar = ({ selectedCuisine, setSelectedCuisine, ratingFilter, setRatingFilter, sortBy, setSortBy, mobileVisible = false, onCloseMobile }) => {
  // Sidebar luôn hiển thị bên trái nên không cần state đóng/mở
  const [hasDeal, setHasDeal] = useState(false); // placeholder toggle (Ưu đãi)

  // Đảm bảo nếu đang chọn category mà không có trong menu_list nữa thì reset
  useEffect(() => {
    if (selectedCuisine && selectedCuisine !== 'All') {
      const exists = menu_list.some(m => m.menu_name === selectedCuisine);
      if (!exists) setSelectedCuisine('All');
    }
  }, [selectedCuisine, setSelectedCuisine]);

  const handleCategoryClick = (menuName) => {
    setSelectedCuisine(prev => prev === menuName ? 'All' : menuName);
  };

  const mobileClass = mobileVisible ? 'show-mobile' : '';

  return (
    <aside className={`sidebar ${mobileClass}`} aria-label="Bộ lọc nhà hàng">
      <div className="sidebar-header">
        {onCloseMobile && (
          <button type="button" className="sidebar-close-btn" onClick={onCloseMobile} aria-label="Đóng bộ lọc">✕</button>
        )}
      </div>

      {/* Sắp xếp */}
      <CustomSortDropdown sortBy={sortBy} setSortBy={setSortBy} />

      <div className="separator" />

      {/* Ưu đãi */}
      <section className="filter-section">
        <div className="section-row">
          <h4>Ưu đãi</h4>
          <label className="switch">
            <input type="checkbox" checked={hasDeal} onChange={() => setHasDeal(v => !v)} />
            <span className="slider" />
          </label>
        </div>
      </section>

      <div className="separator" />

      {/* Đánh giá */}
      <section className="filter-section">
        <h4>Đánh giá</h4>
        <div className="rating-radio-group">
          {ratingOptions.map(r => (
            <label key={r} className={`radio-row ${ratingFilter === r ? 'checked' : ''}`}>
              <input
                type="radio"
                name="rating-filter"
                value={r}
                checked={ratingFilter === r}
                onChange={() => setRatingFilter(r)}
              />
              <span className="custom-radio" />
              <span className="radio-label">{r} sao trở lên</span>
              <span className="stars" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1;
                  // highlight full stars up to floor(r), then half if needed (not needed here because .5 increments handled by unicode alt)
                  return <span key={i} className={starValue <= Math.floor(r) ? 'star full' : 'star'}>★</span>
                })}
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="separator" />

      {/* Danh mục */}
      <section className="filter-section">
        <h4>Danh mục</h4>
        <div className="category-radio-group">
          <label className={`radio-row ${selectedCuisine === 'All' ? 'checked' : ''}`}>
            <input
              type="radio"
              name="category-filter"
              value="All"
              checked={selectedCuisine === 'All'}
              onChange={() => setSelectedCuisine('All')}
            />
            <span className="custom-radio" />
            <span className="radio-label">Tất cả</span>
          </label>
          {menu_list.map(item => (
            <label key={item.menu_name} className={`radio-row ${selectedCuisine === item.menu_name ? 'checked' : ''}`}>
              <input
                type="radio"
                name="category-filter"
                value={item.menu_name}
                checked={selectedCuisine === item.menu_name}
                onChange={() => handleCategoryClick(item.menu_name)}
              />
              <span className="custom-radio" />
              <span className="radio-label">{item.menu_name}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="bottom-actions">
        <button className="reset-btn" onClick={() => { setSelectedCuisine('All'); setRatingFilter(0); }}>
          Reset lọc
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

// ---- Custom Sort Dropdown Component ----
const sortOptions = [
  { value: 'mostReviews', label: 'Nhiều đánh giá nhất' },
  { value: 'highestRating', label: 'Đánh giá cao nhất' },
  { value: 'newest', label: 'Mới nhất' }
];

function CustomSortDropdown({ sortBy, setSortBy }) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(() => sortOptions.findIndex(o=>o.value===sortBy) || 0);
  const wrapRef = useRef(null);

  // Close when click outside
  useEffect(()=>{
    const handler = (e)=>{
      if(wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return ()=> document.removeEventListener('mousedown', handler);
  },[]);

  // Keyboard navigation
  const onKeyDown = (e)=>{
    if(!open && (e.key==='Enter' || e.key===' ')) { e.preventDefault(); setOpen(true); return; }
    if(!open) return;
    if(e.key==='Escape') { setOpen(false); return; }
    if(e.key==='ArrowDown') { e.preventDefault(); setFocusIndex(i=> (i+1)%sortOptions.length); }
    if(e.key==='ArrowUp') { e.preventDefault(); setFocusIndex(i=> (i-1+sortOptions.length)%sortOptions.length); }
    if(e.key==='Enter') { e.preventDefault(); const opt = sortOptions[focusIndex]; if(opt){ setSortBy(opt.value); setOpen(false);} }
  };

  useEffect(()=>{
    const idx = sortOptions.findIndex(o=>o.value===sortBy);
    if(idx>=0) setFocusIndex(idx);
  },[sortBy]);

  const current = sortOptions.find(o=>o.value===sortBy) || sortOptions[0];

  return (
    <section className="filter-section" ref={wrapRef}>
      <h4>Sắp xếp theo</h4>
      <div className={`custom-dropdown ${open ? 'open' : ''}`}>
        <button
          type="button"
            className="cd-trigger"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={()=> setOpen(o=>!o)}
            onKeyDown={onKeyDown}
        >
          <span className="cd-value">{current.label}</span>
          <span className="cd-arrow" aria-hidden="true">▾</span>
        </button>
        {open && (
          <ul className="cd-menu" role="listbox" aria-label="Sắp xếp theo" tabIndex={-1}>
            {sortOptions.map((opt,i)=>{
              const active = opt.value===sortBy;
              const focused = i===focusIndex;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  className={`cd-option ${active? 'active':''} ${focused? 'focused':''}`}
                  onMouseEnter={()=> setFocusIndex(i)}
                  onClick={()=> { setSortBy(opt.value); setOpen(false); }}
                >
                  <span>{opt.label}</span>
                  {active && <span className="cd-check" aria-hidden="true">✔</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}