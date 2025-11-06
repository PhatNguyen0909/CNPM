import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './FoodDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'
import { assets } from '../../assets/assets'
import menuAPI from '../../services/menuAPI'


const FoodDisplay = ({category}) => {
  const {restaurantId} = useParams();
  const navigate = useNavigate();
  const { restaurant_list, getRestaurantMenu, replaceRestaurantMenu } = useContext(StoreContext)
  const restaurant = useMemo(() => restaurant_list.find(r => r._id === restaurantId), [restaurant_list, restaurantId]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState(null);
  const FEATURED_CAT = 'Món được yêu thích';
  const foods = menuItems;

  const normalizeCategoryLabel = useCallback((cat) => {
    if (!cat) return '';
    if (typeof cat === 'string') return cat.trim();
    if (typeof cat === 'object') {
      const label = cat?.name ?? cat?.title ?? cat?.label ?? cat?.categoryName;
      if (label) return String(label).trim();
    }
    return String(cat).trim();
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    foods.forEach(f => {
      const label = normalizeCategoryLabel(f?.category);
      if (label) set.add(label);
    });
    const arr = Array.from(set);
    // Move featured to the front if present
    if (arr.includes(FEATURED_CAT)) {
      return [FEATURED_CAT, ...arr.filter(c => c !== FEATURED_CAT)];
    }
    return arr;
  }, [foods, normalizeCategoryLabel]);
  const normalizeMenuItem = useCallback((item, index = 0) => {
    if (!item) return null;
    const status = String(item.status ?? item.itemStatus ?? 'ACTIVE').toUpperCase();
    const baseId =
      item._id ??
      item.id ??
      item.itemId ??
      item.menuItemId ??
      `${restaurantId || 'menu'}-${index}`;
    const restaurantKey =
      item.restaurantId ??
      item.merchantId ??
      item.merchantID ??
      restaurantId;

    const price = Number(
      item.basePrice ??
      item.price ??
      item.defaultPrice ??
      item.amount ??
      0
    );

    const name = (item.name ?? item.itemName ?? 'Món mới').toString().trim();
    const description = (item.description ?? item.introduction ?? '').toString().trim();
    // Category can be a plain string or an object from API (e.g., { id, name, active })
    const categoryRaw = item.categoryName ?? item.category ?? item.groupName ?? 'Khác';
    const category = (() => {
      if (!categoryRaw) return 'Khác';
      if (typeof categoryRaw === 'string') return categoryRaw.trim() || 'Khác';
      if (typeof categoryRaw === 'object') {
        const label = categoryRaw?.name ?? categoryRaw?.title ?? categoryRaw?.label;
        if (label) return String(label).trim() || 'Khác';
      }
      return String(categoryRaw).trim() || 'Khác';
    })();

    return {
      _id: String(baseId),
      restaurantId: restaurantKey ? String(restaurantKey) : String(restaurantId || ''),
      name,
      description,
      price: Number.isFinite(price) ? price : 0,
      image: item.imgUrl ?? item.imageUrl ?? item.image ?? '',
      category,
      status,
      optionResponses: Array.isArray(item.optionResponses) ? item.optionResponses : [],
      raw: item,
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      setMenuItems([]);
      return;
    }
    try {
      // Ghi nhớ nhà hàng người dùng đang xem để dùng cho CTA ở giỏ hàng trống
      localStorage.setItem('lastRestaurantId', String(restaurantId))
    } catch {}
    const fallback = getRestaurantMenu(restaurantId) || [];
    setMenuItems(fallback);
  }, [restaurantId, getRestaurantMenu]);

  useEffect(() => {
    if (!restaurantId) return;
    const controller = new AbortController();
    const loadMenu = async () => {
      setMenuLoading(true);
      setMenuError(null);
      try {
        const rawList = await menuAPI.fetchMenuItemsByMerchant(restaurantId, controller.signal);
        const normalized = rawList
          .map((item, idx) => normalizeMenuItem(item, idx))
          .filter(Boolean)
          .filter(item => (item.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE');

        if (normalized.length > 0) {
          replaceRestaurantMenu(restaurantId, normalized);
          setMenuItems(normalized);
        } else {
          const fallback = getRestaurantMenu(restaurantId) || [];
          setMenuItems(fallback);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED") return;
        console.error("Không thể tải menu nhà hàng:", error);
        setMenuError(error);
        const fallback = getRestaurantMenu(restaurantId) || [];
        setMenuItems(fallback);
      } finally {
        setMenuLoading(false);
      }
    };

    loadMenu();
    return () => controller.abort();
  }, [restaurantId, normalizeMenuItem, replaceRestaurantMenu, getRestaurantMenu]);

  const [activeCat, setActiveCat] = useState('Tất cả');
  const [scrollingCat, setScrollingCat] = useState('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const barRef = useRef(null);
  const featuredScrollerRef = useRef(null);
  const sectionsRef = useRef({}); // map cat -> section element

  useEffect(() => {
    const onDocClick = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setShowCatDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);
  const filteredFoods = useMemo(() => {
    if (activeCat === 'Tất cả') return foods;
    return foods.filter(f => normalizeCategoryLabel(f?.category) === activeCat);
  }, [foods, activeCat, normalizeCategoryLabel]);

  const openingHoursInfo = useMemo(() => {
    if (!restaurant) return { today: '', list: [], summary: '', isOpen: false, closeAt: '' };
    const list = Array.isArray(restaurant.openingHours) ? restaurant.openingHours : [];
    const summary = restaurant.openingHoursSummary || '';
    const weekdayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayLabelMap = {
      sunday: 'Chủ nhật',
      monday: 'Thứ 2',
      tuesday: 'Thứ 3',
      wednesday: 'Thứ 4',
      thursday: 'Thứ 5',
      friday: 'Thứ 6',
      saturday: 'Thứ 7',
    };
    const normalizeDayLabel = (value) => {
      if (!value) return '';
      const str = String(value).trim();
      if (!str) return '';
      const lower = str.toLowerCase();
      if (dayLabelMap[lower]) return dayLabelMap[lower];
      const short = lower.slice(0, 3);
      switch (short) {
        case 'sun': return dayLabelMap.sunday;
        case 'mon': return dayLabelMap.monday;
        case 'tue': return dayLabelMap.tuesday;
        case 'wed': return dayLabelMap.wednesday;
        case 'thu': return dayLabelMap.thursday;
        case 'fri': return dayLabelMap.friday;
        case 'sat': return dayLabelMap.saturday;
        default: return str;
      }
    };
    const todayIdx = new Date().getDay(); // 0 = Sunday
    const dayStringToIndex = (value) => {
      if (!value) return NaN;
      const str = String(value).trim().toLowerCase();
      const fullMap = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
      };
      if (fullMap[str] !== undefined) return fullMap[str];
      const short = str.slice(0, 3);
      const shortMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      if (shortMap[short] !== undefined) return shortMap[short];
      // Vietnamese variants: CN, Chủ nhật, Thứ 2-7
      if (/\bcn\b|chủ nhật|chu nhat/.test(str)) return 0;
      const digitMatch = str.match(/\b([2-7])\b/);
      if (digitMatch) return Number(digitMatch[1]) - 1;
      return NaN;
    };
    let todayEntry = list.find(item => dayStringToIndex(item?.day ?? '') === todayIdx);
    if (!todayEntry) {
      const todayName = weekdayNames[todayIdx];
      todayEntry = list.find(item => {
        const label = item?.day ?? '';
        if (!label) return false;
        const normalized = String(label).toLowerCase();
        return normalized === todayName.toLowerCase() || normalized.startsWith(todayName.slice(0, 3).toLowerCase());
      });
    }
    const localizedList = list.map(entry => ({
      ...entry,
      dayLabel: normalizeDayLabel(entry?.day ?? entry?.label ?? ''),
    }));
    const replaceDayTokens = (text) => {
      if (!text) return '';
      let result = String(text);
      const fullMap = {
        Sunday: dayLabelMap.sunday,
        Monday: dayLabelMap.monday,
        Tuesday: dayLabelMap.tuesday,
        Wednesday: dayLabelMap.wednesday,
        Thursday: dayLabelMap.thursday,
        Friday: dayLabelMap.friday,
        Saturday: dayLabelMap.saturday,
      };
      const shortMap = {
        Sun: dayLabelMap.sunday,
        Mon: dayLabelMap.monday,
        Tue: dayLabelMap.tuesday,
        Wed: dayLabelMap.wednesday,
        Thu: dayLabelMap.thursday,
        Fri: dayLabelMap.friday,
        Sat: dayLabelMap.saturday,
      };
      Object.entries(fullMap).forEach(([en, vn]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        result = result.replace(regex, vn);
      });
      Object.entries(shortMap).forEach(([en, vn]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        result = result.replace(regex, vn);
      });
      return result;
    };
    const localizedSummary = localizedList.length > 0
      ? localizedList.map(({ day, dayLabel, label }) => `${dayLabel || day}: ${label}`).join(' | ')
      : replaceDayTokens(summary);
    // --- Parse today's hours to figure out if currently open and the closing time ---
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const timeToken = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;
    const toMinutes = (token) => {
      if (!token) return NaN;
      const t = token.trim();
      const m = t.match(timeToken);
      if (!m) return NaN;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2] ?? '0', 10);
      const ap = (m[3] || '').toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      if (h >= 0 && h < 24 && min >= 0 && min < 60) return h * 60 + min;
      return NaN;
    };
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const fmt = (mins) => {
      const m = ((mins % 1440) + 1440) % 1440; // keep in [0,1440)
      const hh = Math.floor(m / 60);
      const mm = m % 60;
      return `${pad(hh)}:${pad(mm)}`;
    };
    const normalizeLabel = (text) => String(text || '').replace(/[–—to]/gi, '-');
    const parseRanges = (label) => {
      const str = normalizeLabel(label);
      if (!str || /đóng|closed/i.test(str)) return [];
      // split by comma for multiple windows
      return str.split(/\s*,\s*/).map(seg => {
        const parts = seg.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
        if (parts.length < 2) return null;
        const start = toMinutes(parts[0]);
        const end = toMinutes(parts[1]);
        if (Number.isFinite(start) && Number.isFinite(end)) return { start, end };
        return null;
      }).filter(Boolean);
    };

    let isOpen = false;
    let closeAt = '';
    if (todayEntry?.label) {
      const ranges = parseRanges(todayEntry.label);
      for (const { start, end } of ranges) {
        // handle overnight (e.g., 20:00-02:00)
        const spansMidnight = end < start;
        const inRange = spansMidnight
          ? (minutesNow >= start || minutesNow < end)
          : (minutesNow >= start && minutesNow < end);
        if (inRange) {
          isOpen = true;
          closeAt = fmt(spansMidnight && minutesNow < end ? end : end); // same formatting
          break;
        }
      }
    }

    return {
      today: todayEntry?.label || '',
      list: localizedList,
      summary: localizedSummary,
      isOpen,
      closeAt,
    };
  }, [restaurant]);

  const cuisineTags = useMemo(() => {
    if (!restaurant) return [];
    const raw = Array.isArray(restaurant.cuisine)
      ? restaurant.cuisine
      : String(restaurant.cuisine || '').split(',');
    return raw.map(t => String(t).trim()).filter(Boolean);
  }, [restaurant]);

  const restaurantDescription = useMemo(() => {
    if (!restaurant) return '';
    return (
      restaurant.description ||
      restaurant.introduction ||
      restaurant.summary ||
      restaurant.about ||
      ''
    );
  }, [restaurant]);

  const restaurantContact = useMemo(() => {
    if (!restaurant) return '';
    return (
      restaurant.phone ||
      restaurant.contact ||
      restaurant.hotline ||
      restaurant.telephone ||
      ''
    );
  }, [restaurant]);

  // Reset scroll highlight when switching out of "Tất cả"
  useEffect(() => {
    if (activeCat !== 'Tất cả') {
      setScrollingCat('');
    }
  }, [activeCat]);

  useEffect(() => {
    if (activeCat !== 'Tất cả' && !categories.includes(activeCat)) {
      setActiveCat('Tất cả');
    }
  }, [categories, activeCat]);

  // Scrollspy: observe sections and highlight chip for category in view
  useEffect(() => {
    if (activeCat !== 'Tất cả') return; // only when showing grouped sections
    const observer = new IntersectionObserver(
      (entries) => {
        // pick the top-most intersecting section
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) {
          const cat = visible[0].target.getAttribute('data-cat') || '';
          setScrollingCat(cat);
        }
      },
      {
        root: null,
        // account for sticky bar height so section counts as visible a bit earlier
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0.1,
      }
    );

    const nodes = Object.values(sectionsRef.current || {});
    nodes.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [categories, activeCat]);

  const scrollToCategory = (cat) => {
    const el = sectionsRef.current?.[cat];
    if (!el) return;
    const offset = 80; // approximate sticky bar height
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

    return (
    <div className='food-display' id='food-display'>
      {restaurant && (
        <>
         <div className='Back-btn' onClick={() => navigate('/') }>
            <img src={assets.back} alt="" />
          </div>
        <div className="restaurant-header">
          <div className="rh-left">
            <img className="rh-image" src={restaurant.image} alt={restaurant.name} />
          </div>
          <div className="rh-right">
            <div className="rh-top-row">
              <div className="rh-name-wrap">
                <h1 className="rh-name">{restaurant.name}</h1>
                <button
                  type="button"
                  className="rh-info-btn"
                  aria-label="Xem thông tin nhà hàng"
                  onClick={() => setShowInfoModal(true)}
                >
                  <img src={assets.moreinfo_icon} alt="More info" />
                </button>
              </div>
              <button className="rh-fav-btn" type="button">❤ Thêm vào Yêu thích</button>
            </div>
            <div className="rh-meta">
              {/* Đánh giá: hiển thị sao kèm số điểm; nếu chưa có thì ghi (chưa có) */}
              {Number(restaurant?.rating || 0) > 0 ? (
                <span className="rh-rating" aria-label="Đánh giá">★ {Number(restaurant.rating).toFixed(1)}</span>
              ) : (
                <span className="rh-no-rating">(chưa có đánh giá)</span>
              )}
              
              {(openingHoursInfo.today || openingHoursInfo.summary) && (
                <>
                  <span className="rh-sep">•</span>
                  <span className="rh-open">
                    {openingHoursInfo.isOpen && openingHoursInfo.closeAt
                      ? `Mở cửa đến ${openingHoursInfo.closeAt}`
                      : (openingHoursInfo.today
                        ? `Hôm nay: ${openingHoursInfo.today}`
                        : `Giờ mở cửa: ${openingHoursInfo.summary}`)}
                  </span>
                </>
              )}
            </div>
            <div className="rh-address">{restaurant.address}</div>
            {cuisineTags.length > 0 && (
              <div className="rh-tags">
                {cuisineTags.map((t, i) => (
                  <span key={i} className="rh-tag">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}
      {showInfoModal && restaurant && (
        <div className="rest-info-modal" role="dialog" aria-modal="true">
          <div className="rest-info-content">
            <div className="rest-info-header">
              <div>
                <h2 className="rest-info-name">{restaurant.name}</h2>
                {cuisineTags.length > 0 && (
                  <div className="rest-info-tags">
                    {cuisineTags.map((t, i) => (
                      <span key={i}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="rest-info-close"
                aria-label="Đóng"
                onClick={() => setShowInfoModal(false)}
              >
                <img src={assets.cross_icon} alt="close" />
              </button>
            </div>
            <div className="rest-info-body">
              {restaurantDescription && (
                <section className="rest-info-section">
                  <h3>Giới thiệu</h3>
                  <p>{restaurantDescription}</p>
                </section>
              )}
              {restaurant.address && (
                <section className="rest-info-section">
                  <h3>Địa chỉ</h3>
                  <p>{restaurant.address}</p>
                </section>
              )}
              {(openingHoursInfo.list.length > 0 || openingHoursInfo.summary) && (
                <section className="rest-info-section">
                  <h3>Giờ hoạt động</h3>
                  {openingHoursInfo.list.length > 0 ? (
                    <div className="rest-info-hours-grid">
                      {openingHoursInfo.list.map(({ day, dayLabel, label }) => (
                        <div key={`${day}-${label}`} className="rest-info-hours-row">
                          <span className="rest-info-hours-day">{dayLabel || day}</span>
                          <span className="rest-info-hours-time">{label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>{openingHoursInfo.summary}</p>
                  )}
                </section>
              )}
              {restaurantContact && (
                <section className="rest-info-section">
                  <h3>Liên hệ</h3>
                  <p>{restaurantContact}</p>
                </section>
              )}
            </div>
          </div>
          <div className="rest-info-backdrop" onClick={() => setShowInfoModal(false)} aria-hidden="true" />
        </div>
      )}
      {menuLoading && <div className="menu-status">Đang tải menu...</div>}
      {menuError && !menuLoading && (
        <div className="menu-status warning">Không thể tải menu mới nhất. Hiển thị dữ liệu gần nhất.</div>
      )}
      <div className="menu-cat-bar" ref={barRef}>
        <div className="chips">
          <button
            className={`cat-chip ${(activeCat==='Tất cả' && !scrollingCat) ? 'active' : ''}`}
            onClick={()=> { setActiveCat('Tất cả'); setScrollingCat(''); setShowCatDropdown(false); }}
          >Tất cả</button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-chip ${ (activeCat!=='Tất cả' ? activeCat===cat : scrollingCat===cat) ? 'active' : ''}`}
              onClick={()=> {
                if (activeCat === 'Tất cả') {
                  scrollToCategory(cat);
                } else {
                  setActiveCat(cat);
                }
                setShowCatDropdown(false);
              }}
            >{cat}</button>
          ))}
        </div>
        <button
          type="button"
          className="cat-more"
          aria-label="Xem tất cả danh mục"
          onClick={() => setShowCatDropdown(v => !v)}
        >
          <img src={assets.detail_icon} alt="details" />
        </button>
        {showCatDropdown && (
          <div className="cat-dropdown">
            <button
              className={`cat-dd-item ${(activeCat==='Tất cả' && !scrollingCat) ? 'active' : ''}`}
              onClick={() => { setActiveCat('Tất cả'); setScrollingCat(''); setShowCatDropdown(false); }}
            >Tất cả</button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`cat-dd-item ${ (activeCat!=='Tất cả' ? activeCat===cat : scrollingCat===cat) ? 'active' : ''}`}
                onClick={() => {
                  if (activeCat === 'Tất cả') {
                    scrollToCategory(cat);
                  } else {
                    setActiveCat(cat);
                  }
                  setShowCatDropdown(false);
                }}
              >{cat}</button>
            ))}
          </div>
        )}
      </div>

      {activeCat === 'Tất cả' ? (
        categories.length ? (
          categories.map(cat => {
            const items = foods.filter(f => f.category === cat);
            if (!items.length) return null;
            const isFeatured = cat === FEATURED_CAT;
            if (isFeatured) {
              // render as carousel with 3 visible items
              return (
                <section
                  key={cat}
                  className="menu-section"
                  data-cat={cat}
                  ref={(el) => {
                    if (el) {
                      sectionsRef.current[cat] = el;
                    } else {
                      delete sectionsRef.current[cat];
                    }
                  }}
                >
                  <h2 className="section-title">{cat}</h2>
                  <div className="featured-row">
                    <button className="carousel-arrow left" aria-label="Prev" onClick={() => {
                      const scroller = featuredScrollerRef.current;
                      if (scroller) scroller.scrollBy({ left: -scroller.clientWidth, behavior: 'smooth' });
                    }}>‹</button>
                    <div className="featured-scroller" ref={featuredScrollerRef}>
                      {items.map((item) => (
                        <div key={item._id} className="featured-card">
                          <FoodItem variant="featured" id={item._id} restaurantId={restaurantId} name={item.name} description={item.description} price={item.price} image={item.image} />
                        </div>
                      ))}
                    </div>
                    <button className="carousel-arrow right" aria-label="Next" onClick={() => {
                      const scroller = featuredScrollerRef.current;
                      if (scroller) scroller.scrollBy({ left: scroller.clientWidth, behavior: 'smooth' });
                    }}>›</button>
                  </div>
                </section>
              );
            }
            return (
              <section
                key={cat}
                className="menu-section"
                data-cat={cat}
                ref={(el) => {
                  if (el) {
                    sectionsRef.current[cat] = el;
                  } else {
                    delete sectionsRef.current[cat];
                  }
                }}
              >
                <h2 className="section-title">{cat}</h2>
                <div className="food-display-list">
                  {items.map((item) => (
                    <FoodItem key={item._id} id={item._id} restaurantId={restaurantId} name={item.name} description={item.description} price={item.price} image={item.image} />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <>
            <h2 className="section-title">Menu của nhà hàng</h2>
            {foods.length ? (
              <div className="food-display-list">
                {foods.map((item) => (
                  <FoodItem key={item._id} id={item._id} restaurantId={restaurantId} name={item.name} description={item.description} price={item.price} image={item.image} />
                ))}
              </div>
            ) : (
              <p className="menu-empty">Nhà hàng chưa có món nào để hiển thị.</p>
            )}
          </>
        )
      ) : (
        <>
          <h2 className="section-title">{activeCat}</h2>
          {filteredFoods.length ? (
            <div className="food-display-list">
              {filteredFoods.map((item) => (
                <FoodItem key={item._id} id={item._id} restaurantId={restaurantId} name={item.name} description={item.description} price={item.price} image={item.image} />
              ))}
            </div>
          ) : (
            <p className="menu-empty">Không có món nào trong danh mục này.</p>
          )}
        </>
      )}
    </div>
  )
}

export default FoodDisplay
