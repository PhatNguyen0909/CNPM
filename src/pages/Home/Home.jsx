import React, { useState } from 'react'
import './Home.css'
import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import Restaurant from '../../components/RestaurantDisplay/RestaurantDisplay'
const Home = () => {

  const [category,setCategory] = useState("All");
  const [restaurant,setRestaurant] = useState ("All");
  return (
    <div>
      <Header/>
      <ExploreMenu category={category} setCategory={setCategory}/>
      <Restaurant restaurant = {restaurant} setRestaurant={setRestaurant}/>
    </div> 
  )
}

export default Home
