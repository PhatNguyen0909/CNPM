import { getPublicApi } from "./apiClient";

const restaurantAPI = {
  async fetchActiveMerchants(signal) {
    try{
      const response = await getPublicApi().get("/merchants", { signal });
      const body = response?.data;
      if (Array.isArray(body?.data)) return body.data;
      if (Array.isArray(body)) return body;
      return [];
    }catch(err){
      // helpful debug logging
      try{
        console.error('restaurantAPI.fetchActiveMerchants error', {
          url: getPublicApi().defaults.baseURL + '/merchants',
          message: err?.message,
          code: err?.code,
          status: err?.response?.status,
        })
      }catch(e){ console.error('restaurantAPI logging failed', e) }
      throw err;
    }
  },
};

export default restaurantAPI;
