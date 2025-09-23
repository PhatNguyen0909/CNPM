import React, { useContext, useState, useEffect } from 'react'
import './PlaceOrder.css'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute'

const PlaceOrder = () => {

  const { getTotalCartAmount, token, food_list, cartItems, user } = useContext(StoreContext)
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
    phone: ""
  })

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

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData(data => ({ ...data, [name]: value }))
  }

  const placeOrder = async (event) => {
    event.preventDefault();
    let orderItems = [];
    food_list.map((item) => {
      if (cartItems[item._id] > 0) {
        let itemInfo = item;
        itemInfo["quantity"] = cartItems[item._id];
        orderItems.push(itemInfo);
      }
    })
    console.log("Order Items:", orderItems);
    console.log("Delivery Info:", data);
    alert("Đặt hàng thành công! Cảm ơn bạn đã sử dụng dịch vụ.");
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
          <button type='submit'>THANH TOÁN</button>
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
