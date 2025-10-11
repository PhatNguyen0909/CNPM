import { getPublicApi } from "./apiClient";

const restaurantAPI = {
  async fetchActiveMerchants(signal) {
    const response = await getPublicApi().get("/customer/merchants", { signal });
    const body = response?.data;
    if (Array.isArray(body?.data)) {
      return body.data;
    }
    if (Array.isArray(body)) {
      return body;
    }
    return [];
  },
};

export default restaurantAPI;
