import React, { useContext } from 'react'
import './RestaurantDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import Restaurant from '../../pages/Restaurant/Restaurant'

const RestaurantDisplay = ({ selectedCuisine }) => {
  const { restaurant_list, food_list } = useContext(StoreContext)

  // 1. Nếu chọn "All" => hiện tất cả quán
  if (selectedCuisine === "All") {
    return (
      <div className='restaurant-display' id='food-display'>
        <h2>Top restaurant near you</h2>
        <div className="restaurant-display-list">
          {restaurant_list.map((item) => (
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

  // 2. Lọc danh sách món theo category
  const filteredFoods = food_list.filter((food) =>
    food.category?.toLowerCase().includes(selectedCuisine.toLowerCase())
  )

  // 3. Lấy ra danh sách id nhà hàng từ món ăn
  const restaurantIds = [...new Set(filteredFoods.map((food) => food.restaurantId))]

  // 4. Lọc danh sách nhà hàng
  const filteredRestaurants = restaurant_list.filter((res) =>
    restaurantIds.includes(res._id)
  )

  return (
    <div className='restaurant-display' id='food-display'>
      <h2>Top restaurant near you</h2>
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
          <p>Không tìm thấy nhà hàng nào có món thuộc "{selectedCuisine}"</p>
        )}
      </div>
    </div>
  )
}

export default RestaurantDisplay
