import api from './apiClient';

// Validate the cart belongs to the same merchant when adding a menu item
// POST /cart?menuItemId=... with body: [{ menuItemId, quantity, note, optionValueIds: [] }]
const cartAPI = {
  async validateWhenAdding(menuItemId, cartItems = [], signal) {
    if (!menuItemId) return { ok: true };
    const id = encodeURIComponent(menuItemId);
    try {
      const res = await api.post(`/cart?menuItemId=${id}`,
        Array.isArray(cartItems) ? cartItems : [],
        { signal, headers: { Accept: 'application/json' } }
      );
      const body = res?.data;
      return { ok: true, data: body };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Cart validation failed';
      return { ok: false, error: message, status: err?.response?.status };
    }
  }
};

export default cartAPI;
