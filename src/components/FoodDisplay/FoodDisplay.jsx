import React, { useContext } from 'react'
import './FoodDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'

const FoodDisplay = ({category}) => {
  const {restaurant_list} = useContext(StoreContext)

    return (
    <div className='food-display' id='food-display'>
      <h2>Top các nhà hàng ngon ở gần bạn</h2>
      <div className="food-display-list"> 
        {restaurant_list.map((item,index)=>{
            return <FoodItem key={index} id={item._id} name={item.name} description={item.description} address={item.address} rating={item.rating} image={item.image} cuisine={item.cuisine}/>
        })}
      </div>
    </div>
  )
}

export default FoodDisplay
