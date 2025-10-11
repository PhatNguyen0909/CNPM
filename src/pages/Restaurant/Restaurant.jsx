import React from 'react'
import './Restaurant.css'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'

const Restaurant = ({ id, name, image, rating, address, cuisine, description }) => {
  const navigate = useNavigate();  

  const handleClick = () => {
    navigate(`/restaurant/${id}`);  // dùng template literal đúng
  }

  return (
   <div className='restaurant-item' onClick={handleClick}>
        <div className="restaurant-item-img-container">
            <img className = 'restaurant-item-image'  src = {image} alt ="" />
        </div>
        <div className='restaurant-item-info'>
           <div className='restaurant-item-name-rating'>
              <p>{name}</p>
              <div className="rating">
                <img src={assets.rating_starts} alt = ""/>
                <span>{rating}</span>
              </div>
           </div>
           <p className='restaurant-item-cuisine'>{Array.isArray(cuisine) ? cuisine.join(', ') : cuisine}</p>
           <p className='restaurant-item-desc'>{description}</p>
           <p className='restaurant-item-address'>{address}</p>
        </div>
    </div>
  )
}

export default Restaurant
