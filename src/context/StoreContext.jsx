import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { restaurant_list as staticRestaurants, food_list as staticFoodList } from "../assets/assets";
import { item_options } from "../assets/itemOptions";
import { getCookie, setCookie, deleteCookie } from "../utils/cookieUtils";
import restaurantAPI from "../services/restaurantAPI";
import { attachToken } from "../services/apiClient";

// Tạo context
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  // Legacy simple cart (itemId -> quantity)
  const [cartItems,setCartItems] = useState({})
  // New cart lines to support options per item
  const [cartLines, setCartLines] = useState([]);
  const [token, setToken] = useState("")
  const [user, setUser] = useState(null)
  const [restaurants, setRestaurants] = useState(staticRestaurants || []);
  const [isFetchingRestaurants, setIsFetchingRestaurants] = useState(false);
  const [foods, setFoods] = useState(staticFoodList || []);
  const foodsRef = useRef(staticFoodList || []);

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

  const mapOptionValueIds = () => [];

  // Add item with options into cartLines
  const addToCartWithOptions = (itemId, selectionsObj, quantity = 1, note = '') => {
    if (!token) {
      alert("Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!");
      return;
    }
  const item = foods.find(f => f._id === itemId);
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
  let itemInfo = foods.find((product)=>product._id === item);
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

  const replaceRestaurantMenu = useCallback((restaurantId, items = []) => {
    if (!restaurantId) return;
    const restId = String(restaurantId);
    setFoods(prev => {
      const remaining = prev.filter(item => String(item.restaurantId) !== restId);
      const next = [...remaining, ...items];
      foodsRef.current = next;
      return next;
    });
  }, []);

  const getRestaurantMenu = useCallback((restaurantId) => {
    if (!restaurantId) return [];
    const restId = String(restaurantId);
    const fromState = foodsRef.current.filter(item => String(item.restaurantId) === restId);
    if (fromState.length > 0) return fromState;
    return staticFoodList.filter(item => String(item.restaurantId) === restId);
  }, []);

  useEffect(() => {
    const storedToken = getCookie("auth_token");
    const storedUser = getCookie("user_data");
    
    if (storedToken) {
      setToken(storedToken);
      attachToken(storedToken);
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
      attachToken(newToken);
      
      if (userData) {
        setCookie("user_data", JSON.stringify(userData), 7);
        setUser(userData);
      }
    } else {
      deleteCookie("auth_token");
      deleteCookie("user_data");
      setToken("");
      attachToken(null);
      setUser(null);
      setCartItems({}); // Xóa giỏ hàng khi đăng xuất
      setCartLines([]);
    }
  }

  const normalizeRestaurant = (item, index = 0) => {
    if (!item || typeof item !== "object") return null;
    const fallback = staticRestaurants?.[index % (staticRestaurants?.length || 1)] ?? {};
    const normalizeOpeningHours = (value, fallbackValue) => {
      const input = value ?? fallbackValue;
      if (!input) return { list: [], summary: "" };

      if (typeof input === "string") {
        const trimmed = input.trim();
        return {
          list: trimmed
            ? [{ day: "Lịch", label: trimmed }]
            : [],
          summary: trimmed,
        };
      }

      const source = Array.isArray(input)
        ? input.reduce((acc, entry) => {
            if (!entry) return acc;
            if (typeof entry === "string") {
              const [dayPart, ...rest] = entry.split(":");
              if (dayPart && rest.length) {
                acc[dayPart.trim()] = rest.join(":").trim();
              }
            } else if (typeof entry === "object") {
              const key = entry.day ?? entry.Day ?? entry.weekday ?? entry.Weekday;
              const val = entry.hours ?? entry.value ?? entry.time ?? entry.Hours ?? entry.Value;
              if (key && val) acc[key] = String(val).trim();
            }
            return acc;
          }, {})
        : input;

      if (!source || typeof source !== "object") {
        return { list: [], summary: "" };
      }

      const dayOrder = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];

      const normalizeLookup = (obj, day) =>
        obj?.[day] ??
        obj?.[day.toLowerCase()] ??
        obj?.[day.slice(0, 3)] ??
        obj?.[day.slice(0, 3).toLowerCase()];

      const list = dayOrder
        .map((day) => {
          const raw = normalizeLookup(source, day);
          if (!raw) return null;
          const label = String(raw).trim();
          if (!label) return null;
          return { day, label };
        })
        .filter(Boolean);

      if (list.length === 0) {
        return {
          list: Object.entries(source ?? {})
            .map(([day, val]) => ({ day, label: String(val).trim() }))
            .filter(({ label }) => !!label),
          summary: Object.entries(source ?? {})
            .map(([day, val]) => `${day}: ${String(val).trim()}`)
            .join(" | "),
        };
      }

      return {
        list,
        summary: list.map(({ day, label }) => `${day}: ${label}`).join(" | "),
      };
    };

    const id =
      item._id ??
      item.id ??
      item.merchantId ??
      item.code ??
      fallback._id ??
      `${Date.now()}-${index}`;

    const image =
      item.imageUrl ??
      item.logoUrl ??
      item.coverImage ??
      item.image ??
      fallback.image;

    const ratingRaw =
      item.avgRating ??
      item.rating ??
      item.averageRating ??
      item.score ??
      fallback.rating ??
      0;

    const ratingCount =
      item.ratingCount ??
      item.reviewCount ??
      item.totalReviews ??
      fallback.ratingCount ??
      0;

    const cuisineRaw =
      item.cuisineTypes ??
      item.cuisine ??
      item.cuisines ??
      item.tags ??
      item.category ??
      fallback.cuisine ??
      "";

    const cuisine = Array.isArray(cuisineRaw)
      ? cuisineRaw.filter(Boolean)
      : cuisineRaw;

    const composedAddress = [item.street, item.ward, item.district, item.city]
      .filter(Boolean)
      .join(", ");

    const address =
      item.address ??
      (composedAddress ? composedAddress : undefined) ??
      fallback.address ??
      "";

    const { list: openingHoursList, summary: openingHoursSummary } = normalizeOpeningHours(
      item.openingHours,
      fallback.openingHours
    );

    return {
      _id: String(id),
      name: item.name ?? item.merchantName ?? fallback.name ?? "Nhà hàng",
      image,
      rating: Number.isFinite(Number(ratingRaw)) ? Number(Number(ratingRaw).toFixed(1)) : Number(fallback.rating ?? 0),
      ratingCount: Number(ratingCount) || 0,
      description: item.introduction ?? item.description ?? item.shortDescription ?? fallback.description ?? "",
      address,
      cuisine,
      openingHours: openingHoursList,
      openingHoursSummary,
      status: item.status ?? fallback.status ?? "UNKNOWN",
      raw: item,
    };
  };

  // Fetch restaurant list from backend
  useEffect(() => {
    const controller = new AbortController();
    const loadRestaurants = async () => {
      setIsFetchingRestaurants(true);
      try {
        const list = await restaurantAPI.fetchActiveMerchants(controller.signal);
        if (Array.isArray(list) && list.length > 0) {
          const normalized = list
            .filter(item => {
              const status = item?.status ?? "ACTIVE";
              return typeof status !== "string" || status.toUpperCase() === "ACTIVE";
            })
            .map((item, idx) => normalizeRestaurant(item, idx))
            .filter(Boolean);
          setRestaurants(normalized);
        } else if (Array.isArray(list)) {
          setRestaurants([]);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Không thể tải danh sách nhà hàng:", error);
      } finally {
        setIsFetchingRestaurants(false);
      }
    };

    loadRestaurants();
    return () => controller.abort();
  }, [token]);

  const restaurantValue = useMemo(() => {
    if (!restaurants || restaurants.length === 0) {
      return staticRestaurants || [];
    }
    return restaurants;
  }, [restaurants]);

  // Hàm kiểm tra xem người dùng có đăng nhập hay không
  const clearCart = useCallback(() => {
    setCartItems({});
    setCartLines([]);
  }, []);

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
    clearCart,
    restaurant_list: restaurantValue,
    food_list: foods,
    getRestaurantMenu,
    replaceRestaurantMenu,
    getTotalCartAmount,
    token,
    user,
    setToken: setTokenWithCookie,
    isLoggedIn,
    logout
    ,mockLogin
    ,isFetchingRestaurants
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  )
}

// Xuất default để import trong main.jsx
export default StoreContextProvider;
