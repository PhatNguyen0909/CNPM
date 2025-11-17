import api from './apiClient';

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
  const addrKey = pick('deliveryAddress','address','shippingAddress');
  const feeKey = pick('deliveryFee','shippingFee','deliveryPrice');
  const totalKey = pick('totalAmount','totalPrice','total','amount');
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

  return {
    id: o[idKey] ?? undefined,
    code: String(o[codeKey] ?? o["order_code"] ?? '').trim() || undefined,
    status: String(o[statusKey] ?? '').toUpperCase() || undefined,
    fullName: o[nameKey] ?? (o.customer?.fullName) ?? undefined,
    deliveryAddress: o[addrKey] ?? (o.shipping?.address) ?? undefined,
    deliveryFee: toNumber(o[feeKey], 0),
    totalAmount: toNumber(o[totalKey], 0),
    createdAt,
    updatedAt,
    items,
    feedbacks: Array.isArray(o.feedbacks) ? o.feedbacks : [],
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
      return st !== 'COMPLETED' && st !== 'CANCELED' && st !== 'CANCELLED';
    });
  },
  async getOrderHistory() {
    const res = await api.get('/my-order-history');
    const raw = res?.data?.data ?? res?.data;
    const candidateArrays = [raw, raw?.items, raw?.orders, raw?.content, raw?.results];
    for (const arr of candidateArrays) {
      if (Array.isArray(arr)) return arr.map(normalizeOrder);
      if (Array.isArray(arr?.items)) return arr.items.map(normalizeOrder);
    }
    if (Array.isArray(raw)) return raw.map(normalizeOrder);
    if (raw && typeof raw === 'object') return [normalizeOrder(raw)];
    return [];
  },
  async getOrderByCode(code) {
    if (!code) return null;
    // If backend supports searching by code, try that endpoint; otherwise fetch all and find
    try {
      const resp = await api.get(`my-orders/${encodeURIComponent(code)}`);
        const body = resp?.data?.data ?? resp?.data;
        if (body) return normalizeOrder(body);
    } catch (err) {
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
      // some older builds accidentally exposed this path
      ,
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
    } catch {}
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
  },
  /**
   * Give feedback on a completed order with rating, comment, and images.
   * @param {Object} feedbackData - { orderId, rating, comment?, imgFiles? }
   * @returns {Promise}
   */
  async giveFeedback(feedbackData) {
    const { orderId, rating, comment, imgFiles } = feedbackData || {};
    
    if (!orderId) throw new Error('Thiếu orderId');
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      throw new Error('Điểm đánh giá không hợp lệ');
    }

    // Create FormData for multipart/form-data
    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('rating', r);
    
    if (comment && String(comment).trim()) {
      formData.append('comment', String(comment).trim());
    }
    
    if (Array.isArray(imgFiles) && imgFiles.length > 0) {
      imgFiles.forEach((file) => {
        formData.append('imgFiles', file);
      });
    }

    const res = await api.post('/give-feedback', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res?.data;
  }
};

export default orderAPI;
