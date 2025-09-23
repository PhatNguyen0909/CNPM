import React, { useContext } from 'react'
import './Cart.css'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'

const Cart = () => {
  const{cartItems,food_list,removeFromCart,getTotalCartAmount,token,user} = useContext(StoreContext);
  const navigate = useNavigate();

  const proceedToCheckout = () => {
    if (!token) {
      alert("Vui lòng đăng nhập để tiến hành thanh toán!");
      return;
    }
    navigate('/order');
  }

  const handleRemoveFromCart = (itemId) => {
    if (!token) {
      alert("Vui lòng đăng nhập để thao tác với giỏ hàng!");
      return;
    }
    removeFromCart(itemId);
  }

  // Nếu chưa đăng nhập, hiển thị thông báo
  if (!token) {
    return (
      <div className='cart'>
        <div className="cart-empty">
          <h2>Bạn cần đăng nhập để xem giỏ hàng</h2>
          <p>Vui lòng đăng nhập để tiếp tục mua sắm.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className='cart'>
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Hình ảnh</p>
          <p>Tên món</p>
          <p>Giá</p>
          <p>Số lượng</p>
          <p>Tổng cộng</p>
          <p>Xóa</p>
        </div>
        <br />
        <hr />
        {food_list.map((item,index)=>{
          if(cartItems[item._id]>0)
          {
            return(
            <><div className='cart-items-title cart-items-item'>
                <img src={item.image} alt="" />
                <p>{item.name}</p>
                <p>{item.price}</p>
                <p>{cartItems[item._id]}</p>
                <p>{item.price * cartItems[item._id]}</p>
                <p onClick={()=>handleRemoveFromCart(item._id)} className='cross'>x</p>
              </div><hr /></>
            )
          }
        })}
      </div>
      <br />
      <div className='cart-bottom'>
        <div className="cart-total">
          <h2>Tổng thanh toán</h2>
          <div>
            <div className="cart-total-details">
                <p>Tạm tính</p>
                <p>{getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
                <p>Phí giao hàng</p>
                <p>{getTotalCartAmount()===0?0:15000}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <b>Tổng cộng</b>
              <b>{getTotalCartAmount()===0?0:getTotalCartAmount()+15000}</b>
            </div>
          </div>
          <button onClick={proceedToCheckout}>THANH TOÁN</button>
        </div>
        <div className='cart-promocode'>
          <p>Nếu bạn có mã giảm giá, nhập tại đây</p>
          <div className="cart-promocode-input">
            <input type="text" placeholder='Mã giảm giá' />
            <button>Áp dụng</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
