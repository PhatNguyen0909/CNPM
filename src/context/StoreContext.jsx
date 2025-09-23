import { createContext, useEffect, useState } from "react";
import { restaurant_list,food_list } from "../assets/assets";
import { getCookie, setCookie, deleteCookie } from "../utils/cookieUtils";

// Tạo context
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems,setCartItems] = useState({})
  const [token, setToken] = useState("")
  const [user, setUser] = useState(null)

  // Hàm thêm vào giỏ hàng với kiểm tra đăng nhập
  const addToCart = (itemId) => {
    if (!token) {
      alert("Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!");
      return;
    }
    
    if(!cartItems[itemId]) {
      setCartItems ((prev)=>({...prev,[itemId]:1}))
    }
    else
    {
      setCartItems ((prev)=>({...prev,[itemId]:prev[itemId]+1}))
    }
  }
  const removeFromCart = (itemId) => {
    if (!token) {
      alert("Vui lòng đăng nhập để thao tác với giỏ hàng!");
      return;
    }
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
    const storedUser = getCookie("user_data");
    
    if (storedToken) {
      setToken(storedToken);
    }
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Lỗi khi parse user data từ cookie:", error);
        deleteCookie("user_data");
      }
    }

    // Kiểm tra token hết hạn mỗi 30 giây
    const checkTokenExpiry = setInterval(() => {
      const currentToken = getCookie("auth_token");
      if (token && !currentToken) {
        // Token đã hết hạn
        setToken("");
        setUser(null);
        setCartItems({});
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
      }
    }, 30000); // 30 giây

    return () => clearInterval(checkTokenExpiry);
  }, [token])

  // Hàm để set token và lưu vào cookie
  const setTokenWithCookie = (newToken, userData = null) => {
    if (newToken) {
      setCookie("auth_token", newToken, 7); // Lưu 7 ngày
      setToken(newToken);
      
      if (userData) {
        setCookie("user_data", JSON.stringify(userData), 7);
        setUser(userData);
      }
    } else {
      deleteCookie("auth_token");
      deleteCookie("user_data");
      setToken("");
      setUser(null);
      setCartItems({}); // Xóa giỏ hàng khi đăng xuất
    }
  }

  // Hàm kiểm tra xem người dùng có đăng nhập hay không
  const isLoggedIn = () => {
    return !!token;
  }

  // Hàm đăng xuất
  const logout = () => {
    setTokenWithCookie(null);
    alert("Đã đăng xuất thành công!");
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
    user,
    setToken: setTokenWithCookie,
    isLoggedIn,
    logout
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  )
}

// Xuất default để import trong main.jsx
export default StoreContextProvider;
