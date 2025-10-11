import React, { useContext } from 'react'
import './Cart.css'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'
import { formatVND } from '../../utils/formatCurrency'

const Cart = () => {
  const{cartItems,cartLines,food_list,removeFromCart,removeCartLine,updateCartLineQty,getTotalCartAmount,token,user} = useContext(StoreContext);
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
            <React.Fragment key={item._id}>
              <div className='cart-items-title cart-items-item'>
                <img src={item.image} alt="" />
                <p>{item.name}</p>
                <p>{formatVND(item.price)}</p>
                <p>{cartItems[item._id]}</p>
                <p>{formatVND(item.price * cartItems[item._id])}</p>
                <p onClick={()=>handleRemoveFromCart(item._id)} className='cross'>x</p>
              </div>
              <hr />
            </React.Fragment>
            )
          }
        })}

        {cartLines.map(line => (
          <React.Fragment key={line.key}>
            <div className='cart-items-title cart-items-item'>
              <img src={line.image} alt="" />
              <p>
                {line.name}
                {line.selections && (
                  <span style={{display:'block', color:'#6b7280', fontSize:12}}>
                    {Object.entries(line.selections).map(([g, vals]) => `${g}: ${vals.join(', ')}`).join(' • ')}
                  </span>
                )}
                {line.note && (
                  <span style={{display:'block', color:'#4b5563', fontSize:12, marginTop:4, fontWeight:'bold'}}>
                    Ghi chú: {line.note}
                  </span>
                )}
              </p>
              <p>{formatVND(Number(line.basePrice) + Number(line.optionsPrice||0))}</p>
              <p>
                <span style={{marginRight:8}} onClick={() => updateCartLineQty(line.key, line.quantity - 1)}>-</span>
                {line.quantity}
                <span style={{marginLeft:8}} onClick={() => updateCartLineQty(line.key, line.quantity + 1)}>+</span>
              </p>
              <p>{formatVND((Number(line.basePrice)+Number(line.optionsPrice||0))*Number(line.quantity))}</p>
              <p onClick={()=>removeCartLine(line.key)} className='cross'>x</p>
            </div>
            <hr />
          </React.Fragment>
        ))}
      </div>
      <br />
      <div className='cart-bottom'>
        <div className="cart-total">
          <h2>Tổng thanh toán</h2>
          <div>
            <div className="cart-total-details">
                <p>Tạm tính</p>
                <p>{formatVND(getTotalCartAmount())}</p>
            </div>
            <hr />
            <div className="cart-total-details">
                <p>Phí giao hàng</p>
                <p>{getTotalCartAmount()===0?formatVND(0):formatVND(15000)}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <b>Tổng cộng</b>
              <b>{getTotalCartAmount()===0?formatVND(0):formatVND(getTotalCartAmount()+15000)}</b>
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
