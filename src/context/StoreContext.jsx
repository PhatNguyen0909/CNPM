import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { restaurant_list as staticRestaurants, food_list as staticFoodList } from "../assets/assets";
import { item_options } from "../assets/itemOptions";
import { getCookie, setCookie, deleteCookie } from "../utils/cookieUtils";
import restaurantAPI from "../services/restaurantAPI";
import menuAPI from "../services/menuAPI";
import { API_BASE_URL } from "../services/apiClient";
import cartAPI from "../services/cartAPI";
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
  // Cache for menu item visibility/active checks to avoid refetch lag
  const visibilityCacheRef = useRef(new Map()); // key: menuItemId -> { ok, reason, at }
  const VIS_TTL_MS = 60_000; // 60s TTL

  // Build current cart payload that backend expects for /cart validation
  function buildBackendCartItems() {
    const items = [];
    // legacy items
    Object.entries(cartItems || {}).forEach(([id, qty]) => {
      const n = Number(qty);
      if (!Number.isFinite(n) || n <= 0) return;
      const item = foods.find(f => String(f._id) === String(id));
      if (!item) return;
      const raw = item.raw || {};
      const menuItemId = raw.id ?? raw.menuItemId ?? item._id;
      items.push({ menuItemId, quantity: n, note: '', optionValueIds: [] });
    });
    // configurable lines
    (cartLines || []).forEach(line => {
      if (!line || !line.quantity) return;
      const item = foods.find(f => String(f._id) === String(line.itemId));
      const raw = item?.raw || {};
      const menuItemId = raw.id ?? raw.menuItemId ?? line.itemId;
      items.push({ menuItemId, quantity: Number(line.quantity) || 1, note: line.note || '', optionValueIds: Array.isArray(line.optionValueIds) ? line.optionValueIds : [] });
    });
    return items;
  }

  // Hàm thêm vào giỏ hàng với kiểm tra đăng nhập
  const addToCart = async (itemId) => {
    if (!token) {
      alert("Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!");
      return;
    }
    
    const item = foods.find(f => f._id === itemId);
    if (!item) return;

    // Validate with backend to ensure same-merchant cart
    try {
      const raw = item.raw || {};
      const menuItemId = raw.id ?? raw.menuItemId ?? item._id;
      const payload = buildBackendCartItems();
      const result = await cartAPI.validateWhenAdding(menuItemId, payload);
      if (!result.ok) {
        const keep = window.confirm((result.error || 'Giỏ hàng không hợp lệ.') + '\nBạn có muốn xóa giỏ hàng hiện tại để thêm món này?');
        if (!keep) return;
        setCartItems({});
        setCartLines([]);
      }
    } catch { /* ignore */ }

    // determine existing restaurant ids in cart
    const existingRestIds = new Set();
    for (const id in cartItems) {
      if (cartItems[id] > 0) {
        const p = foods.find(f => String(f._id) === String(id));
        if (p && p.restaurantId) existingRestIds.add(String(p.restaurantId));
      }
    }
    for (const line of cartLines) {
      const p = foods.find(f => String(f._id) === String(line.itemId));
      if (p && p.restaurantId) existingRestIds.add(String(p.restaurantId));
    }

    const newRestId = String(item.restaurantId ?? '');
    if (existingRestIds.size > 0 && !existingRestIds.has(newRestId)) {
      const keep = window.confirm('Giỏ hàng hiện có món từ nhà hàng khác. Bạn có muốn đổi nhà hàng và xóa giỏ hàng hiện tại không?');
      if (!keep) return; // user cancelled: do nothing
      // user accepted: clear existing cart
      setCartItems({});
      setCartLines([]);
    }

    setCartItems((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
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
    // Prefer backend-defined option groups if present
    const srcGroups = item?.options || item?.optionResponses || item?.raw?.options || item?.raw?.optionResponses;
    let groups = [];
    if (Array.isArray(srcGroups) && srcGroups.length > 0) {
      groups = srcGroups.map((group) => {
        const title = String(
          group?.name ?? group?.optionName ?? group?.groupName ?? group?.title ?? 'Tùy chọn'
        );
        const values = group?.optionValues || group?.optionValueResponses || group?.values || group?.options || [];
        const options = (Array.isArray(values) ? values : []).map((v) => ({
          label: String(v?.name ?? v?.optionValueName ?? v?.valueName ?? v?.label ?? ''),
          priceDelta: Number(v?.extraPrice ?? v?.priceDelta ?? 0) || 0,
        }));
        return { title, options };
      });
    } else {
      // Fallback to static option config
      groups = item_options?.[item?._id] || [];
    }

    if (!Array.isArray(groups) || groups.length === 0) return 0;
    let extra = 0;
    groups.forEach(group => {
      const chosen = selectionsObj?.[group.title] || [];
      chosen.forEach(label => {
        const opt = (group.options || []).find(o => o.label === label);
        if (opt) extra += Number(opt.priceDelta || 0);
      });
    });
    return extra;
  };

  

  const mapOptionValueIds = (item, selectionsObj) => {
    if (!item || !selectionsObj) return [];
    const normalize = (value) => String(value ?? '').trim().toLowerCase();
    const selectionKeys = Object.entries(selectionsObj).reduce((acc, [key, values]) => {
      acc[normalize(key)] = (values || []).map(normalize);
      return acc;
    }, {});

    const collectIds = (source) => {
      const ids = [];
      (source || []).forEach(group => {
        if (!group) return;
        const groupLabel = normalize(group.title ?? group.optionName ?? group.name ?? group.groupName ?? group.label);
        const desired = selectionKeys[groupLabel];
        if (!desired || desired.length === 0) return;
        const values = group.optionValueResponses ?? group.optionValues ?? group.values ?? group.options ?? [];
        values.forEach(val => {
          const valueLabel = normalize(val?.optionValueName ?? val?.valueName ?? val?.name ?? val?.label);
          if (desired.includes(valueLabel)) {
            const id = val?.optionValueId ?? val?.id ?? val?.valueId ?? val?._id;
            if (id !== undefined && id !== null) {
              ids.push(id);
            }
          }
        });
      });
      return ids;
    };

    // Prefer 'options' shape first, then 'optionResponses', finally raw fallbacks
    const fromOptions = collectIds(item.options);
    if (fromOptions.length > 0) return fromOptions;
    const fromResponses = collectIds(item.optionResponses);
    if (fromResponses.length > 0) return fromResponses;
    if (item.raw) {
      const rawFromOptions = collectIds(item.raw.options);
      if (rawFromOptions.length > 0) return rawFromOptions;
      return collectIds(item.raw.optionResponses);
    }
    return [];
  };

  // Add item with options into cartLines
  const addToCartWithOptions = async (itemId, selectionsObj, quantity = 1, note = '', usedGroups = null) => {
    if (!token) {
      alert("Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!");
      return;
    }
  const item = foods.find(f => f._id === itemId);
    if (!item) return;

    // Validate with backend first
    try {
      const raw = item.raw || {};
      const menuItemId = raw.id ?? raw.menuItemId ?? item._id;
      const payload = buildBackendCartItems();
      const result = await cartAPI.validateWhenAdding(menuItemId, payload);
      if (!result.ok) {
        const keep = window.confirm((result.error || 'Giỏ hàng không hợp lệ.') + '\nBạn có muốn xóa giỏ hàng hiện tại để thêm món này?');
        if (!keep) return;
        setCartItems({});
        setCartLines([]);
      }
    } catch { /* ignore */ }
    const key = generateLineKey(itemId, selectionsObj, note);
    const optionsPrice = computeOptionsPrice(item, selectionsObj);
    // Prefer the groups from modal (usedGroups) to map labels -> ids reliably
    const optionValueIds = Array.isArray(usedGroups) && usedGroups.length
      ? (function mapFromUsed() {
          const norm = (v) => String(v ?? '').trim().toLowerCase();
          const desiredByGroup = Object.entries(selectionsObj || {}).reduce((acc, [g, vals]) => {
            acc[norm(g)] = (vals || []).map(norm);
            return acc;
          }, {});
          const ids = [];
          usedGroups.forEach((g) => {
            const gTitle = norm(g.title);
            const desired = desiredByGroup[gTitle];
            if (!desired || !desired.length) return;
            const values = g.options || g.optionValues || g.optionValueResponses || g.values || [];
            values.forEach((v) => {
              const label = norm(v?.label ?? v?.name ?? v?.optionValueName ?? v?.valueName);
              if (desired.includes(label)) {
                const id = v?.id ?? v?._id ?? v?.optionValueId ?? v?.valueId;
                if (id !== undefined && id !== null) ids.push(id);
              }
            });
          });
          return ids;
        })()
      : mapOptionValueIds(item, selectionsObj);

    // check existing restaurants in cart
    const existingRestIds = new Set();
    for (const id in cartItems) {
      if (cartItems[id] > 0) {
        const p = foods.find(f => String(f._id) === String(id));
        if (p && p.restaurantId) existingRestIds.add(String(p.restaurantId));
      }
    }
    for (const line of cartLines) {
      const p = foods.find(f => String(f._id) === String(line.itemId));
      if (p && p.restaurantId) existingRestIds.add(String(p.restaurantId));
    }
    const newRestId = String(item.restaurantId ?? '');
    if (existingRestIds.size > 0 && !existingRestIds.has(newRestId)) {
      const keep = window.confirm('Giỏ hàng hiện có món từ nhà hàng khác. Bạn có muốn đổi nhà hàng và xóa giỏ hàng hiện tại không?');
      if (!keep) return; // abort
      setCartItems({});
      setCartLines([]);
    }

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
          optionValueIds,
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
    const toAbsoluteUrl = (u) => {
      if (!u) return undefined;
      const url = String(u).trim();
      if (!url) return undefined;
      // already absolute or data URL
      if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
      // root-relative path is fine
      if (url.startsWith('/')) return url;
      // otherwise prefix API base (e.g., /potato-api)
      return `${API_BASE_URL.replace(/\/$/, '')}/${url}`;
    };
    const pickFirst = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return undefined;
      const v = arr[0];
      if (typeof v === 'string') return v;
      if (typeof v === 'object') {
        return (
          v.imageUrl 
          (Array.isArray(v.urls) ? v.urls[0] : undefined)
        );
      }
      return undefined;
    };
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

    const rawImage =
      item.imageUrl ?? item.imageURL ??
      item.logoUrl ?? item.logoURL ?? item.logo ??
      item.coverImage ?? item.coverImageUrl ?? item.cover ?? item.banner ?? item.bannerUrl ??
      item.avatar ?? item.avatarUrl ??
      item.picture ?? item.pictureUrl ??
      item.photo ?? item.photoUrl ??
      item.thumbnail ?? item.thumbnailUrl ??
      item.image ?? item.img ?? item.imgUrl ?? item.image_path ?? item.imagePath ??
      pickFirst(item.images) ?? pickFirst(item.media) ??
      fallback.image;
    const image = toAbsoluteUrl(rawImage);

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

    const numericRating = Number.isFinite(Number(ratingRaw)) ? Number(Number(ratingRaw).toFixed(1)) : Number(fallback.rating ?? 0);

    return {
      _id: String(id),
      name: item.name ?? item.merchantName ?? fallback.name ?? "Nhà hàng",
      image,
      open: Boolean(
        (item.open ?? item.isOpen ?? item.openNow ?? item.is_open) ??
        ((item.status === 'OPEN') || (item.status === 'ACTIVE'))
      ),
      rating: numericRating,
      avgRating: numericRating,
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
    logout,
    isFetchingRestaurants,
    validateCartVisibility: async () => {
      // Re-fetch each menu item to ensure it's still visible/active before checkout.
      const invalid = [];
      const invalidEntries = [];
      const tasks = [];
      const pushCheck = (menuItemId, displayName, removalInfo) => {
        tasks.push(
          (async () => {
            try {
              const now = Date.now();
              const cache = visibilityCacheRef.current;
              let cached = cache.get(String(menuItemId));
              const isFresh = cached && (now - (cached.at || 0) < VIS_TTL_MS);
              let evalRes = cached;
              if (!isFresh) {
                const res = await menuAPI.fetchMenuItemById(menuItemId);
                // Evaluate
                let reason = '';
                if (!res) {
                  reason = 'not_found';
                } else {
                  const status = String(res?.status ?? res?.itemStatus ?? res?.state ?? '').toUpperCase();
                  const visibleRaw = (
                    res?.visible ?? res?.isVisible ?? res?.is_visible ??
                    res?.active ?? res?.isActive ?? res?.is_active ??
                    res?.enabled ?? res?.isEnabled
                  );
                  const explicitVisible = res?.visible;
                  const explicitActive = res?.active;
                  const availability = res?.available ?? res?.availability ?? res?.isAvailable;
                  const isDeleted = Boolean(res?.deleted || res?.isDeleted || res?.deletedAt);
                  const isActiveStatus = (!status || status === 'ACTIVE' || status === 'PUBLISHED');
                  const isHiddenStatus = (status === 'HIDDEN' || status === 'INACTIVE' || status === 'DISABLED' || status === 'UNAVAILABLE' || status === 'DELETED');
                  const isVisible = (visibleRaw === undefined ? true : Boolean(visibleRaw));

                  if (explicitActive === false) reason = 'inactive';
                  if (explicitVisible === false) reason = reason ? `${reason}_hidden` : 'hidden';
                  if (!reason) {
                    if (!isActiveStatus || isHiddenStatus) reason = 'inactive';
                    if (!isVisible) reason = reason ? `${reason}_hidden` : 'hidden';
                  }
                  if (!reason && isDeleted) reason = 'deleted';
                  if (!reason && availability === false) reason = 'unavailable';
                }
                evalRes = { ok: !reason, reason, at: now };
                cache.set(String(menuItemId), evalRes);
              }
              if (!evalRes?.ok) {
                const name = displayName || String(menuItemId);
                invalid.push(name);
                invalidEntries.push({ name, reason: evalRes?.reason || 'error', ...removalInfo });
              }
            } catch {
              // If cannot load item, treat as invalid to be safe
              const name = displayName || String(menuItemId);
              invalid.push(name);
              invalidEntries.push({ name, reason: 'error', ...removalInfo });
            }
          })()
        );
      };

      // from legacy cartItems
      Object.entries(cartItems || {}).forEach(([id, qty]) => {
        if (!qty || qty <= 0) return;
        const item = foods.find(f => String(f._id) === String(id));
        if (!item) return;
        const raw = item.raw || {};
        const menuItemId = raw.id ?? raw.menuItemId ?? item._id;
        pushCheck(menuItemId, item.name, { type: 'item', itemId: item._id });
      });
      // from configurable cartLines
      (cartLines || []).forEach(line => {
        if (!line || !line.itemId) return;
        pushCheck(line.itemId, line.name, { type: 'line', key: line.key });
      });

      await Promise.all(tasks);
      return { ok: invalid.length === 0, invalid, invalidEntries };
    },
  }

  // Prefetch item visibility state in background when cart changes to improve UX
  useEffect(() => {
    const menuItemIds = new Set();
    // legacy
    Object.entries(cartItems || {}).forEach(([id, qty]) => {
      if (!qty || qty <= 0) return;
      const item = foodsRef.current.find(f => String(f._id) === String(id));
      if (!item) return;
      const raw = item.raw || {};
      const menuItemId = raw.id ?? raw.menuItemId ?? item._id;
      if (menuItemId) menuItemIds.add(String(menuItemId));
    });
    // lines
    (cartLines || []).forEach(line => {
      if (line?.itemId) menuItemIds.add(String(line.itemId));
    });

    if (menuItemIds.size === 0) return;

    let cancelled = false;
    (async () => {
      const now = Date.now();
      const cache = visibilityCacheRef.current;
      for (const id of menuItemIds) {
        const cached = cache.get(id);
        if (cached && (now - (cached.at || 0) < VIS_TTL_MS)) continue;
        try {
          const res = await menuAPI.fetchMenuItemById(id);
          if (cancelled) return;
          let reason = '';
          if (!res) reason = 'not_found';
          else {
            const status = String(res?.status ?? res?.itemStatus ?? res?.state ?? '').toUpperCase();
            const visibleRaw = (
              res?.visible ?? res?.isVisible ?? res?.is_visible ??
              res?.active ?? res?.isActive ?? res?.is_active ??
              res?.enabled ?? res?.isEnabled
            );
            const explicitVisible = res?.visible;
            const explicitActive = res?.active;
            const availability = res?.available ?? res?.availability ?? res?.isAvailable;
            const isDeleted = Boolean(res?.deleted || res?.isDeleted || res?.deletedAt);
            const isActiveStatus = (!status || status === 'ACTIVE' || status === 'PUBLISHED');
            const isHiddenStatus = (status === 'HIDDEN' || status === 'INACTIVE' || status === 'DISABLED' || status === 'UNAVAILABLE' || status === 'DELETED');
            const isVisible = (visibleRaw === undefined ? true : Boolean(visibleRaw));
            if (explicitActive === false) reason = 'inactive';
            if (explicitVisible === false) reason = reason ? `${reason}_hidden` : 'hidden';
            if (!reason) {
              if (!isActiveStatus || isHiddenStatus) reason = 'inactive';
              if (!isVisible) reason = reason ? `${reason}_hidden` : 'hidden';
            }
            if (!reason && isDeleted) reason = 'deleted';
            if (!reason && availability === false) reason = 'unavailable';
          }
          cache.set(id, { ok: !reason, reason, at: Date.now() });
        } catch {
          if (cancelled) return;
          cache.set(id, { ok: false, reason: 'error', at: Date.now() });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [cartItems, cartLines]);

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  )
}

// Xuất default để import trong main.jsx
export default StoreContextProvider;
