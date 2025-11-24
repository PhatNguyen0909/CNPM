import api from './apiClient';

/**
 * Update drone location for admin sync (query string)
 * @param {string|number} droneId
 * @param {{lat: number, lng: number}} coords
 * @returns {Promise<any>}
 */
export async function updateDroneLocation(droneId, coords) {
  if (!droneId) throw new Error('Thiếu droneId');
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') throw new Error('Thiếu tọa độ');
  const res = await api.put(`/admin/drones/${droneId}/update-location?latitude=${coords.lat}&longitude=${coords.lng}`);
  return res?.data;
}
