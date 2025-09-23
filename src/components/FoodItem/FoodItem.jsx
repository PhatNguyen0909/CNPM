import React, { useContext, useState } from 'react'
import './FoodItem.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import { formatVND } from '../../utils/formatCurrency'
const FoodItem = ({id,restaurantId,name,price,description,image}) => {
  const[itemCount,setItemCount] = useState(0)
  const{cartItems,addToCart,removeFromCart,token} = useContext(StoreContext);
  
  const handleAddToCart = () => {
    if (!token) {
      alert("Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!");
      return;
    }
    addToCart(id);
  }
  
  const handleRemoveFromCart = () => {
    if (!token) {
      alert("Vui lòng đăng nhập để thao tác với giỏ hàng!");
      return;
    }
    removeFromCart(id);
  }
  return (
    <div className='food-item'>
        <div className="food-item-img-container">
            <img className = 'food-item-image'  src = {image} alt ="" />
            {
              !cartItems[id]
              ?<img className='add' onClick={handleAddToCart} src={assets.add_icon_white} alt=''/>
              :<div className='food-item-counter'>
                <img onClick={handleRemoveFromCart}  src={assets.remove_icon_red} alt=''/>
                <p>{cartItems[id]}</p>
                <img onClick={handleAddToCart}  src={assets.add_icon_green} alt=''/>
              </div>
            }
        </div>
        <div className='food-item-info'>
           <div className='food-item-name-rating'>
              <p>{name}</p>
              <img src={assets.rating_starts} alt = ""/>
           </div>
           <p className='food-item-desc'>{description}</p>
           <p className='food-item-price'>{formatVND(price)}</p>
        </div>
      
    </div>
  )
}

export default FoodItem
