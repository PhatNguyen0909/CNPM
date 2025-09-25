import React, { useContext } from 'react'
import './RestaurantDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import Restaurant from '../../pages/Restaurant/Restaurant'

const RestaurantDisplay = ({ selectedCuisine, ratingFilter = 0, sortBy = 'highestRating', onOpenFilterMobile }) => {
  const { restaurant_list, food_list } = useContext(StoreContext)

  // 1. Nếu chọn "All" => hiện tất cả quán
  // Hàm lọc theo rating
  const byRating = (res) => !ratingFilter || res.rating >= ratingFilter;

  // Hàm sort
  const sortRestaurants = (list) => {
    const cloned = [...list];
    switch (sortBy) {
      case 'mostReviews':
        // Chưa có dữ liệu số review -> tạm random stable dựa trên _id để demo
        return cloned.sort((a,b)=> (parseInt(b._id)%3) - (parseInt(a._id)%3) || b.rating - a.rating);
      case 'newest':
        // Giả sử _id lớn hơn là mới hơn
        return cloned.sort((a,b)=> parseInt(b._id) - parseInt(a._id));
      case 'highestRating':
      default:
        return cloned.sort((a,b)=> b.rating - a.rating);
    }
  }

  if (selectedCuisine === "All") {
    return (
      <div className='restaurant-display' id='food-display'>
        <div className='restaurant-display-header-row'>
          <h2>Khám phá các nhà hàng {ratingFilter ? `(Rating ≥ ${ratingFilter})` : ''}</h2>
          {onOpenFilterMobile && (
            <button type='button' className='filter-toggle-btn' onClick={onOpenFilterMobile}>Lọc</button>
          )}
        </div>
        <div className="restaurant-display-list">
          {sortRestaurants(restaurant_list.filter(byRating)).map((item) => (
            <Restaurant
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              image={item.image}
              cuisine={item.cuisine}
              rating={item.rating}
              address={item.address}
            />
          ))}
        </div>
      </div>
    )
  }

  // Lọc trực tiếp theo cuisine của nhà hàng (thay vì theo food_list.category)
  const filteredRestaurants = sortRestaurants(
    restaurant_list
      .filter((res) => res.cuisine?.toLowerCase().includes(selectedCuisine.toLowerCase()))
      .filter(byRating)
  )

  return (
    <div className='restaurant-display' id='food-display'>
      <div className='restaurant-display-header-row'>
        <h2>Các nhà hàng có món {selectedCuisine} ở gần bạn {ratingFilter ? `(Rating ≥ ${ratingFilter})` : ''}</h2>
        {onOpenFilterMobile && (
          <button type='button' className='filter-toggle-btn' onClick={onOpenFilterMobile}>Lọc</button>
        )}
      </div>
      <div className="restaurant-display-list">
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((item) => (
            <Restaurant
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              image={item.image}
              cuisine={item.cuisine}
              rating={item.rating}
              address={item.address}
            />
          ))
        ) : (
          <p>Không tìm thấy nhà hàng nào có món "{selectedCuisine}"</p>
        )}
      </div>
    </div>
  )
}

export default RestaurantDisplay
