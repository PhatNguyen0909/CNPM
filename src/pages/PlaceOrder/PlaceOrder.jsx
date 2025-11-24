import React, { useContext, useState, useEffect, useMemo } from 'react'
import './PlaceOrder.css'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute'
import orderAPI from '../../services/orderAPI'
import { attachToken } from '../../services/apiClient'
import { formatVND } from '../../utils/formatCurrency'
import AddressMapPicker from '../../components/AddressMapPicker/AddressMapPicker'

const PlaceOrder = () => {

  const { getTotalCartAmount, token, food_list, cartItems, cartLines, user, clearCart } = useContext(StoreContext)
  const navigate = useNavigate()

  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    addressDetail: "",
    note: "",
    latitude: null,
    longitude: null
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('COD')

  useEffect(() => {
    if (!token) {
      navigate('/cart')
      alert("Vui lòng đăng nhập để đặt hàng!");
    } else if (getTotalCartAmount() === 0) {
      navigate('/cart')
      alert("Giỏ hàng của bạn đang trống!");
    }
    
    // Tự động điền tên từ thông tin user (nếu có)
    if (user && user.name) {
      setData(prevData => ({
        ...prevData,
        firstName: user.name ? user.name.split(' ')[0] : '',
        lastName: user.name ? user.name.split(' ').slice(1).join(' ') : ''
      }));
    }
  }, [token, user])

  const fullName = useMemo(() => {
    return [data.firstName, data.lastName].map(part => part.trim()).filter(Boolean).join(' ');
  }, [data.firstName, data.lastName])

  const deliveryAddress = useMemo(() => {
    return (data.addressDetail || '').trim();
  }, [data.addressDetail])

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData(data => ({ ...data, [name]: value }))
  }

  // Hỗ trợ nhập "Họ và tên" một ô duy nhất
  const onFullNameChange = (e) => {
    const value = e.target.value || '';
    const parts = value.trim().split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ');
    setData(prev => ({ ...prev, firstName: first, lastName: last }));
  }

  const placeOrder = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const buildMenuItemId = (item) => {
      if (!item) return null;
      const raw = item.raw || {};
      const candidate =
        raw.menuItemId ??
        raw.menuItemID ??
        raw.itemId ??
        raw.itemID ??
        raw.id ??
        raw._id ??
        item._id;
      if (candidate === null || candidate === undefined) return null;
      if (typeof candidate === 'number') return candidate;
      const asNumber = Number(candidate);
      if (!Number.isNaN(asNumber) && String(asNumber) === String(candidate).trim()) {
        return asNumber;
      }
      return String(candidate).trim();
    };

  const orderItems = [];

    Object.entries(cartItems || {}).forEach(([itemId, qty]) => {
      if (!qty) return;
      const numericQty = Number(qty);
      if (!Number.isFinite(numericQty) || numericQty <= 0) return;
      const item = food_list.find(food => String(food._id) === String(itemId));
      if (!item) return;
      const menuItemId = buildMenuItemId(item);
      if (!menuItemId && menuItemId !== 0) return;
      orderItems.push({
        menuItemId,
        quantity: numericQty,
        note: '',
        optionValueIds: [],
      });
    });

    (cartLines || []).forEach((line) => {
      if (!line || !line.quantity) return;
      const numericQty = Number(line.quantity);
      if (!Number.isFinite(numericQty) || numericQty <= 0) return;
      const item = food_list.find(food => String(food._id) === String(line.itemId));
      const menuItemId = buildMenuItemId(item);
      if (!menuItemId && menuItemId !== 0) return;
      const optionIds = Array.isArray(line.optionValueIds) ? line.optionValueIds : [];
      orderItems.push({
        menuItemId,
        quantity: numericQty,
        note: line.note || '',
        optionValueIds: optionIds,
      });
    });

    if (orderItems.length === 0) {
      alert("Giỏ hàng của bạn đang trống!");
      navigate('/cart');
      return;
    }

    if (!fullName) {
      setSubmitError('Vui lòng nhập họ và tên.');
      return;
    }

    if (!data.phone.trim()) {
      setSubmitError('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    if (!deliveryAddress) {
      setSubmitError('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    const lineNotes = (cartLines || [])
      .filter((line) => line?.note)
      .map((line) => line.note.trim())
      .filter(Boolean);

    const payload = {
      fullName,
      phone: data.phone.trim(),
      note: [data.note.trim(), ...lineNotes].filter(Boolean).join(' | '),
      deliveryAddress,
      cartItems: orderItems,
      latitude: data.latitude,
      longitude: data.longitude,
    };

    try {
      setSubmitting(true);
      // Ensure Authorization header is present on this critical call
      if (token) attachToken(token);
      const response = await orderAPI.createOrder(payload);

      if (paymentMethod === 'VNPay') {
        const subtotal = Number(getTotalCartAmount() || 0);
        const shippingFee = subtotal === 0 ? 0 : 15000;
        const grandTotal = subtotal + shippingFee;

        try {
          // VNPay requires integer amount
          const amount = Math.round(grandTotal);
          const result = await orderAPI.createPaymentUrl(amount);
          console.log("VNPay response:", result);
          
          let paymentUrl = null;
          if (typeof result === 'string') {
            paymentUrl = result;
          } else if (typeof result === 'object' && result !== null) {
            paymentUrl = result.url || result.paymentUrl || result.vnpUrl || result.data;
          }

          if (paymentUrl && typeof paymentUrl === 'string') {
            clearCart();
            window.location.href = paymentUrl;
            return;
          } else {
            console.error("Invalid payment URL response:", result);
            alert('Đơn hàng đã được tạo nhưng không thể lấy link thanh toán VNPay.');
            // Keep user on page to choose another method if they want
            setSubmitting(false);
          }
        } catch (payErr) {
          console.error('VNPay error:', payErr);
          alert('Đơn hàng đã được tạo nhưng xảy ra lỗi khi kết nối VNPay.');
          setSubmitting(false);
        }
      } else {
        const message = response?.message ?? 'Đặt hàng thành công! Cảm ơn bạn đã sử dụng dịch vụ.';
        alert(message);
        clearCart();
        navigate('/');
      }
    } catch (error) {
      console.error('Không thể tạo đơn hàng:', error);
      const status = error?.response?.status;
      const message = error?.response?.data?.message ?? error?.message ?? 'Không thể tạo đơn hàng. Vui lòng thử lại.';
      if (status === 401 || status === 403) {
        setSubmitError('Phiên đăng nhập đã hết hạn hoặc thiếu quyền (Authentication is required). Vui lòng đăng nhập lại.');
        setTimeout(() => navigate('/login'), 800);
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Chuẩn bị dữ liệu hiển thị tóm tắt đơn hàng
  const subtotal = Number(getTotalCartAmount() || 0);
  const shippingFee = subtotal === 0 ? 0 : 15000;
  const grandTotal = subtotal + shippingFee;

  // Kết xuất
  return (
    <form onSubmit={placeOrder} className='place-order'>
      {/* Left column */}
      <div className="place-order-left">
        <div className="info-card">
          <div className="card-title">Thông tin khách hàng</div>
          <input
            required
            name='fullName'
            onChange={onFullNameChange}
            value={fullName}
            type="text"
            placeholder='Họ và tên'
          />
          <input
            required
            name='phone'
            onChange={onChangeHandler}
            value={data.phone}
            type="text"
            placeholder='Số điện thoại'
          />
          {submitError && <p className='error-text'>{submitError}</p>}
        </div>

        <div className="address-card">
          <div className="card-title">Địa chỉ giao hàng</div>
          <input
            required
            name='addressDetail'
            onChange={onChangeHandler}
            value={data.addressDetail}
            type="text"
            placeholder='Địa chỉ chi tiết (Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành)'
          />
          <button 
            type="button" 
            className="btn-map-picker"
            onClick={() => setShowMapPicker(!showMapPicker)}
          >
            <span className="map-icon">📍</span>
            {showMapPicker ? 'Ẩn bản đồ' : 'Chọn vị trí trên bản đồ'}
          </button>
          {showMapPicker && (
            <div style={{ marginTop: '12px' }}>
              <AddressMapPicker
                initialAddress={data.addressDetail}
                onLocationSelect={(location) => {
                  setData(prev => ({
                    ...prev,
                    addressDetail: location.address,
                    latitude: location.lat,
                    longitude: location.lng
                  }));
                }}
              />
            </div>
          )}
          <textarea
            name='note'
            onChange={onChangeHandler}
            value={data.note}
            placeholder='Ghi chú cho drone (không bắt buộc)'
            rows={3}
          />
        </div>
      </div>

      {/* Right column */}
      <div className="place-order-right">
        <div className="order-card">
          <div className="card-title">Đơn hàng của bạn</div>

          {/* Danh sách món */}
          <div className='order-items'>
            {Object.entries(cartItems || {}).map(([itemId, qty]) => {
              const item = food_list.find(f => String(f._id) === String(itemId));
              const nQty = Number(qty || 0);
              if (!item || nQty <= 0) return null;
              return (
                <div className='order-item-row' key={`oi-${itemId}`}>
                  <div className='name'>{item.name} <span className='sub'>{`x${nQty}`}</span></div>
                  <div className='price'>{formatVND(item.price)}</div>
                 
                </div>
              );
            })}

            {(cartLines || []).map((line) => {
              const unit = Number(line.basePrice) + Number(line.optionsPrice || 0);
              const nQty = Number(line.quantity || 0);
              if (nQty <= 0) return null;
              return (
                <div className='order-item-row' key={`cl-${line.key}`}>
                  <div className='name'>{line.name} <span className='sub'>{`x${nQty}`}</span></div>
                  <div className='price'>{formatVND(unit * nQty)}</div>
                  
                </div>
              );
            })}
          </div>

          <hr />

          {/* Tạm tính + phí giao hàng */}
          <div className='order-summary-rows'>
            <div className='row'>
              <div className='label'>Tạm tính</div>
              <div className='value'>{formatVND(subtotal)}</div>
            </div>
            <div className='row'>
              <div className='label'>Phí giao hàng</div>
              <div className='value'>{formatVND(shippingFee)}</div>
            </div>
          </div>
        </div>

        <div className="payment-method">
          <div className="card-title">Phương thức thanh toán</div>
          <div className="payment-options">
            <div 
              className={`payment-option ${paymentMethod === 'COD' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('COD')}
            >
              <div className="radio-circle"></div>
              <span>Thanh toán khi nhận hàng (COD)</span>
            </div>
            <div 
              className={`payment-option ${paymentMethod === 'VNPay' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('VNPay')}
            >
              <div className="radio-circle"></div>
              <span>Thanh toán qua VNPay</span>
            </div>
          </div>
        </div>

        {/* Tổng thanh toán + nút xác nhận */}
        <div className='payment-box'>
          <div className='payment-total'>
            <div className='label'>Tổng thanh toán</div>
             <div className='amount'>{formatVND(grandTotal)}</div>
          </div>
          <button type='submit' disabled={submitting} className='confirm-btn'>
            {submitting ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
          </button>
          
        </div>

        {/* Lưu ý */}
        <div className='tips-card'>
          <div className='tips-title'>Lưu ý khi đặt hàng:</div>
          <ul>
            <li>Vui lòng kiểm tra kỹ thông tin trước khi đặt hàng</li>
            <li>Thời gian giao hàng có thể thay đổi tùy điều kiện thực tế</li>
            <li>Liên hệ hotline nếu cần hỗ trợ</li>
          </ul>
        </div>
      </div>
    </form>
  )
}

const ProtectedPlaceOrder = () => {
  return (
    <ProtectedRoute redirectMessage="Vui lòng đăng nhập để đặt hàng.">
      <PlaceOrder />
    </ProtectedRoute>
  );
}

export default ProtectedPlaceOrder
