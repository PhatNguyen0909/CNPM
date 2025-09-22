import { createContext, useEffect, useState } from "react";
import { restaurant_list,food_list } from "../assets/assets";

// Tạo context
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems,setCartItems] = useState({})
  const addToCart = (itemId) => {
    if(!cartItems[itemId]) {
      setCartItems ((prev)=>({...prev,[itemId]:1}))
    }
    else
    {
      setCartItems ((prev)=>({...prev,[itemId]:prev[itemId]+1}))
    }
  }
  const removeFromCart = (itemId) => {
     setCartItems ((prev)=>({...prev,[itemId]:prev[itemId]-1}))
  }
  useEffect(()=> {
    console.log(cartItems);
  },[cartItems])
  const contextValue = {
    setCartItems,
    cartItems,
    addToCart,
    removeFromCart,
    restaurant_list,
    food_list
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  )
}

// Xuất default để import trong main.jsx
export default StoreContextProvider;
