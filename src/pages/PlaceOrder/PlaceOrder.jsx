import React, { useContext, useState, useEffect, useMemo } from 'react'
import './PlaceOrder.css'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute'
import orderAPI from '../../services/orderAPI'
import { attachToken } from '../../services/apiClient'

const PlaceOrder = () => {

  const { getTotalCartAmount, token, food_list, cartItems, cartLines, user, clearCart } = useContext(StoreContext)
  const navigate = useNavigate()

  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    phone: "",
    note: ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!token) {
      navigate('/cart')
      alert("Vui lòng đăng nhập để đặt hàng!");
    } else if (getTotalCartAmount() === 0) {
      navigate('/cart')
      alert("Giỏ hàng của bạn đang trống!");
    }
    
    // Tự động điền email từ thông tin user
    if (user && user.email) {
      setData(prevData => ({
        ...prevData,
        email: user.email,
        firstName: user.name ? user.name.split(' ')[0] : '',
        lastName: user.name ? user.name.split(' ').slice(1).join(' ') : ''
      }));
    }
  }, [token, user])

  const fullName = useMemo(() => {
    return [data.firstName, data.lastName].map(part => part.trim()).filter(Boolean).join(' ');
  }, [data.firstName, data.lastName])

  const deliveryAddress = useMemo(() => {
    return [data.street, data.state, data.city, data.country, data.zipcode]
      .map(part => part.trim())
      .filter(Boolean)
      .join(', ');
  }, [data.street, data.state, data.city, data.country, data.zipcode])

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData(data => ({ ...data, [name]: value }))
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
    };

    try {
      setSubmitting(true);
      // Ensure Authorization header is present on this critical call
      if (token) attachToken(token);
      const response = await orderAPI.createOrder(payload);
      const message = response?.message ?? 'Đặt hàng thành công! Cảm ơn bạn đã sử dụng dịch vụ.';
      alert(message);
      clearCart();
      navigate('/');
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

  return (
    <form onSubmit={placeOrder} className='place-order'>
      <div className="place-order-left">
        <p className="title">Thông tin giao hàng</p>
        <div className="multi-fields">
          <input 
            required 
            name='firstName' 
            onChange={onChangeHandler} 
            value={data.firstName} 
            type="text" 
            placeholder='Họ' 
          />
          <input 
            required 
            name='lastName' 
            onChange={onChangeHandler} 
            value={data.lastName} 
            type="text" 
            placeholder='Tên' 
          />
        </div>
        <input 
          required 
          name='email' 
          onChange={onChangeHandler} 
          value={data.email} 
          type="email" 
          placeholder='Email' 
        />
        <input 
          required 
          name='street' 
          onChange={onChangeHandler} 
          value={data.street} 
          type="text" 
          placeholder='Địa chỉ' 
        />
        <div className="multi-fields">
          <input 
            required 
            name='city' 
            onChange={onChangeHandler} 
            value={data.city} 
            type="text" 
            placeholder='Thành phố' 
          />
          <input 
            required 
            name='state' 
            onChange={onChangeHandler} 
            value={data.state} 
            type="text" 
            placeholder='Quận/Huyện' 
          />
        </div>
        <div className="multi-fields">
          <input 
            required 
            name='zipcode' 
            onChange={onChangeHandler} 
            value={data.zipcode} 
            type="text" 
            placeholder='Mã bưu điện' 
          />
          <input 
            required 
            name='country' 
            onChange={onChangeHandler} 
            value={data.country} 
            type="text" 
            placeholder='Quốc gia' 
          />
        </div>
        <input 
          required 
          name='phone' 
          onChange={onChangeHandler} 
          value={data.phone} 
          type="text" 
          placeholder='Số điện thoại' 
        />
        <textarea
          name='note'
          onChange={onChangeHandler}
          value={data.note}
          placeholder='Ghi chú đơn hàng (không bắt buộc)'
          rows={3}
        />
        {submitError && <p className='error-text'>{submitError}</p>}
      </div>
      <div className="place-order-right">
        <div className="cart-total">
          <h2>Tổng đơn hàng</h2>
          <div className="cart-total-details">
            <p>Tạm tính: <span>{getTotalCartAmount()}</span></p>
            <hr />
            <p>Phí giao hàng: <span>{getTotalCartAmount() === 0 ? 0 : 15000}</span></p>
            <hr />
            <b>Tổng cộng: <span>{getTotalCartAmount() === 0 ? 0 : getTotalCartAmount() + 15000}</span></b>
          </div>
          <button type='submit' disabled={submitting}>
            {submitting ? 'Đang xử lý...' : 'THANH TOÁN'}
          </button>
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
