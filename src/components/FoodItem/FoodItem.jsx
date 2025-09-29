import React, { useContext, useMemo, useState } from 'react'
import './FoodItem.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import { formatVND } from '../../utils/formatCurrency'
import FoodOptionsModal from '../FoodOptionsModal/FoodOptionsModal'
import { item_options } from '../../assets/itemOptions'
const FoodItem = ({id,restaurantId,name,price,description,image, variant}) => {
  const[itemCount,setItemCount] = useState(0)
  const{cartItems,addToCart,removeFromCart,addToCartWithOptions,food_list,token} = useContext(StoreContext);
  const [open, setOpen] = useState(false);

  const itemDef = useMemo(() => food_list.find(f => f._id === id), [food_list, id]);
  const optionGroups = item_options?.[id] || [];
  const hasOptions = optionGroups.length > 0;
  
  const handleAddToCart = () => {
    if (!token) {
      alert("Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!");
      return;
    }
    if (hasOptions) {
      setOpen(true);
    } else {
      addToCart(id);
    }
  }
  
  const handleRemoveFromCart = () => {
    if (!token) {
      alert("Vui lòng đăng nhập để thao tác với giỏ hàng!");
      return;
    }
    removeFromCart(id);
  }
  return (
    <div className={`food-item ${variant ? variant : ''}`}>
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
        {hasOptions && (
          <FoodOptionsModal
            open={open}
            onClose={() => setOpen(false)}
            item={{ _id: id, name, price, description, image, optionGroups }}
            onAdd={(selections, qty, note) => addToCartWithOptions(id, selections, qty, note)}
          />
        )}
    </div>
  )
}

export default FoodItem
