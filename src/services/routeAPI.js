// Simple OpenRouteService API client for route polyline
// You need to get your own API key from https://openrouteservice.org/
const ORS_API_KEY = 'YOUR_ORS_API_KEY'; // <-- Thay bằng key thật

/**
 * Get route polyline from start to end (lat, lng)
 * @param {{lat:number, lng:number}} from
 * @param {{lat:number, lng:number}} to
 * @returns {Promise<Array<[number,number]>>} Array of [lat, lng]
 */
export async function getRoutePolyline(from, to) {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không lấy được route từ API');
  const data = await res.json();
  // Decode polyline
  const coords = data.features[0].geometry.coordinates;
  // Convert [lng, lat] to [lat, lng]
  return coords.map(([lng, lat]) => [lat, lng]);
}
