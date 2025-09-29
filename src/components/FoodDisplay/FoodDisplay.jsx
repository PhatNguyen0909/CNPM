import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import './FoodDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'
import { assets } from '../../assets/assets'


const FoodDisplay = ({category}) => {
  const {restaurantId} = useParams();
  const {food_list, restaurant_list} = useContext(StoreContext)
  const restaurant = useMemo(() => restaurant_list.find(r => r._id === restaurantId), [restaurant_list, restaurantId]);
  const foods = useMemo(() => food_list.filter(item => item.restaurantId === restaurantId), [food_list, restaurantId]);
  const FEATURED_CAT = 'Món được yêu thích';
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

  // Reset scroll highlight when switching out of "Tất cả"
  useEffect(() => {
    if (activeCat !== 'Tất cả') {
      setScrollingCat('');
    }
  }, [activeCat]);

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
              <span className="rh-rating">★ {restaurant.rating}</span>
              <span className="rh-sep">•</span>
              <a href="#reviews" className="rh-link">(X đánh giá)</a>
              <span className="rh-sep">•</span>
              <span className="rh-open">Mở cửa đến 21:00</span>
            </div>
            <div className="rh-address">{restaurant.address}</div>
            <div className="rh-tags">
              {(Array.isArray(restaurant.cuisine) ? restaurant.cuisine : (restaurant.cuisine || '').split(','))
                .map((t, i) => (
                  <span key={i} className="rh-tag">{String(t).trim()}</span>
                ))}
            </div>
          </div>
        </div>
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
                  ref={(el) => { if (el) sectionsRef.current[cat] = el; }}
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
                ref={(el) => { if (el) sectionsRef.current[cat] = el; }}
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
            <div className="food-display-list">
              {foods.map((item) => (
                <FoodItem key={item._id} id={item._id} restaurantId={restaurantId} name={item.name} description={item.description} price={item.price} image={item.image} />
              ))}
            </div>
          </>
        )
      ) : (
        <>
          <h2 className="section-title">{activeCat}</h2>
          <div className="food-display-list">
            {filteredFoods.map((item) => (
              <FoodItem key={item._id} id={item._id} restaurantId={restaurantId} name={item.name} description={item.description} price={item.price} image={item.image} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default FoodDisplay
