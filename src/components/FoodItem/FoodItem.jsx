import React from 'react'
import './FoodItem.css'
import { assets } from '../../assets/assets'

const FoodItem = ({id,name,address,description,image,rating,cuisine}) => {
  return (
    <div className='food-item'>
        <div className="food-item-img-container">
            <img className = 'food-item-image'  src = {image} alt ="" />
        </div>
        <div className='food-item-info'>
           <div className='food-item-name-rating'>
              <p>{name}</p>
              <div className="rating">
                <img src={assets.rating_starts} alt = ""/>
                <span>{rating}</span>
              </div>
           </div>
           <p className='food-item-cuisine'>{cuisine}</p>
           <p className='food-item-desc'>{description}</p>
           <p className='food-item-address'>{address}</p>
        </div>
    </div>
  )
}

export default FoodItem
