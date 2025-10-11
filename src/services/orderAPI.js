import api from './apiClient';

const orderAPI = {
  async createOrder(payload = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload tạo đơn hàng không hợp lệ.');
    }
    const response = await api.post('/customer/order', payload);
    return response?.data;
  },
};

export default orderAPI;
