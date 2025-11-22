import React, { useEffect, useRef, useState } from 'react';
import './AddressMapPicker.css';

const AddressMapPicker = ({ onLocationSelect, initialAddress = '' }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

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

  // Reverse geocode function using Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Search function using Nominatim
  const searchAddress = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=5&accept-language=vi`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    // Default center: Ho Chi Minh City
    const defaultCenter = [10.8231, 106.6297];

    // Create map
    mapInstanceRef.current = window.L.map(mapRef.current).setView(defaultCenter, 13);

    // Add OpenStreetMap tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    // Custom icon for marker
    const customIcon = window.L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Add marker
    markerRef.current = window.L.marker(defaultCenter, {
      draggable: true,
      icon: customIcon
    }).addTo(mapInstanceRef.current);

    markerRef.current.bindPopup('📍 Địa chỉ giao hàng').openPopup();

    // Handle marker drag
    markerRef.current.on('dragend', async (e) => {
      const { lat, lng } = e.target.getLatLng();
      const formattedAddress = await reverseGeocode(lat, lng);
      
      setAddress(formattedAddress);
      setSelectedLocation({ lat, lng, address: formattedAddress });
      markerRef.current.setPopupContent(`📍 ${formattedAddress}`).openPopup();
      
      if (onLocationSelect) {
        onLocationSelect({ lat, lng, address: formattedAddress });
      }
    });

    // Handle map click
    mapInstanceRef.current.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      
      markerRef.current.setLatLng([lat, lng]);
      const formattedAddress = await reverseGeocode(lat, lng);
      
      setAddress(formattedAddress);
      setSelectedLocation({ lat, lng, address: formattedAddress });
      markerRef.current.setPopupContent(`📍 ${formattedAddress}`).openPopup();
      
      if (onLocationSelect) {
        onLocationSelect({ lat, lng, address: formattedAddress });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapLoaded, onLocationSelect]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    searchAddress(searchQuery);
  };

  const handleSelectResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const formattedAddress = result.display_name;

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17);
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setPopupContent(`📍 ${formattedAddress}`).openPopup();
    }

    setAddress(formattedAddress);
    setSelectedLocation({ lat, lng, address: formattedAddress });
    setShowResults(false);
    setSearchQuery('');
    
    if (onLocationSelect) {
      onLocationSelect({ lat, lng, address: formattedAddress });
    }
  };

  if (!mapLoaded) {
    return (
      <div className="address-map-picker-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải bản đồ...</p>
      </div>
    );
  }

  return (
    <div className="address-map-picker">
      <div className="search-container">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Tìm kiếm địa chỉ..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length >= 3) {
                searchAddress(e.target.value);
              } else {
                setSearchResults([]);
                setShowResults(false);
              }
            }}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          {showResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div
                  key={result.place_id}
                  className="search-result-item"
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="result-icon">📍</div>
                  <div className="result-text">
                    <div className="result-name">{result.display_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
      
      <div ref={mapRef} className="map-container"></div>
      
      {selectedLocation && (
        <div className="selected-address-display">
          <div className="address-icon">📍</div>
          <div className="address-text">
            <strong>Địa chỉ đã chọn:</strong>
            <p>{address}</p>
            <small>Tọa độ: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</small>
          </div>
        </div>
      )}
      
      <div className="map-instructions">
        💡 <strong>Hướng dẫn:</strong> Click vào bản đồ hoặc kéo marker để chọn địa chỉ giao hàng
      </div>
    </div>
  );
};

export default AddressMapPicker;
