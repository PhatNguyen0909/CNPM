import React, { useState } from 'react'
import './Home.css'
import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import Restaurant from '../../components/RestaurantDisplay/RestaurantDisplay'
const Home = () => {

  const [category,setCategory] = useState("All");
  return (
    <div>
      <Header/>
      <ExploreMenu category={category} setCategory={setCategory}/>
      <Restaurant selectedCuisine={category}/>
    </div> 
  )
}

export default Home
