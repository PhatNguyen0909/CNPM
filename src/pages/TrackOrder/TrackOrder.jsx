import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './TrackOrder.css'
import { useSearchParams } from 'react-router-dom'
import orderAPI from '../../services/orderAPI'
import { confirmOrderReceived } from '../../services/orderConfirmAPI'
import FeedbackModal from '../../components/FeedbackModal/FeedbackModal'
import DroneMap from '../../components/DroneMap/DroneMap'
import restaurantAPI from '../../services/restaurantAPI'
import { StoreContext } from '../../context/StoreContext'

// Order status flow (3 steps)
const STATUS_FLOW = ['CONFIRMED', 'DELIVERING','COMPLETED']
const STATUS_LABELS = {
  CONFIRMED: 'Đã xác nhận',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành'
}

const MERCHANT_ADDRESS_KEYS = [
  'merchantAddress','merchant_address','restaurantAddress','restaurant_address','storeAddress','store_address',
  'pickupAddress','pickup_address','originAddress','origin_address','address','fullAddress','full_address',
  'detailAddress','detail_address','streetAddress','street_address','locationDescription','location_description',
  'addr','addr_full','location','contactAddress','contact_address'
]
const MERCHANT_NAME_KEYS = [
  'merchantName','merchant_name','restaurantName','restaurant_name','storeName','store_name','vendorName','vendor_name',
  'name','title','displayName','display_name','brand','brandName','brand_name'
]
const MERCHANT_ID_KEYS = [
  'merchantId','merchant_id','merchantID','restaurantId','restaurant_id','storeId','store_id','vendorId','vendor_id',
  'branchId','branch_id','id','_id','merchantUuid','restaurantUuid','restaurant_uuid','merchant_uuid'
]
const MERCHANT_NESTED_KEYS = [
  'merchant','merchantInfo','merchant_info','restaurant','restaurantInfo','restaurant_info','store','vendor','shop','origin','pickup','pickupLocation','pickup_location','location','branch','outlet','company','supplier','owner','provider','contact','details','detail','metadata','menuItem','menu_item','product','item','items','data','info'
]

const pickFirstString = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return undefined
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return undefined
}

const pickFirstIdLike = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return undefined
  for (const key of keys) {
    const value = obj[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

const deriveMerchantInfoFromOrder = ({ detail, summary, restaurants = [] }) => {
  const addressSet = new Set()
  const nameSet = new Set()
  const idSet = new Set()
  const visited = new Set()

  const inspectObject = (obj) => {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return
    visited.add(obj)
    const addr = pickFirstString(obj, MERCHANT_ADDRESS_KEYS)
    if (addr) addressSet.add(addr)
    const name = pickFirstString(obj, MERCHANT_NAME_KEYS)
    if (name) nameSet.add(name)
    const idVal = pickFirstIdLike(obj, MERCHANT_ID_KEYS)
    if (idVal !== undefined && idVal !== null && idVal !== '') idSet.add(String(idVal))
    MERCHANT_NESTED_KEYS.forEach((key) => {
      const nested = obj[key]
      if (!nested) return
      if (Array.isArray(nested)) nested.forEach(item => inspectObject(item))
      else if (typeof nested === 'object') inspectObject(nested)
    })
  }

  inspectObject(detail)
  inspectObject(detail?.raw)
  inspectObject(summary)
  const rawItems = detail?.raw?.orderItems || detail?.raw?.items || detail?.raw?.order_items || []
  if (Array.isArray(rawItems)) rawItems.forEach(item => inspectObject(item))

  const restaurantEntries = (Array.isArray(restaurants) ? restaurants : []).map((r) => {
    const ids = new Set([
      r?._id,
      r?.id,
      r?.raw?.id,
      r?.raw?._id,
      r?.raw?.merchantId,
      r?.raw?.merchant_id,
      r?.raw?.restaurantId,
      r?.raw?.restaurant_id,
    ].filter((v) => v !== undefined && v !== null).map((v) => String(v)))
    const names = new Set([
      r?.name,
      r?.raw?.name,
      r?.raw?.merchantName,
      r?.raw?.merchant_name,
      r?.raw?.restaurantName,
      r?.raw?.restaurant_name,
    ].filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim().toLowerCase()))
    const address = r?.address || pickFirstString(r?.raw || {}, MERCHANT_ADDRESS_KEYS)
    return { entry: r, ids, names, address }
  })

  let matchedRestaurant = null
  if (restaurantEntries.length && idSet.size) {
    matchedRestaurant = restaurantEntries.find((rest) => {
      for (const id of idSet) {
        if (rest.ids.has(id)) return true
      }
      return false
    }) || null
  }
  if (!matchedRestaurant && restaurantEntries.length && nameSet.size) {
    const normalizedHints = new Set([...nameSet].map((n) => n.toLowerCase()))
    matchedRestaurant = restaurantEntries.find((rest) => {
      for (const name of rest.names) {
        if (normalizedHints.has(name)) return true
      }
      return false
    }) || null
  }

  if (matchedRestaurant) {
    if (matchedRestaurant.address) addressSet.add(matchedRestaurant.address)
    if (matchedRestaurant.entry?.name) nameSet.add(matchedRestaurant.entry.name)
  }

  let chosenAddress = null
  if (addressSet.size) {
    chosenAddress = [...addressSet].sort((a, b) => b.length - a.length)[0]
  } else if (matchedRestaurant?.address) {
    chosenAddress = matchedRestaurant.address
  } else if (restaurantEntries.length) {
    chosenAddress = restaurantEntries[0].address
    if (restaurantEntries[0].entry?.name) nameSet.add(restaurantEntries[0].entry.name)
  }

  if (!chosenAddress || !chosenAddress.trim()) return null

  return {
    address: chosenAddress.trim(),
    name: [...nameSet][0] || matchedRestaurant?.entry?.name || detail?.merchantName || detail?.restaurantName || summary?.restaurantName || 'Nhà hàng',
  }
}

const formatCurrency = (v = 0) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

const hasFeedback = (summary) => {
  const source = summary?.feedbacks ?? summary?.raw?.feedbacks
  return Array.isArray(source) && source.length > 0
}

const TrackOrder = () => {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  // Two tabs: 'active' (Theo dõi đơn) | 'history' (Lịch sử)
  const [tab, setTab] = useState('active')
  const { restaurant_list: contextRestaurants } = useContext(StoreContext)
  const restaurants = useMemo(() => Array.isArray(contextRestaurants) ? contextRestaurants : [], [contextRestaurants])

  const [activeOrders, setActiveOrders] = useState([])
  const [activeLoading, setActiveLoading] = useState(false)
  const [activeError, setActiveError] = useState(null)
  const [historyOrders, setHistoryOrders] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const [flashMessage, setFlashMessage] = useState(null)
  const [flashType, setFlashType] = useState('info')
  const [mounted, setMounted] = useState(true)
  // Generic error state used in some places
  const [error, setError] = useState(null) 
  // activeError is used for the active tab, but 'error' might be used for general page errors or the 'active' tab fallback.
  // Looking at usage: setError('Không thể tải danh sách đơn hàng') in reload catch block.

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const loadActiveOrders = useCallback(async () => {
    if (code) {
      const order = await orderAPI.getOrderByCode(code)
      return order ? [order] : []
    }
    return await orderAPI.getActiveOrders()
  }, [code])

  const loadHistoryOrders = useCallback(async () => {
    return await orderAPI.getOrderHistory()
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchActive = async () => {
      setActiveLoading(true)
      setActiveError(null)
      try {
        const list = await loadActiveOrders()
        if (!cancelled) setActiveOrders(list)
      } catch (err) {
        if (!cancelled) {
          setActiveError('Không thể tải danh sách đơn hàng')
          setActiveOrders([])
        }
      } finally {
        if (!cancelled) setActiveLoading(false)
      }
    }
    fetchActive()
    return () => { cancelled = true }
  }, [code, loadActiveOrders])

  useEffect(() => {
    let cancelled = false
    const fetchHistory = async () => {
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const list = await loadHistoryOrders()
        if (!cancelled) setHistoryOrders(list)
      } catch (err) {
        console.error('Không thể tải danh sách đơn hàng (initial load)', err)
        if (!cancelled) setHistoryError('Không thể tải danh sách đơn hàng')
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }
    fetchHistory()
    return () => { cancelled = true }
  }, [loadHistoryOrders])

  const reload = useCallback(async () => {
    if (tab === 'history') {
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const list = await loadHistoryOrders()
        setHistoryOrders(list)
      } catch (err) {
        setHistoryError('Không thể tải lịch sử đơn hàng')
        setHistoryOrders([])
      } finally {
        setHistoryLoading(false)
      }
    } else {
      setActiveLoading(true)
      setActiveError(null)
      try {
        const list = await loadActiveOrders()
        setActiveOrders(list)
      } catch (err) {
        console.error('Không thể tải danh sách đơn hàng (reload)', err)
        setActiveError('Không thể tải danh sách đơn hàng')
      } finally {
        setActiveLoading(false)
      }
    }
  }, [tab, loadActiveOrders, loadHistoryOrders])

  const activeCount = activeOrders.length
  const historyCount = historyOrders.length
  const filteredOrders = useMemo(() => (tab === 'history' ? historyOrders : activeOrders), [tab, activeOrders, historyOrders])
  const currentLoading = tab === 'history' ? historyLoading : activeLoading
  const currentError = tab === 'history' ? historyError : activeError
  const emptyMessage = tab === 'history' ? 'Bạn chưa có đơn hàng trong lịch sử.' : 'Không có đơn hàng đang theo dõi.'

  useEffect(() => {
    if (!flashMessage) return
    const timer = setTimeout(() => setFlashMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [flashMessage])

  const handleFlashDismiss = useCallback(() => setFlashMessage(null), [])

  const handleFeedbackSuccess = useCallback((message) => {
    setFlashType('success')
    setFlashMessage(message || 'Đánh giá đơn hàng thành công!')
  }, [])

  const flashPortal = flashMessage ? createPortal(
    <div className="track-alert-overlay" role="presentation" onClick={handleFlashDismiss}>
      <div
        className={`track-alert track-alert-${flashType} track-alert-popup`}
        role="alert"
        onClick={(e) => e.stopPropagation()}
      >
        {flashMessage}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="track-page">
      {flashPortal}
      <div className="track-tabs">
        <button
          type="button"
          className={`track-tab ${tab==='active' ? 'active':''}`}
          onClick={() => setTab('active')}
        >
          <span>Theo dõi đơn</span>
          <span className="badge">{activeCount}</span>
        </button>
        <button
          type="button"
          className={`track-tab ${tab==='history' ? 'active':''}`}
          onClick={() => setTab('history')}
        >
          <span>Lịch sử đơn</span>
          <span className="badge">{historyCount}</span>
        </button>
        <button type="button" className="track-refresh" onClick={reload} disabled={currentLoading}>
          {currentLoading ? 'Đang tải…' : 'Làm mới'}
        </button>
      </div>
      {currentError && <p className="error">{currentError}</p>}

      <div className="orders-list">
        {filteredOrders.map(o => (
          tab === 'history'
            ? <HistoryAccordion key={o.id || o._id || o.code} orderSummary={o} />
            : <OrderAccordion
                key={o.id || o._id || o.code}
                orderSummary={o}
                restaurants={restaurants}
                onAfterConfirm={reload}
              />
        ))}
      </div>
   
    </div>
  )
}

function OrderAccordion({ orderSummary, restaurants = [], onAfterConfirm }){
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [merchantCoords, setMerchantCoords] = useState(null)
  const [deliveryCoords, setDeliveryCoords] = useState(null)
  const [geocoding, setGeocoding] = useState(false)
  const [merchantGuessInfo, setMerchantGuessInfo] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  const [mapStatusOverride, setMapStatusOverride] = useState(null)

  // Geocode address to coordinates using Nominatim
  const geocodeAddress = async (address) => {
    if (!address || address.trim().length < 3) return null
    
    // Fallback coordinates for common districts in HCMC
    const districtDefaults = {
      'q1': { lat: 10.7769, lng: 106.7009, name: 'Quận 1' },
      'quan 1': { lat: 10.7769, lng: 106.7009, name: 'Quận 1' },
      'quận 1': { lat: 10.7769, lng: 106.7009, name: 'Quận 1' },
      'q2': { lat: 10.7875, lng: 106.7399, name: 'Quận 2' },
      'q3': { lat: 10.7866, lng: 106.6831, name: 'Quận 3' },
      'q4': { lat: 10.7628, lng: 106.7032, name: 'Quận 4' },
      'q5': { lat: 10.7542, lng: 106.6662, name: 'Quận 5' },
      'q6': { lat: 10.7471, lng: 106.6357, name: 'Quận 6' },
      'q7': { lat: 10.7355, lng: 106.7217, name: 'Quận 7' },
      'q8': { lat: 10.7376, lng: 106.6761, name: 'Quận 8' },
      'quan 8': { lat: 10.7376, lng: 106.6761, name: 'Quận 8' },
      'quận 8': { lat: 10.7376, lng: 106.6761, name: 'Quận 8' },
      'q10': { lat: 10.7726, lng: 106.6677, name: 'Quận 10' },
      'q11': { lat: 10.7632, lng: 106.6503, name: 'Quận 11' },
      'q12': { lat: 10.8563, lng: 106.6717, name: 'Quận 12' },
      'binh thanh': { lat: 10.8142, lng: 106.7068, name: 'Bình Thạnh' },
      'tan binh': { lat: 10.8004, lng: 106.6524, name: 'Tân Bình' },
      'phu nhuan': { lat: 10.7991, lng: 106.6831, name: 'Phú Nhuận' },
      'thu duc': { lat: 10.8505, lng: 106.7620, name: 'Thủ Đức' },
    }

    // Check if address matches a known district (case insensitive)
    const normalizedAddr = address.toLowerCase().trim()
    for (const [key, coords] of Object.entries(districtDefaults)) {
      if (normalizedAddr.includes(key)) {
        console.log(`🎯 Using default coords for ${coords.name}:`, coords)
        return { lat: coords.lat, lng: coords.lng }
      }
    }

    // Try Nominatim geocoding
    try {
      // Enhance short addresses with "Ho Chi Minh" for better results
      const enhancedAddress = normalizedAddr.includes('hcm') || normalizedAddr.includes('ho chi minh') 
        ? address 
        : `${address}, Ho Chi Minh City, Vietnam`
        
      console.log('🔍 Geocoding enhanced address:', enhancedAddress)
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enhancedAddress)}&countrycodes=vn&limit=1&accept-language=vi`
      )
      const data = await response.json()
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
    
    // If all fails, return HCMC center as last resort
    console.warn('⚠️ Using HCM center as fallback')
    return { lat: 10.8231, lng: 106.6297 }
  }

  const toggle = async () => {
    setOpen(prev => !prev)
    if (!open && !detail){
      setLoading(true); setErr(null)
      setMerchantGuessInfo(null)
      try{
        const data = await orderAPI.getOrderById(orderSummary.id || orderSummary._id || orderSummary.orderId)
        console.log('🧾 Normalized order detail:', data)
        console.log('🧾 Raw order payload:', data?.raw)
        setDetail(data)
        setMapStatusOverride(null)

        // Geocode addresses if coordinates not available
        setGeocoding(true)
        
        // Get merchant coordinates
        if (data.merchantLatitude && data.merchantLongitude) {
          console.log('✅ Using merchant coords from order:', data.merchantLatitude, data.merchantLongitude)
          setMerchantCoords({ lat: data.merchantLatitude, lng: data.merchantLongitude })
        } else {
          // Try to get merchant address from API or context
          let merchantAddress = data.merchantAddress || data.restaurantAddress
          console.log('📍 Merchant address from order:', merchantAddress)
          
          // If no address in order, fetch from merchant API
          if (!merchantAddress && (data.merchantId || data.restaurantId)) {
            try {
              console.log('🔍 Fetching merchant data from API for ID:', data.merchantId || data.restaurantId)
              const merchantData = await restaurantAPI.getMerchantById(data.merchantId || data.restaurantId)
              console.log('📦 Merchant data received:', merchantData)
              merchantAddress = merchantData?.address
              console.log('🏪 Merchant address from API:', merchantAddress)
            } catch (err) {
              console.error('❌ Failed to fetch merchant data:', err)
            }
          }

          // Resolve merchant info from order items or cached restaurant list
          if (!merchantAddress) {
            const merchantGuess = deriveMerchantInfoFromOrder({
              detail: data,
              summary: orderSummary,
              restaurants,
            })
            setMerchantGuessInfo(merchantGuess)
            if (merchantGuess?.address) {
              merchantAddress = merchantGuess.address
              console.log('🧭 Merchant guess:', merchantGuess)
              if (!data.merchantName && merchantGuess.name) {
                data.merchantName = merchantGuess.name
              }
            }
          } else {
            setMerchantGuessInfo(null)
          }

          if (merchantAddress && merchantAddress.trim().length > 0) {
            console.log('🌍 Geocoding merchant address:', merchantAddress)
            const coords = await geocodeAddress(merchantAddress)
            console.log('📍 Merchant coords result:', coords)
            if (coords) {
              setMerchantCoords(coords)
            } else {
              console.warn('⚠️ Geocoding failed for merchant address:', merchantAddress)
            }
          } else {
            console.warn('⚠️ No merchant address available')
          }
        }

        // Get delivery coordinates
        if (data.latitude && data.longitude) {
          console.log('✅ Using delivery coords from order:', data.latitude, data.longitude)
          setDeliveryCoords({ lat: data.latitude, lng: data.longitude })
        } else if (data.deliveryAddress || orderSummary.deliveryAddress) {
          const address = data.deliveryAddress || orderSummary.deliveryAddress
          console.log('🌍 Geocoding delivery address:', address)
          const coords = await geocodeAddress(address)
          console.log('📍 Delivery coords result:', coords)
          if (coords) setDeliveryCoords(coords)
        }

        setGeocoding(false)
      }catch(err){ 
        console.error('Không tải được chi tiết đơn hàng', err)
        setErr('Không tải được chi tiết')
        setGeocoding(false)
      }
      setLoading(false)
    }
  }

  const orderId = detail?.id || detail?._id || detail?.orderId || orderSummary.id || orderSummary._id || orderSummary.orderId
  const mapStatus = (mapStatusOverride || detail?.status || orderSummary.status || '').toUpperCase()
  const droneId = detail?.drone?.id ?? detail?.droneId
  const canConfirmDelivery = Boolean(droneId) && ['DELIVERING','DRONE_ARRIVED','READY'].includes(mapStatus)

  const handleConfirmReceived = async (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    if (!orderId) return
    setConfirming(true)
    setConfirmError(null)
    try {
      await confirmOrderReceived(orderId)
      setDetail(prev => (prev ? { ...prev, status: 'COMPLETED' } : prev))
      setMapStatusOverride('RETURNING')
      if (typeof onAfterConfirm === 'function') {
        onAfterConfirm(orderId)
      }
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Không thể xác nhận đơn hàng'
      setConfirmError(message)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className={`order-accordion ${open? 'open':''}`}>
      <div className="acc-header" onClick={toggle}>
        <div className="acc-left">
          <div className="acc-code">#{orderSummary.code}</div>
          <div className="acc-meta">{orderSummary.fullName} • {orderSummary.deliveryAddress}</div>
        </div>
      
      </div>
      {open && (
        <div className="acc-body">
          {loading && <p>Đang tải...</p>}
          {err && <p className="error">{err}</p>}
          {detail && (
            <div>
              {/* Drone Map - Show live tracking */}
              {geocoding && (
                <div className="track-card">
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p>🌍 Đang xác định vị trí trên bản đồ...</p>
                  </div>
                </div>
              )}
              
              {!geocoding && merchantCoords && deliveryCoords ? (
                <DroneMap
                  merchantLocation={{
                    lat: merchantCoords.lat,
                    lng: merchantCoords.lng,
                    name: detail.merchantName || detail.restaurantName || 'Cửa hàng'
                  }}
                  deliveryLocation={{
                    lat: deliveryCoords.lat,
                    lng: deliveryCoords.lng,
                    address: detail.deliveryAddress || orderSummary.deliveryAddress
                  }}
                  droneLocation={detail?.drone?.latitude != null && detail?.drone?.longitude != null ? {
                    lat: detail.drone.latitude,
                    lng: detail.drone.longitude,
                  } : null}
                  orderStatus={mapStatus || 'CONFIRMED'}
                  autoAnimate={true}
                  droneId={droneId}
                  droneStatus={detail?.drone?.status || detail?.droneStatus}
                />
              ) : !geocoding && (
                <div className="track-card">
                  <h3>🗺️ Bản đồ theo dõi Drone</h3>
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 10px 0', color: '#6b7280' }}>
                      {!merchantCoords && !deliveryCoords ? '⚠️ Không thể xác định vị trí từ địa chỉ' : 
                       !merchantCoords ? '⚠️ Không tìm thấy vị trí cửa hàng' :
                       '⚠️ Không tìm thấy vị trí giao hàng'}
                    </p>
                    <details style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'left', marginTop: '10px' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Thông tin debug</summary>
                      <pre style={{ background: '#f3f4f6', padding: '10px', borderRadius: '4px', marginTop: '8px', overflow: 'auto', fontSize: '11px' }}>
                        {JSON.stringify({
                          merchantAddress: detail.merchantAddress || detail.restaurantAddress || 'missing',
                          merchantId: detail.merchantId || detail.restaurantId || detail.raw?.merchantId || detail.raw?.restaurantId || 'missing',
                          merchantCoords: merchantCoords || 'not found',
                          deliveryAddress: detail.deliveryAddress || orderSummary.deliveryAddress || 'missing',
                          deliveryCoords: deliveryCoords || 'not found',
                          merchantGuess: merchantGuessInfo || 'none',
                          rawKeys: detail.raw ? Object.keys(detail.raw) : [],
                          rawMerchantCandidates: {
                            merchant: detail.raw?.merchant,
                            merchantInfo: detail.raw?.merchantInfo,
                            restaurant: detail.raw?.restaurant,
                            store: detail.raw?.store,
                            vendor: detail.raw?.vendor,
                            pickup: detail.raw?.pickup,
                            pickupLocation: detail.raw?.pickupLocation,
                            origin: detail.raw?.origin,
                          },
                          rawDeliveryCandidates: {
                            delivery: detail.raw?.delivery,
                            deliveryInfo: detail.raw?.deliveryInfo,
                            customer: detail.raw?.customer,
                            customerInfo: detail.raw?.customerInfo,
                            receiver: detail.raw?.receiver,
                            destination: detail.raw?.destination,
                            shipping: detail.raw?.shipping,
                          }
                        }, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}

              <div className="track-card">
                <h3>Trạng thái</h3>
                {(() => {
                  const raw = String(detail.status || orderSummary.status || '').toUpperCase();
                  // Map various backend statuses into our 3-step flow
                  const alias = {
                    CONFIRMED: 'CONFIRMED',
                    DELIVERING:'DELIVERING',
                    COMPLETED:'COMPLETED',
                  };
                  const st = alias[raw] || raw;
                  const idx = Math.max(0.5, STATUS_FLOW.indexOf(st));
                  const totalSteps = STATUS_FLOW.length - 1; // last index
                  const progress = Math.max(0, Math.min(100, (idx / totalSteps) * 100));
                  const iconFor = (key) => {
                    switch(key){
                      case 'CONFIRMED': return '✅';
                      case 'READY': return '📦';
                      case 'DELIVERING': return '✈️';
                      case 'COMPLETED': return '🏁';
                      default: return 'ℹ️';
                    }
                  }
                  return (
                    <div>
                      <div className="progress-line"><div className="progress-fill" style={{width: progress + '%'}} /></div>
                      <div className="steps">
                        {STATUS_FLOW.map((key, i) => (
                          <div key={key} className={`step ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}`}>
                            <div className="step-icon" aria-label={STATUS_LABELS[key]} title={STATUS_LABELS[key]}>{iconFor(key)}</div>
                            <div className="step-label">{STATUS_LABELS[key]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {canConfirmDelivery && (
                  <button
                    type="button"
                    className="track-confirm-btn"
                    onClick={handleConfirmReceived}
                    disabled={confirming}
                  >
                    {confirming ? 'Đang xác nhận...' : 'Đã nhận đơn hàng'}
                  </button>
                )}
                {confirmError && <p className="track-confirm-error">{confirmError}</p>}
              </div>
              <div className="track-card">
                <h3>Chi tiết đơn hàng</h3>
                {(() => {
                  const items = Array.isArray(detail.items) ? detail.items : [];
                  const lineSubtotal = (it) => {
                    const qty = Number(it?.quantity || 1);
                    const base = Number(it?.base_price || 0);
                    const optExtra = Array.isArray(it?.options) ? it.options.reduce((s, o) => s + Number(o?.extra_price || 0), 0) : 0;
                    const sub = Number(it?.subtotal ?? (base + optExtra) * qty);
                    return Number.isFinite(sub) ? sub : 0;
                  };
                  const subTotal = items.reduce((s, it) => s + lineSubtotal(it), 0);
                  const ship = Number(detail.deliveryFee || 0);
                  const grand = Number(detail.totalAmount ?? subTotal + ship);

                  return (
                    <div>
                      {/* Items list */}
                      <div className="items-list">
                        {items.length > 0 ? items.map((it, idx) => (
                          <div key={idx} className="item-row">
                            <div className="item-line">
                              <div>
                                <div className="item-name">{it.name} <span className="item-qty">x{it.quantity}</span></div>
                                {/* Options under the item */}
                                {Array.isArray(it.options) && it.options.length > 0 && (
                                  <ul className="item-options">
                                    {it.options.map((op, j) => (
                                      <li key={j} className="item-option">
                                        {op.option} {op.extra_price > 0 && `(+${formatCurrency(op.extra_price)})`}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {it.note && <div className="item-note">Ghi chú: {it.note}</div>}
                              </div>
                              {/* Hiển thị giá món */}
                              <div className="item-price">{formatCurrency((Number(it.base_price||0)) * (Number(it.quantity||1)))}</div>
                            </div>
                            <hr />
                          </div>
                        )) : (
                          <div>Không có món trong đơn</div>
                        )}
                      </div>


                      {/* Subtotal/fee/total */}
                      <div className="order-info-row"><div>Tạm tính</div><div>{formatCurrency(subTotal)}</div></div>
                      <div className="order-info-row"><div>Phí giao hàng</div><div>{formatCurrency(ship)}</div></div>
                      <div className="order-info-row total"><div>Tổng cộng</div><div>{formatCurrency(grand)}</div></div>

                      <div className="order-meta">Tạo: {detail.createdAt && !Number.isNaN(new Date(detail.createdAt).getTime()) ? new Date(detail.createdAt).toLocaleString() : (orderSummary.createdAt && !Number.isNaN(new Date(orderSummary.createdAt).getTime()) ? new Date(orderSummary.createdAt).toLocaleString() : '-')}</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TrackOrder

function HistoryAccordion({ orderSummary, onFeedbackSuccess }){
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(orderSummary)
  const [rateOpen, setRateOpen] = useState(false)
  const [hasRated, setHasRated] = useState(() => hasFeedback(orderSummary))
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setDetail(orderSummary)
    setHasRated(hasFeedback(orderSummary))
  }, [orderSummary])

  const statusText = useMemo(() => {
    const raw = String(orderSummary.status || '').toUpperCase()
    if (raw === 'CANCELED' || raw === 'CANCELLED') return 'Hủy đơn'
    if (raw === 'COMPLETED') return 'Hoàn thành'
    return raw || '-'
  }, [orderSummary.status])

  const toggle = async () => {
    setOpen(prev => !prev)
    if (!open && !detail){
      setLoading(true); setErr(null)
      try{
        const data = await orderAPI.getOrderById(orderSummary.id || orderSummary._id || orderSummary.orderId)
        setDetail(data)
      }catch(err){
        console.error('Không tải chi tiết đơn hàng lịch sử', err)
        setErr('Không tải được chi tiết')
      }
      setLoading(false)
    }
  }

  return (
    <div className={`order-accordion ${open? 'open':''}`}>
      <div className="acc-header" onClick={toggle}>
        <div className="acc-left">
          <div className="acc-code">#{orderSummary.code}</div>
          <div className="acc-meta">{orderSummary.fullName} • {orderSummary.deliveryAddress}</div>
        </div>
        <div className="acc-right">
          <div className="acc-status">{statusText}</div>
        </div>
      </div>
      {open && (
        <div className="acc-body">
          {msg && <p>{msg}</p>}
          {detail ? (
            <div>
              <div className="track-card">
                <div className="status-current">Trạng thái đơn: <strong>{statusText}</strong></div>
              </div>
              <div className="track-card">
                <h3>Chi tiết đơn hàng</h3>
                {(() => {
                  const items = Array.isArray(detail.items) ? detail.items : []
                  const lineSubtotal = (it) => {
                    const qty = Number(it?.quantity || 1)
                    const base = Number(it?.base_price || 0)
                    const optExtra = Array.isArray(it?.options) ? it.options.reduce((s, o) => s + Number(o?.extra_price || 0), 0) : 0
                    const sub = Number(it?.subtotal ?? (base + optExtra) * qty)
                    return Number.isFinite(sub) ? sub : 0
                  }
                  const subTotal = items.reduce((s, it) => s + lineSubtotal(it), 0)
                  const ship = Number(detail.deliveryFee || 0)
                  const grand = Number(detail.totalAmount ?? subTotal + ship)

                  return (
                    <div>
                      <div className="items-list">
                        {items.length > 0 ? items.map((it, idx) => (
                          <div key={idx} className="item-row">
                            <div className="item-line">
                              <div>
                                <div className="item-name">{it.name} <span className="item-qty">x{it.quantity}</span></div>
                                {Array.isArray(it.options) && it.options.length > 0 && (
                                  <ul className="item-options">
                                    {it.options.map((op, j) => (
                                      <li key={j} className="item-option">
                                        {op.option} {op.extra_price > 0 && `(+${formatCurrency(op.extra_price)})`}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {it.note && <div className="item-note">Ghi chú: {it.note}</div>}
                              </div>
                              <div className="item-price">{formatCurrency((Number(it.base_price||0)) * (Number(it.quantity||1)))}</div>
                            </div>
                          </div>
                        )) : (
                          <div>Không có món trong đơn</div>
                        )}
                      </div>

                      <hr className="thin-sep" />

                      <div className="order-info-row"><div>Tạm tính</div><div>{formatCurrency(subTotal)}</div></div>
                      <div className="order-info-row"><div>Phí giao hàng</div><div>{formatCurrency(ship)}</div></div>
                      <div className="order-info-row total"><div>Tổng cộng</div><div>{formatCurrency(grand)}</div></div>

                      <div className="order-meta">Tạo: {detail.createdAt && !Number.isNaN(new Date(detail.createdAt).getTime()) ? new Date(detail.createdAt).toLocaleString() : (orderSummary.createdAt && !Number.isNaN(new Date(orderSummary.createdAt).getTime()) ? new Date(orderSummary.createdAt).toLocaleString() : '-')}</div>
                    </div>
                  )
                })()}
              </div>
              {String(orderSummary.status||'').toUpperCase()==='COMPLETED' && !hasRated && (
                <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}>
                  <button
                    type="button"
                    onClick={(e)=>{e.stopPropagation(); setRateOpen(true)}}
                    className="track-refresh"
                  >
                    Đánh giá
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p>Không tìm thấy dữ liệu chi tiết cho đơn hàng này.</p>
          )}
        </div>
      )}
      <FeedbackModal
        open={rateOpen}
        onClose={()=>setRateOpen(false)}
        orderId={detail?.id || orderSummary.id || orderSummary._id || orderSummary.orderId}
        onSubmit={async (feedbackData)=>{
          try{
            // feedbackData = { orderId, rating, comment?, imgFiles? }
            await orderAPI.giveFeedback(feedbackData)
            setHasRated(true)
            setMsg('Cảm ơn bạn đã đánh giá!')
            onFeedbackSuccess?.('Đánh giá đơn hàng thành công!')
            setRateOpen(false)
          }catch (_err){
            const m = _err?.response?.data?.message || _err?.message || 'Gửi đánh giá thất bại'
            setMsg(m)
          }
        }}
      />
    </div>
  )
}
