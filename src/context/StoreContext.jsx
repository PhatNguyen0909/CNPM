import { createContext, useEffect, useState } from "react";
import { restaurant_list,food_list } from "../assets/assets";
import { item_options } from "../assets/itemOptions";
import { getCookie, setCookie, deleteCookie } from "../utils/cookieUtils";

// Tạo context
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  // Legacy simple cart (itemId -> quantity)
  const [cartItems,setCartItems] = useState({})
  // New cart lines to support options per item
  const [cartLines, setCartLines] = useState([]);
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

  // Helper: build a stable key for a line based on item and selections
  const generateLineKey = (itemId, selectionsObj, note='') => {
    // selectionsObj: { [groupTitle]: string[] }
    const parts = [itemId];
    const groups = Object.keys(selectionsObj || {}).sort();
    groups.forEach(g => {
      const values = [...(selectionsObj[g] || [])].sort();
      parts.push(`${g}=${values.join(',')}`);
    });
    if (note) parts.push(`note=${note}`);
    return parts.join('|');
  };

  // Compute options price from item definition and selections
  const computeOptionsPrice = (item, selectionsObj) => {
    const groups = item_options?.[item?._id] || [];
    if (!Array.isArray(groups) || groups.length === 0) return 0;
    let extra = 0;
    groups.forEach(group => {
      const chosen = selectionsObj?.[group.title] || [];
      chosen.forEach(label => {
        const opt = group.options.find(o => o.label === label);
        if (opt) extra += Number(opt.priceDelta || 0);
      });
    });
    return extra;
  };

  // Add item with options into cartLines
  const addToCartWithOptions = (itemId, selectionsObj, quantity = 1, note = '') => {
    if (!token) {
      alert("Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!");
      return;
    }
    const item = food_list.find(f => f._id === itemId);
    if (!item) return;
    const key = generateLineKey(itemId, selectionsObj, note);
    const optionsPrice = computeOptionsPrice(item, selectionsObj);

    setCartLines(prev => {
      const idx = prev.findIndex(l => l.key === key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [
        ...prev,
        {
          key,
          itemId,
          name: item.name,
          image: item.image,
          basePrice: item.price,
          selections: selectionsObj, // { groupTitle: string[] }
          optionsPrice,
          note,
          quantity
        }
      ];
    });
  };

  const updateCartLineQty = (key, newQty) => {
    setCartLines(prev => {
      if (newQty <= 0) return prev.filter(l => l.key !== key);
      return prev.map(l => (l.key === key ? { ...l, quantity: newQty } : l));
    });
  };

  const removeCartLine = (key) => {
    setCartLines(prev => prev.filter(l => l.key !== key));
  };

  const getTotalCartAmount = () =>{
    let totalAmount = 0;
    // legacy items
    for(const item in cartItems){
      if(cartItems[item] > 0){
        let itemInfo = food_list.find((product)=>product._id === item);
        if (itemInfo) {
          totalAmount += itemInfo.price * cartItems[item];
        }
      }
    }
    // configurable lines
    for (const line of cartLines) {
      totalAmount += (Number(line.basePrice) + Number(line.optionsPrice || 0)) * Number(line.quantity || 0);
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

  // Mock login for offline testing (when backend off)
  const mockLogin = () => {
    const fakeUser = {
      id: 'mock-user-1',
      name: 'Khách thử nghiệm',
      email: 'mock@example.com'
    };
    setTokenWithCookie('mock-token', fakeUser);
    alert('Đã kích hoạt đăng nhập thử (mock).');
  };

  // Auto enable mock by query param or localStorage flag
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const qp = url.searchParams.get('mock');
      const ls = localStorage.getItem('mock_login');
      if ((qp === '1' || ls === '1') && !token) {
        mockLogin();
      }
    } catch (e) { /* noop */ }
  }, []);

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
      setCartLines([]);
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
    cartLines,
    addToCart,
    removeFromCart,
    addToCartWithOptions,
    updateCartLineQty,
    removeCartLine,
    restaurant_list,
    food_list,
    getTotalCartAmount,
    token,
    user,
    setToken: setTokenWithCookie,
    isLoggedIn,
    logout
    ,mockLogin
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  )
}

// Xuất default để import trong main.jsx
export default StoreContextProvider;
