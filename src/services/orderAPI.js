import api from './apiClient';

const firstDefined = (...values) => values.find((v) => v !== undefined && v !== null);
const toCoordNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};
const extractAddressFrom = (source) => {
  if (!source) return undefined;
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) return extractAddressFrom(source[0]);
  if (typeof source === 'object') {
    const candidate = firstDefined(
      source.address,
      source.fullAddress,
      source.full_address,
      source.detailAddress,
      source.detail_address,
      source.streetAddress,
      source.street_address,
      source.location?.address,
      source.location?.fullAddress,
      source.location?.full_address,
      source.addr,
      source.pickupAddress,
      source.pickup_address,
      source.originAddress,
      source.origin_address,
      source.storeAddress,
      source.store_address,
      source.description,
      source.note
    );
    return typeof candidate === 'string' ? candidate : undefined;
  }
  return undefined;
};
const extractCoordsFrom = (source) => {
  if (!source || typeof source !== 'object') return { lat: undefined, lng: undefined };
  const lat = toCoordNumber(firstDefined(
    source.latitude,
    source.lat,
    source.latValue,
    source.lat_value,
    source.latitute,
    source.y,
    source.location?.latitude,
    source.location?.lat,
    source.coords?.latitude,
    source.coords?.lat,
    Array.isArray(source.coordinates) ? source.coordinates[1] : undefined
  ));
  const lng = toCoordNumber(firstDefined(
    source.longitude,
    source.long,
    source.lng,
    source.lon,
    source.longValue,
    source.long_value,
    source.x,
    source.location?.longitude,
    source.location?.lng,
    source.coords?.longitude,
    source.coords?.lng,
    Array.isArray(source.coordinates) ? source.coordinates[0] : undefined
  ));
  return { lat, lng };
};

// Normalize line option from various shapes
const normalizeOption = (opt) => {
  if (!opt) return null;
  const name = opt.optionValueName || opt.name || opt.title || opt.label || '';
  const extra = Number(opt.extraPrice ?? opt.priceDelta ?? opt.extra_price ?? opt.price ?? 0) || 0;
  return { option: String(name), extra_price: extra };
};

// Normalize line item from various shapes
const normalizeItem = (item) => {
  if (!item) return null;
  const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
  const base = Number(item.menuItemBasePrice ?? item.basePrice ?? item.price ?? 0) || 0;
  const subtotal = Number(item.subtotal ?? item.totalPrice ?? base * qty) || 0;
  const name = item.menuItemName || item.name || item.itemName || 'Sản phẩm';
  const optionsRaw = item.optionValues || item.options || item.selectedOptions || [];
  const options = Array.isArray(optionsRaw) ? optionsRaw.map(normalizeOption).filter(Boolean) : [];
  return {
    name: String(name),
    quantity: qty,
    base_price: base,
    subtotal,
    options,
    note: item.note || '',
  };
};

// Normalize different backend shapes into a single order object we can render safely
const normalizeOrder = (input) => {
  const o = input || {};
  const pick = (...keys) => keys.find(k => o[k] !== undefined && o[k] !== null);
  const idKey = pick('id','_id','orderId','orderID');
  const codeKey = pick('code','orderCode');
  const statusKey = pick('status','orderStatus');
  const nameKey = pick('fullName','receiverName','customerName','name','customer_full_name');
  const addrKey = pick('deliveryAddress','address','shippingAddress','customerAddress','customer_address','destinationAddress','destination_address','receiverAddress','receiver_address');
  const feeKey = pick('deliveryFee','shippingFee','deliveryPrice');
  const totalKey = pick('totalAmount','totalPrice','total','amount');
  const merchantIdKey = pick('merchantId','merchant_id','merchantID','restaurantId','restaurant_id','storeId','store_id','vendorId','vendor_id');
  const merchantNameKey = pick('merchantName','merchant_name','restaurantName','restaurant_name','storeName','store_name','vendorName','vendor_name');
  const merchantAddressKey = pick('merchantAddress','merchant_address','restaurantAddress','restaurant_address','pickupAddress','pickup_address','storeAddress','store_address','originAddress','origin_address');
  const merchantLatKey = pick('merchantLatitude','merchantLat','merchant_lat','restaurantLatitude','restaurantLat','restaurant_lat','pickupLatitude','pickup_lat','storeLatitude','storeLat','store_lat','originLatitude','origin_lat');
  const merchantLngKey = pick('merchantLongitude','merchantLong','merchant_lng','restaurantLongitude','restaurantLong','restaurant_lng','pickupLongitude','pickup_long','storeLongitude','storeLong','store_lng','originLongitude','origin_lng');
  const deliveryLatKey = pick('latitude','lat','customerLatitude','customer_latitude','deliveryLatitude','delivery_latitude','shippingLatitude','shipping_latitude','destinationLatitude','destination_latitude');
  const deliveryLngKey = pick('longitude','lng','customerLongitude','customer_longitude','deliveryLongitude','delivery_longitude','shippingLongitude','shipping_longitude','destinationLongitude','destination_longitude');
  const createdKey = pick('createdAt','created_at','createdDate','createAt','created_time');
  const updatedKey = pick('updatedAt','updated_at','updateAt','updated_time');

  const toNumber = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  // Don't convert to ISO here to avoid throwing with unconventional formats.
  const createdAt = o[createdKey];
  const updatedAt = o[updatedKey];

  // items
  const itemsRawCandidates = [o.orderItems, o.items, o.order_items, o.detailItems];
  let items = [];
  for (const cand of itemsRawCandidates) {
    if (Array.isArray(cand)) { items = cand.map(normalizeItem).filter(Boolean); break; }
  }

  const nestedMerchantSources = [o.merchant, o.merchantInfo, o.restaurant, o.restaurantInfo, o.store, o.vendor, o.shop, o.origin, o.pickup, o.pickupLocation].filter(Boolean);
  const nestedDeliverySources = [o.delivery, o.deliveryInfo, o.shipping, o.shippingInfo, o.shippingAddress, o.customer, o.customerInfo, o.receiver, o.destination].filter(Boolean);

  let merchantId = merchantIdKey ? o[merchantIdKey] : undefined;
  if (!merchantId) {
    for (const src of nestedMerchantSources) {
      const candidate = firstDefined(src?.id, src?._id, src?.merchantId, src?.merchant_id, src?.restaurantId, src?.restaurant_id, src?.storeId, src?.store_id);
      if (candidate !== undefined && candidate !== null) { merchantId = candidate; break; }
    }
  }

  let merchantName = merchantNameKey ? o[merchantNameKey] : undefined;
  if (!merchantName) {
    for (const src of nestedMerchantSources) {
      const candidate = firstDefined(src?.name, src?.merchantName, src?.merchant_name, src?.restaurantName, src?.restaurant_name, src?.storeName, src?.store_name);
      if (candidate) { merchantName = candidate; break; }
    }
  }

  let merchantAddress = merchantAddressKey ? o[merchantAddressKey] : undefined;
  if (!merchantAddress) {
    for (const src of nestedMerchantSources) {
      const candidate = extractAddressFrom(src);
      if (candidate) { merchantAddress = candidate; break; }
      if (typeof src === 'string') { merchantAddress = src; break; }
    }
  }

  let merchantLatitude = merchantLatKey ? toNumber(o[merchantLatKey], undefined) : undefined;
  let merchantLongitude = merchantLngKey ? toNumber(o[merchantLngKey], undefined) : undefined;
  if (merchantLatitude === undefined || merchantLongitude === undefined) {
    for (const src of nestedMerchantSources) {
      if (src && typeof src === 'object') {
        const coords = extractCoordsFrom(src);
        if (merchantLatitude === undefined && coords.lat !== undefined) merchantLatitude = coords.lat;
        if (merchantLongitude === undefined && coords.lng !== undefined) merchantLongitude = coords.lng;
      }
      if (merchantLatitude !== undefined && merchantLongitude !== undefined) break;
    }
  }

  let deliveryAddress = addrKey ? o[addrKey] : undefined;
  if (!deliveryAddress) {
    for (const src of nestedDeliverySources) {
      const candidate = extractAddressFrom(src);
      if (candidate) { deliveryAddress = candidate; break; }
      if (typeof src === 'string') { deliveryAddress = src; break; }
    }
  }

  let deliveryLatitude = deliveryLatKey ? toNumber(o[deliveryLatKey], undefined) : undefined;
  let deliveryLongitude = deliveryLngKey ? toNumber(o[deliveryLngKey], undefined) : undefined;
  if (deliveryLatitude === undefined || deliveryLongitude === undefined) {
    for (const src of nestedDeliverySources) {
      if (src && typeof src === 'object') {
        const coords = extractCoordsFrom(src);
        if (deliveryLatitude === undefined && coords.lat !== undefined) deliveryLatitude = coords.lat;
        if (deliveryLongitude === undefined && coords.lng !== undefined) deliveryLongitude = coords.lng;
      }
      if (deliveryLatitude !== undefined && deliveryLongitude !== undefined) break;
    }
  }

  return {
    id: o[idKey] ?? undefined,
    code: String(o[codeKey] ?? o["order_code"] ?? '').trim() || undefined,
    status: String(o[statusKey] ?? '').toUpperCase() || undefined,
    fullName: o[nameKey] ?? (o.customer?.fullName) ?? undefined,
    deliveryAddress,
    deliveryFee: toNumber(o[feeKey], 0),
    totalAmount: toNumber(o[totalKey], 0),
    merchantId: merchantId ?? o.restaurant?.id ?? o.restaurant?._id,
    merchantName: merchantName ?? o.restaurant?.name ?? o.merchant?.name,
    merchantAddress: merchantAddress ?? o.restaurant?.address ?? o.merchant?.address,
    merchantLatitude,
    merchantLongitude,
    latitude: deliveryLatitude ?? toNumber(o.shipping?.latitude, undefined),
    longitude: deliveryLongitude ?? toNumber(o.shipping?.longitude, undefined),
    createdAt,
    updatedAt,
    items,
    raw: o,
  };
};

const orderAPI = {
  async createOrder(payload = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload tạo đơn hàng không hợp lệ.');
    }
    const response = await api.post('/check-out', payload);
    return response?.data;
  },
  async getOrders() {
      const res = await api.get('/my-orders');
      const raw = res?.data?.data ?? res?.data;
      const candidateArrays = [raw, raw?.items, raw?.orders, raw?.content, raw?.results];
      for (const arr of candidateArrays) {
        if (Array.isArray(arr)) return arr.map(normalizeOrder);
        if (Array.isArray(arr?.items)) return arr.items.map(normalizeOrder);
      }
      // If API returned a single object, still normalize
      if (raw && typeof raw === 'object') return [normalizeOrder(raw)];
      return [];
  },
  async getActiveOrders() {
    const all = await orderAPI.getOrders();
    if (!Array.isArray(all)) return [];
    return all.filter(o => {
      const st = String(o.status).toUpperCase();
      return st !== 'COMPLETED' && st !== 'CANCELED';
    });
  },
  async getOrderByCode(code) {
    if (!code) return null;
    // If backend supports searching by code, try that endpoint; otherwise fetch all and find
    try {
      const resp = await api.get(`my-orders/${encodeURIComponent(code)}`);
        const body = resp?.data?.data ?? resp?.data;
        if (body) return normalizeOrder(body);
    } catch {
      // fallback: fetch all and find by code
      const all = await orderAPI.getOrders();
      if (Array.isArray(all)) return all.find(o => String(o.code) === String(code)) || null;
      return null;
    }
  }
  ,
  async getOrderById(orderId) {
    if (!orderId) return null;
    const id = encodeURIComponent(orderId);
    // Try common customer-first endpoints, then fall back
    const candidatePaths = [
      `/my-orders/${id}`,
      // Add more legacy paths here if backend exposes them
    ];

    let lastErr;
    for (const path of candidatePaths) {
      try {
        const resp = await api.get(path);
          const body = resp?.data?.data ?? resp?.data;
          if (body) return normalizeOrder(body);
      } catch (e) {
        lastErr = e;
      }
    }
    // Final fallback: fetch all and find by id
    try {
        const all = await orderAPI.getOrders();
        if (Array.isArray(all)) {
          const found = all.find(o => String(o.id ?? o._id ?? o.orderId) === String(orderId));
          if (found) return found;
        }
    } catch (listErr) {
      if (import.meta?.env?.DEV) {
        console.warn('orderAPI.getOrderById fallback list failed', listErr);
      }
    }
    if (lastErr) throw lastErr;
    return null;
  },
  /**
   * Rate a completed order with stars only.
   * @param {number|string} orderId
   * @param {number} rating 1-5
   */
  async rateOrder(orderId, rating){
    if (!orderId) throw new Error('Thiếu orderId');
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      throw new Error('Điểm đánh giá không hợp lệ');
    }
    const res = await api.post('/rating', { orderId, rating: r });
    return res?.data;
  }
};

export default orderAPI;
