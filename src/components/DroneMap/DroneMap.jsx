import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './DroneMap.css';
import { updateDroneLocation } from '../../services/droneAdminAPI';

const LEG_DURATION_MS = 60 * 1000;
const MIDWAY_POPUP_MS = 10000;

const clampProgress = (value) => Math.max(0, Math.min(1, value));
const computeProgressAlongPath = (startLat, startLng, endLat, endLng, currentLat, currentLng) => {
  const inputs = [startLat, startLng, endLat, endLng, currentLat, currentLng];
  if (inputs.some((v) => typeof v !== 'number')) return null;
  const dx = endLat - startLat;
  const dy = endLng - startLng;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) return null;
  const projection = ((currentLat - startLat) * dx + (currentLng - startLng) * dy) / lenSq;
  return clampProgress(projection);
};

const DroneMap = ({ 
  merchantLocation, // { lat, lng, name }
  deliveryLocation, // { lat, lng, address }
  droneLocation,
  orderStatus = 'CONFIRMED',
  autoAnimate = true,
  droneId
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const droneMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [dronePosition, setDronePosition] = useState(0); // 0-100%
  const animationRef = useRef(null);
  const midwayTimerRef = useRef(null);
  const midwayShownRef = useRef({ delivering: false, returning: false });
  const lastReturnSyncRef = useRef(0);
  const merchantLat = merchantLocation?.lat;
  const merchantLng = merchantLocation?.lng;
  const merchantName = merchantLocation?.name;
  const deliveryLat = deliveryLocation?.lat;
  const deliveryLng = deliveryLocation?.lng;
  const deliveryAddress = deliveryLocation?.address;
  const droneLat = droneLocation?.lat;
  const droneLng = droneLocation?.lng;

  const [midwayVisible, setMidwayVisible] = useState(false);
  const [midwayMessage, setMidwayMessage] = useState('');

  // Check if Leaflet is loaded
  useEffect(() => {
    const checkLeaflet = setInterval(() => {
      if (window.L) {
        setMapLoaded(true);
        clearInterval(checkLeaflet);
      }
    }, 100);

    return () => clearInterval(checkLeaflet);
  }, []);

  useEffect(() => {
    return () => {
      if (midwayTimerRef.current) {
        clearTimeout(midwayTimerRef.current);
        midwayTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    midwayShownRef.current = { delivering: false, returning: false };
    setMidwayVisible(false);
    if (midwayTimerRef.current) {
      clearTimeout(midwayTimerRef.current);
      midwayTimerRef.current = null;
    }
  }, [orderStatus, merchantLat, merchantLng, deliveryLat, deliveryLng]);

  const showMidwayToast = useCallback((message) => {
    setMidwayMessage(message);
    setMidwayVisible(true);
    if (midwayTimerRef.current) {
      clearTimeout(midwayTimerRef.current);
    }
    midwayTimerRef.current = setTimeout(() => {
      setMidwayVisible(false);
      midwayTimerRef.current = null;
    }, MIDWAY_POPUP_MS);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;
    if (merchantLat == null || merchantLng == null || deliveryLat == null || deliveryLng == null) return;

    const merchantCoords = [merchantLat, merchantLng];
    const deliveryCoords = [deliveryLat, deliveryLng];

    // Calculate center between two points
    const centerLat = (merchantLat + deliveryLat) / 2;
    const centerLng = (merchantLng + deliveryLng) / 2;

    // Create map
    mapInstanceRef.current = window.L.map(mapRef.current).setView([centerLat, centerLng], 13);

    // Add OpenStreetMap tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    // Merchant marker (red)
    const redIcon = window.L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    window.L.marker(merchantCoords, { icon: redIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup(`🏪 ${merchantName || 'Cửa hàng'}`)
      .openPopup();

    // Delivery location marker (green)
    const greenIcon = window.L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    window.L.marker(deliveryCoords, { icon: greenIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup(`📍 ${deliveryAddress || 'Địa chỉ giao hàng'}`);

    // Draw route line (dashed blue line)
    polylineRef.current = window.L.polyline([merchantCoords, deliveryCoords], {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10',
      lineJoin: 'round'
    }).addTo(mapInstanceRef.current);

    // Create custom drone icon
    const droneIcon = window.L.divIcon({
      html: `
        <div class="drone-marker">
          <div class="drone-icon">✈️</div>
          <div class="drone-shadow"></div>
        </div>
      `,
      className: 'custom-drone-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Drone marker
    droneMarkerRef.current = window.L.marker(merchantCoords, {
      icon: droneIcon,
      zIndexOffset: 1000
    }).addTo(mapInstanceRef.current);

    // Fit bounds to show both markers
    const bounds = window.L.latLngBounds([merchantCoords, deliveryCoords]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });

    setMapReady(true);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapReady(false);
    };
  }, [mapLoaded, merchantLat, merchantLng, merchantName, deliveryLat, deliveryLng, deliveryAddress]);

  // Animate drone movement
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !droneMarkerRef.current) return;
    if (merchantLat == null || merchantLng == null || deliveryLat == null || deliveryLng == null) return;
    if (orderStatus !== 'DELIVERING' || !autoAnimate) return;

    const merchantCoords = [merchantLat, merchantLng];
    const deliveryCoords = [deliveryLat, deliveryLng];

    let progress = 0;
    const projectedProgress = computeProgressAlongPath(
      merchantLat,
      merchantLng,
      deliveryLat,
      deliveryLng,
      droneLat,
      droneLng
    );
    if (projectedProgress !== null) {
      progress = projectedProgress;
      const projectedLat = merchantCoords[0] + (deliveryCoords[0] - merchantCoords[0]) * progress;
      const projectedLng = merchantCoords[1] + (deliveryCoords[1] - merchantCoords[1]) * progress;
      droneMarkerRef.current.setLatLng([projectedLat, projectedLng]);
      setDronePosition(Math.round(progress * 100));

      if (progress >= 1) {
        droneMarkerRef.current.bindPopup('✅ Drone đã đến!').openPopup();
        return;
      }

      if (progress >= 0.5) {
        midwayShownRef.current.delivering = true;
      }
    }

    const duration = LEG_DURATION_MS;
    const startTime = Date.now() - progress * duration;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);

      // Linear interpolation between merchant and delivery
      const currentLat = merchantCoords[0] + (deliveryCoords[0] - merchantCoords[0]) * progress;
      const currentLng = merchantCoords[1] + (deliveryCoords[1] - merchantCoords[1]) * progress;

      droneMarkerRef.current.setLatLng([currentLat, currentLng]);
      setDronePosition(Math.round(progress * 100));

      // Calculate rotation angle
      const angle = Math.atan2(
        deliveryCoords[1] - merchantCoords[1],
        deliveryCoords[0] - merchantCoords[0]
      ) * (180 / Math.PI);

      // Update drone rotation
      const droneElement = droneMarkerRef.current.getElement();
      if (droneElement) {
        const droneIcon = droneElement.querySelector('.drone-icon');
        if (droneIcon) {
          droneIcon.style.transform = `rotate(${angle + 90}deg)`;
        }
      }

      if (!midwayShownRef.current.delivering && progress >= 0.5) {
        midwayShownRef.current.delivering = true;
        showMidwayToast('Drone đã đi được nửa quãng đường, chuẩn bị nhận hàng nhé!');
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Arrived
        droneMarkerRef.current.bindPopup('✅ Drone đã đến!').openPopup();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mapReady, merchantLat, merchantLng, deliveryLat, deliveryLng, orderStatus, autoAnimate, droneLat, droneLng]);

  // Animate drone returning to station (client-only mock path with API sync)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !droneMarkerRef.current) return;
    if (orderStatus !== 'RETURNING' || !autoAnimate) return;
    if (merchantLat == null || merchantLng == null || deliveryLat == null || deliveryLng == null) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    lastReturnSyncRef.current = 0;

    const startCoords = [deliveryLat, deliveryLng];
    const endCoords = [merchantLat, merchantLng];
    droneMarkerRef.current.setLatLng(startCoords);

    const angle = Math.atan2(
      endCoords[1] - startCoords[1],
      endCoords[0] - startCoords[0]
    ) * (180 / Math.PI);

    const applyRotation = () => {
      const droneElement = droneMarkerRef.current?.getElement();
      if (!droneElement) return;
      const droneIcon = droneElement.querySelector('.drone-icon');
      if (droneIcon) {
        droneIcon.style.transform = `rotate(${angle + 90}deg)`;
      }
    };
    applyRotation();

    if (polylineRef.current) {
      polylineRef.current.remove();
    }
    polylineRef.current = window.L.polyline([startCoords, endCoords], {
      color: '#f59e42',
      weight: 4,
      opacity: 0.85,
      dashArray: '6, 8',
      lineJoin: 'round',
    }).addTo(mapInstanceRef.current);

    const duration = LEG_DURATION_MS;
    const projectedProgress = computeProgressAlongPath(
      startCoords[0],
      startCoords[1],
      endCoords[0],
      endCoords[1],
      droneLat,
      droneLng
    );
    let initialProgress = 0;
    if (projectedProgress !== null) {
      initialProgress = projectedProgress;
      const projectedLat = startCoords[0] + (endCoords[0] - startCoords[0]) * initialProgress;
      const projectedLng = startCoords[1] + (endCoords[1] - startCoords[1]) * initialProgress;
      droneMarkerRef.current.setLatLng([projectedLat, projectedLng]);
      setDronePosition(Math.round(initialProgress * 100));

      if (initialProgress >= 1) {
        droneMarkerRef.current.bindPopup('🏠 Drone đã về trạm!').openPopup();
        return;
      }

      if (initialProgress >= 0.5) {
        midwayShownRef.current.returning = true;
      }
    }
    const startTime = Date.now() - initialProgress * duration;
    const SYNC_INTERVAL = 3000;

    const animateReturn = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentLat = startCoords[0] + (endCoords[0] - startCoords[0]) * progress;
      const currentLng = startCoords[1] + (endCoords[1] - startCoords[1]) * progress;

      droneMarkerRef.current.setLatLng([currentLat, currentLng]);
      setDronePosition(Math.round(progress * 100));

      if (droneId) {
        const now = Date.now();
        if (now - lastReturnSyncRef.current >= SYNC_INTERVAL || lastReturnSyncRef.current === 0) {
          lastReturnSyncRef.current = now;
          updateDroneLocation(droneId, { lat: currentLat, lng: currentLng }).catch((err) => {
            console.warn('Không thể cập nhật toạ độ drone khi RETURNING', err);
          });
        }
      }

      if (!midwayShownRef.current.returning && progress >= 0.5) {
        midwayShownRef.current.returning = true;
        showMidwayToast('Drone đang quay về trạm (đã đi được nửa đường).');
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateReturn);
      } else {
        if (droneId) {
          updateDroneLocation(droneId, { lat: endCoords[0], lng: endCoords[1] }).catch(() => {});
        }
        droneMarkerRef.current.bindPopup('🏠 Drone đã về trạm!').openPopup();
      }
    };

    animationRef.current = requestAnimationFrame(animateReturn);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mapReady, orderStatus, autoAnimate, merchantLat, merchantLng, deliveryLat, deliveryLng, droneLat, droneLng]);

  // Update drone position based on order status
  useEffect(() => {
    if (!droneMarkerRef.current) return;
    if (merchantLat == null || merchantLng == null || deliveryLat == null || deliveryLng == null) return;

    const merchantCoords = [merchantLat, merchantLng];
    const deliveryCoords = [deliveryLat, deliveryLng];

    switch (orderStatus) {
      case 'CONFIRMED':
        droneMarkerRef.current.setLatLng(merchantCoords);
        droneMarkerRef.current.bindPopup('🏪 Drone đang chờ tại cửa hàng').openPopup();
        setDronePosition(0);
        break;
      case 'DRONE_ARRIVED':
      case 'COMPLETED':
        droneMarkerRef.current.setLatLng(deliveryCoords);
        droneMarkerRef.current.bindPopup('✅ Drone đã đến!').openPopup();
        setDronePosition(100);
        break;
      default:
        break;
    }
  }, [orderStatus, merchantLat, merchantLng, deliveryLat, deliveryLng]);

  const statusText = useMemo(() => {
    switch (orderStatus) {
      case 'CONFIRMED':
        return '🏪 Đơn hàng đã xác nhận - Drone đang chờ tại cửa hàng';
      case 'DELIVERING':
        return '✈️ Drone đang bay đến địa chỉ giao hàng';
      case 'DRONE_ARRIVED':
        return '📍 Drone đã đến - Vui lòng nhận hàng';
      case 'COMPLETED':
        return '✅ Đơn hàng đã hoàn thành';
      case 'RETURNING':
        return '🛬 Drone đang quay về trạm';
      default:
        return 'ℹ️ Đang xử lý đơn hàng';
    }
  }, [orderStatus]);

  return (
    <div className="drone-map-container">
      {midwayVisible && (
        <div className="drone-midway-toast" role="status">
          <div className="drone-midway-card">
            <span className="drone-midway-icon">⚡</span>
            <div>
              <p className="drone-midway-title">Drone đã đi được 1/2 chặng</p>
              <p className="drone-midway-message">{midwayMessage}</p>
            </div>
          </div>
        </div>
      )}
      <div className="drone-map-header">
        <div className="status-text">{statusText}</div>
        {(orderStatus === 'DELIVERING' || orderStatus === 'RETURNING') && (
          <div className="progress-info">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${dronePosition}%` }}></div>
            </div>
            <div className="progress-text">{dronePosition}%</div>
          </div>
        )}
      </div>
      <div className="map-container" ref={mapRef}></div>
      <div className="drone-map-legend">
        <div className="legend-item">
          <span className="legend-icon red">🏪</span>
          <span className="legend-text">{merchantName || 'Cửa hàng'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon blue">✈️</span>
          <span className="legend-text">Drone giao hàng</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon green">📍</span>
          <span className="legend-text">{deliveryAddress || 'Điểm giao hàng'}</span>
        </div>
      </div>
    </div>
  );
};

export default DroneMap;