import React,{useContext} from 'react'
import './RestaurantDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import Restaurant from '../../pages/Restaurant/Restaurant'

const RestaurantDisplay = ({restaurant}) => {
    const {restaurant_list} = useContext(StoreContext)
    return (
    <div className='restaurant-display' id='food-display'>
        <h2>Top restaurant near you</h2>
        <div className="restaurant-display-list">
            {restaurant_list.map((item,index)=>{
                return <Restaurant key = {index} id={item._id} name = {item.name} description= {item.description} image={item.image}/>
            })}
        </div>
    </div>
  )
}

export default RestaurantDisplay
