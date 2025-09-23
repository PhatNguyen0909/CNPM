import { createContext, useEffect, useState } from "react";
import { restaurant_list,food_list } from "../assets/assets";
import { getCookie, setCookie, deleteCookie } from "../utils/cookieUtils";

// Tạo context
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems,setCartItems] = useState({})
  const [token, setToken] = useState("")

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

  const getTotalCartAmount = () =>{
    let totalAmount = 0;
    for(const item in cartItems){
      if(cartItems[item] > 0){
        let itemInfo = food_list.find((product)=>product._id === item);
        totalAmount += itemInfo.price *cartItems[item];
      }
    }
    return totalAmount;
  }

  useEffect(() => {
    const storedToken = getCookie("auth_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, [])

  // Hàm để set token và lưu vào cookie
  const setTokenWithCookie = (newToken) => {
    if (newToken) {
      setCookie("auth_token", newToken, 7); // Lưu 7 ngày
      setToken(newToken);
    } else {
      deleteCookie("auth_token");
      setToken("");
    }
  }

  const contextValue = {
    setCartItems,
    cartItems,
    addToCart,
    removeFromCart,
    restaurant_list,
    food_list,
    getTotalCartAmount,
    token,
    setToken: setTokenWithCookie
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  )
}

// Xuất default để import trong main.jsx
export default StoreContextProvider;
