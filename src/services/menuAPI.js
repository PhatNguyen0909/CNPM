import api, { getPublicApi } from "./apiClient";

const extractArray = (body) => {
  if (!body) return [];
  const candidates = [
    body,
    body?.data,
    body?.items,
    body?.results,
    body?.content,
    body?.records,
    body?.data?.items,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
};

const tryClients = async (clients, paths, signal) => {
  let lastErr;
  for (const client of clients) {
    for (const p of paths) {
      try {
        const res = await client.get(p, { signal, headers: { Accept: 'application/json' } });
        const list = extractArray(res?.data);
        if (list.length) return list;
      } catch (e) {
        lastErr = e;
        // If unauthorized with this client, try next client
        const status = e?.response?.status;
        if (status === 401 || status === 403) break;
      }
    }
  }
  if (lastErr) {
    // optional: console.warn('fetchMenuItemsByMerchant failed', lastErr);
  }
  return [];
};

const menuAPI = {
  // Customer-facing: get all active & visible menu items by merchant
  async fetchMenuItemsByMerchant(merchantId, signal) {
    if (!merchantId) return [];
    const id = encodeURIComponent(merchantId);
    const paths = [
      `/merchants/${id}/menu-items`,
    ];
    // Prefer authenticated client first (fixes 401), then fallback to public
    const list = await tryClients([api, getPublicApi()], paths, signal);
    return list;
  },

  // Get a single menu item by its id, including options
  async fetchMenuItemById(menuItemId, signal) {
    if (!menuItemId) return null;
    const id = encodeURIComponent(menuItemId);
    try {
      const res = await api.get(`/menu-items/${id}` , { signal, headers: { Accept: 'application/json' } });
      // Try common wrapper shapes first
      const body = res?.data;
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        // Typical shapes: { data: {...} } | {...}
        return body?.data || body;
      }
      return body ?? null;
    } catch {
      // fallback to public api (if endpoint allows)
      try {
        const res = await getPublicApi().get(`/menu-items/${id}`, { signal, headers: { Accept: 'application/json' } });
        const body = res?.data;
        if (body && typeof body === 'object' && !Array.isArray(body)) {
          return body?.data || body;
        }
        return body ?? null;
      } catch {
        // optional: console.warn('fetchMenuItemById failed', err);
        return null;
      }
    }
  },
};

export default menuAPI;
