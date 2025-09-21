import React, { useContext } from 'react'
import { useParams } from 'react-router-dom'
import './FoodDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'


const FoodDisplay = ({category}) => {
  const {restaurantId} = useParams();
  const {food_list} = useContext(StoreContext)
  const filteredFoods = food_list.filter(item =>item.restaurantId === restaurantId)

    return (
    <div className='food-display' id='food-display'>
      <h2>Menu của nhà hàng</h2>
      <div className="food-display-list"> 
        {filteredFoods.map((item,index)=>{
            return <FoodItem key={index} id={item._id} restaurantId = {restaurantId} name={item.name} description={item.description} price={item.price} image={item.image}/>
        })}
      </div>
    </div>
  )
}

export default FoodDisplay
