import React from 'react'
import './Restaurant.css'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'

const Restaurant = ({ id, name, image, description }) => {
  const navigate = useNavigate();  

  const handleClick = () => {
    navigate(`/restaurant/${id}`);  // dùng template literal đúng
  }

  return (
    <div className='restaurant-item' onClick={handleClick} >
      <div className='restaurant-item-img-container'>
        <img src={image} alt="" className='restaurant-item-image' />
      </div>
      <div className='restaurant-info'>
        <div className='restaurant-item-name-rating'>
          <p>{name}</p>
          <img src={assets.rating_starts} alt="" />
        </div>
        <p className='restaurant-item-des'>{description}</p>
      </div>
    </div>
  )
}

export default Restaurant
