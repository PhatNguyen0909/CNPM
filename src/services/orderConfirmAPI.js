import api from './apiClient';

/**
 * Confirm order received by customer
 * @param {string|number} orderId
 * @returns {Promise<any>}
 */
export async function confirmOrderReceived(orderId) {
  if (!orderId) throw new Error('Thiếu orderId');
  const res = await api.patch(`/orders/${orderId}/confirm`);
  return res?.data;
}
