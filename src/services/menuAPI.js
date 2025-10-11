import { getPublicApi } from "./apiClient";

const menuAPI = {
  async fetchMenuItemsByMerchant(merchantId, signal) {
    if (!merchantId) return [];
    const response = await getPublicApi().get(`/customer/menu-items/${merchantId}`, { signal });
    const body = response?.data;
    if (Array.isArray(body?.data)) {
      return body.data;
    }
    if (Array.isArray(body?.items)) {
      return body.items;
    }
    if (Array.isArray(body)) {
      return body;
    }
    return [];
  },
};

export default menuAPI;
