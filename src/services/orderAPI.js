import api from './apiClient';

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
  }
};

export default orderAPI;
