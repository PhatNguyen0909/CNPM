import React, { useState } from 'react'
import './Home.css'
import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import Restaurant from '../../components/RestaurantDisplay/RestaurantDisplay'
import Sidebar from '../../components/Sidebar/Sidebar'
const Home = () => {

  const [category,setCategory] = useState("All");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('highestRating'); // 'mostReviews' | 'highestRating' | 'newest'
  const [showFilter, setShowFilter] = useState(false); // mobile sidebar toggle
  return (
    <div>
      <Header/>
      <div className='home-page-container'>
        <ExploreMenu category={category} setCategory={setCategory}/>
      </div>
      <div className='home-page-container home-content-layout'>
        <Sidebar 
          selectedCuisine={category} 
          setSelectedCuisine={setCategory}
          ratingFilter={ratingFilter}
          setRatingFilter={setRatingFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          mobileVisible={showFilter}
          onCloseMobile={()=> setShowFilter(false)}
        />
        <div className='home-main-area'>
          <Restaurant 
            selectedCuisine={category} 
            ratingFilter={ratingFilter} 
            sortBy={sortBy}
            onOpenFilterMobile={()=> setShowFilter(true)}
          />
        </div>
      </div>
    </div> 
  )
}

export default Home
