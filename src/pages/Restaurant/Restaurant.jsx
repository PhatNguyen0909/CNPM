import React from 'react'
import './Restaurant.css'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'

const Restaurant = ({ id, name, image, rating, ratingCount = 0, address, cuisine, description, isOpen = true }) => {
  const navigate = useNavigate();  

  const handleClick = () => {
    if (!isOpen) return; // chặn click khi đang đóng cửa
    navigate(`/restaurant/${id}`);  // dùng template literal đúng
  }

  return (
   <div className={`restaurant-item ${!isOpen ? 'closed' : ''}`} onClick={handleClick}>
        <div className="restaurant-item-img-container">
            <img className = 'restaurant-item-image'  src = {image} alt ="" />
            {!isOpen && <span className="restaurant-closed-badge">Đang đóng cửa</span>}
        </div>
        <div className='restaurant-item-info'>
           <div className='restaurant-item-name-rating'>
              <p>{name}</p>
              {Number(rating||0) > 0 ? (
                <div className="rating" aria-label="Đánh giá">
                  <img src={assets.rating_starts} alt = "rating stars"/>
                  <span>{Number(rating).toFixed(1)}</span>
                </div>
              ) : (
                <div className="rating" aria-label="Chưa có đánh giá">
                  <span style={{color:'#6b7280'}}>Chưa có</span>
                </div>
              )}
           </div>
           <p className='restaurant-item-cuisine'>{Array.isArray(cuisine) ? cuisine.join(', ') : cuisine}</p>
           <p className='restaurant-item-desc'>{description}</p>
           <p className='restaurant-item-address'>{address}</p>
        </div>
    </div>
  )
}

export default Restaurant
