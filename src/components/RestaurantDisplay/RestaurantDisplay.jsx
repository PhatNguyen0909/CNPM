import React, { useContext, useEffect, useMemo, useState } from 'react'
import './RestaurantDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import Restaurant from '../../pages/Restaurant/Restaurant'

const RestaurantDisplay = ({ selectedCuisine, ratingFilter = 0, sortBy = 'highestRating', onOpenFilterMobile }) => {
  const { restaurant_list, food_list, isFetchingRestaurants } = useContext(StoreContext)
  const [page, setPage] = useState(1);
  const pageSize = 8; // số nhà hàng mỗi trang

  // 1. Nếu chọn "All" => hiện tất cả quán
  // Hàm lọc theo rating
  const byRating = (res) => !ratingFilter || res.rating >= ratingFilter;

  // Hàm sort
  const sortRestaurants = (list) => {
    const cloned = [...list];
    switch (sortBy) {
      case 'mostReviews':
        return cloned.sort((a,b)=> {
          const reviewsA = Number(a.ratingCount || 0);
          const reviewsB = Number(b.ratingCount || 0);
          if (reviewsB !== reviewsA) return reviewsB - reviewsA;
          return Number(b.rating || 0) - Number(a.rating || 0);
        });
      case 'newest':
        // Giả sử _id lớn hơn là mới hơn
        return cloned.sort((a,b)=> parseInt(b._id) - parseInt(a._id));
      case 'highestRating':
      default:
        return cloned.sort((a,b)=> b.rating - a.rating);
    }
  }

  // Reset trang khi bộ lọc thay đổi
  useEffect(() => { setPage(1); }, [selectedCuisine, ratingFilter, sortBy]);

  if (selectedCuisine === "All") {
    const allList = sortRestaurants(restaurant_list.filter(byRating));
    const totalPages = Math.max(1, Math.ceil(allList.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paged = allList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
      <div className='restaurant-display' id='food-display'>
        <div className='restaurant-display-header-row'>
          <h2>Khám phá các nhà hàng {ratingFilter ? `(Rating ≥ ${ratingFilter})` : ''}</h2>
          {onOpenFilterMobile && (
            <button type='button' className='filter-toggle-btn' onClick={onOpenFilterMobile}>Lọc</button>
          )}
        </div>
        <div className="restaurant-display-list">
          {isFetchingRestaurants ? (
            <p>Đang tải danh sách nhà hàng...</p>
          ) : paged.map((item) => (
            <Restaurant
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              image={item.image}
              cuisine={item.cuisine}
              rating={item.rating}
              ratingCount={item.ratingCount}
              address={item.address}
              isOpen={item.open !== false}
            />
          ))}
        </div>
        {allList.length > pageSize && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        )}
      </div>
    )
  }

  // Lọc trực tiếp theo cuisine của nhà hàng (thay vì theo food_list.category)
  const matchesCuisine = (res) => {
    if (!selectedCuisine) return true;
    const target = selectedCuisine.toLowerCase();
    const c = res.cuisine;
    if (Array.isArray(c)) return c.some(x => x?.toLowerCase().includes(target));
    return c?.toLowerCase().includes(target);
  };

  const filteredRestaurants = sortRestaurants(
    restaurant_list
      .filter(matchesCuisine)
      .filter(byRating)
  )

  const totalPages = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filteredRestaurants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className='restaurant-display' id='food-display'>
      <div className='restaurant-display-header-row'>
        <h2>Các nhà hàng có món {selectedCuisine} ở gần bạn {ratingFilter ? `(Rating ≥ ${ratingFilter})` : ''}</h2>
        {onOpenFilterMobile && (
          <button type='button' className='filter-toggle-btn' onClick={onOpenFilterMobile}>Lọc</button>
        )}
      </div>
      <div className="restaurant-display-list">
        {isFetchingRestaurants ? (
          <p>Đang tải danh sách nhà hàng...</p>
        ) : filteredRestaurants.length > 0 ? (
          paged.map((item) => (
            <Restaurant
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              image={item.image}
              cuisine={item.cuisine}
              rating={item.rating}
              ratingCount={item.ratingCount}
              address={item.address}
              isOpen={item.open !== false}
            />
          ))
        ) : (
          <p>Không tìm thấy nhà hàng nào có món "{selectedCuisine}"</p>
        )}
      </div>
      {filteredRestaurants.length > pageSize && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setPage}
        />
      )}
    </div>
  )
}

export default RestaurantDisplay

// ---- Pagination sub-component ----
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className="restaurant-pagination" aria-label="Phân trang">
      <button
        className="page-btn prev"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Trước
      </button>
      <ul className="page-list">
        {pages.map(p => (
          <li key={p}>
            <button
              className={`page-btn number ${p === page ? 'active' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
      <button
        className="page-btn next"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Tiếp
      </button>
    </nav>
  );
}
