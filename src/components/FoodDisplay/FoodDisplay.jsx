import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import './FoodDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'
import { assets } from '../../assets/assets'
import menuAPI from '../../services/menuAPI'


const FoodDisplay = ({category}) => {
  const {restaurantId} = useParams();
  const { restaurant_list, getRestaurantMenu, replaceRestaurantMenu } = useContext(StoreContext)
  const restaurant = useMemo(() => restaurant_list.find(r => r._id === restaurantId), [restaurant_list, restaurantId]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState(null);
  const FEATURED_CAT = 'Món được yêu thích';
  const foods = menuItems;

  const categories = useMemo(() => {
    const set = new Set();
    foods.forEach(f => { if (f.category) set.add(f.category); });
    const arr = Array.from(set);
    // Move featured to the front if present
    if (arr.includes(FEATURED_CAT)) {
      return [FEATURED_CAT, ...arr.filter(c => c !== FEATURED_CAT)];
    }
    return arr;
  }, [foods]);
  const normalizeMenuItem = useCallback((item, index = 0) => {
    if (!item) return null;
    const status = String(item.status ?? item.itemStatus ?? 'ACTIVE').toUpperCase();
    const pickFirst = (...values) => {
      for (const value of values) {
        if (value === null || value === undefined) continue;
        const val = typeof value === 'string' ? value.trim() : value;
        if (val === '' || val === undefined || val === null) continue;
        return val;
      }
      return null;
    };

    const backendIdRaw = pickFirst(
      item.menuItemId,
      item.menuItemID,
      item.menuItemCode,
      item.itemId,
      item.itemID,
      item.id,
      item._id,
      item.code,
      item.uuid,
      item.menuItem?.id,
      item.menuItemResponse?.menuItemId,
      item.menuItemResponse?.id,
      item.menu_item_id,
      item.menu_item_Id,
      item.menu_itemID
    );

    const normalizeNumericId = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const numeric = Number(String(value).trim());
      if (Number.isFinite(numeric) && String(numeric) === String(value).trim()) {
        return numeric;
      }
      return null;
    };

    const backendIdNumeric = normalizeNumericId(backendIdRaw);

    const baseId = backendIdRaw ?? `${restaurantId || 'menu'}-${index}`;
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
    const categoryRaw = item.categoryName ?? item.category ?? item.groupName ?? 'Khác';
    const category = String(categoryRaw || 'Khác').trim() || 'Khác';

    return {
      _id: String(baseId),
      restaurantId: restaurantKey ? String(restaurantKey) : String(restaurantId || ''),
      name,
      description,
      price: Number.isFinite(price) ? price : 0,
      image: item.imgUrl ?? item.imageUrl ?? item.image ?? '',
      category,
      status,
      menuItemBackendId: backendIdRaw,
      menuItemNumericId: backendIdNumeric,
      optionResponses: Array.isArray(item.optionResponses) ? item.optionResponses : [],
      raw: item,
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      setMenuItems([]);
      return;
    }
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
          console.log('Loaded menu items', normalized.slice(0, 5).map(entry => ({
            id: entry._id,
            backendId: entry.menuItemBackendId,
            rawId: entry.raw?.menuItemId ?? entry.raw?.id ?? entry.raw?._id,
            status: entry.status,
          })));
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
    return foods.filter(f => f.category === activeCat);
  }, [foods, activeCat]);

  const openingHoursInfo = useMemo(() => {
    if (!restaurant) return { today: '', list: [], summary: '' };
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
    const todayName = weekdayNames[new Date().getDay()];
    const todayEntry = list.find(item => {
      const label = item?.day ?? '';
      if (!label) return false;
      const normalized = String(label).toLowerCase();
      return normalized === todayName.toLowerCase() || normalized.startsWith(todayName.slice(0, 3).toLowerCase());
    });
    return {
      today: todayEntry?.label || '',
      list,
      summary,
    };
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
        <div className="restaurant-header">
          <div className="rh-left">
            <img className="rh-image" src={restaurant.image} alt={restaurant.name} />
          </div>
          <div className="rh-right">
            <div className="rh-top-row">
              <h1 className="rh-name">{restaurant.name}</h1>
              <button className="rh-fav-btn" type="button">❤ Thêm vào Yêu thích</button>
            </div>
            <div className="rh-meta">
              <span className="rh-rating">★ {Number(restaurant.rating || 0).toFixed(1)}</span>
              {restaurant.ratingCount !== undefined && (
                <>
                  <span className="rh-sep">•</span>
                  <a href="#reviews" className="rh-link">{restaurant.ratingCount > 0 ? `${restaurant.ratingCount} đánh giá` : 'Chưa có đánh giá'}</a>
                </>
              )}
              {(openingHoursInfo.today || openingHoursInfo.summary) && (
                <>
                  <span className="rh-sep">•</span>
                  <span className="rh-open">{openingHoursInfo.today ? `Hôm nay: ${openingHoursInfo.today}` : `Giờ mở cửa: ${openingHoursInfo.summary}`}</span>
                </>
              )}
            </div>
            <div className="rh-address">{restaurant.address}</div>
            {(openingHoursInfo.list.length > 0 || openingHoursInfo.summary) && (
              <div className="rh-hours">
                {openingHoursInfo.list.length > 0 ? (
                  <>
                    <div className="rh-hours-title">Lịch mở cửa</div>
                    <div className="rh-hours-grid">
                      {openingHoursInfo.list.map(({ day, label }) => (
                        <div key={day} className="rh-hours-row">
                          <span className="rh-hours-day">{day}</span>
                          <span className="rh-hours-time">{label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rh-hours-summary">{openingHoursInfo.summary}</div>
                )}
              </div>
            )}
            <div className="rh-tags">
              {(Array.isArray(restaurant.cuisine) ? restaurant.cuisine : (restaurant.cuisine || '').split(','))
                .map((t, i) => (
                  <span key={i} className="rh-tag">{String(t).trim()}</span>
                ))}
            </div>
          </div>
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
