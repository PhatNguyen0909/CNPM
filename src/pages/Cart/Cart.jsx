import React, { useContext, useMemo, useState } from 'react'
import './Cart.css'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'
import { formatVND } from '../../utils/formatCurrency'
import { assets } from '../../assets/assets'
import ValidationPopup from '../../components/ValidationPopup/ValidationPopup'

const Cart = () => {
  const{setCartItems,cartItems,cartLines,food_list,restaurant_list:addRestaurants,addToCart,removeFromCart,removeCartLine,updateCartLineQty,getTotalCartAmount,token,user, validateCartVisibility} = useContext(StoreContext);
  const navigate = useNavigate();

  // Tự động quay về trang chủ nếu giỏ hàng trống
  const isEmptyCart = useMemo(() => {
    const hasSimpleItems = Array.isArray(food_list) && food_list.some(it => (cartItems?.[it._id] || 0) > 0);
    const hasLines = Array.isArray(cartLines) && cartLines.length > 0;
    return !(hasSimpleItems || hasLines);
  }, [food_list, cartItems, cartLines]);

  // No auto-redirect; show a friendly empty state instead

  const [orderNote, setOrderNote] = useState('');

  const [checking, setChecking] = useState(false);
  const [validationResult, setValidationResult] = useState(null); // { invalidEntries, invalid }
  const [removingInvalid, setRemovingInvalid] = useState(false);

  const proceedToCheckout = async () => {
    if (!token) {
      alert("Vui lòng đăng nhập để tiến hành thanh toán!");
      return;
    }
    // Validate visibility/active of all items before checkout
    try{
      setChecking(true);
      const result = await validateCartVisibility();
      if (!result.ok){
        setValidationResult(result);
        return; // stop flow until user handles popup
      }
    }catch{/* ignore, continue */}
    finally { setChecking(false); }
    // Lưu ghi chú đơn hàng để trang đặt hàng có thể đọc lại (nếu cần)
    try { localStorage.setItem('orderNote', orderNote || ''); } catch {}
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

  // Khi đã đăng nhập nhưng giỏ hàng trống: hiển thị giao diện trống
  if (isEmptyCart && token) {
    return (
      <div className='cart'>
        <div className="cart-empty-state">
          <img src={assets.shopping} alt="Giỏ hàng trống" className="empty-icon" />
          <h2>Giỏ hàng trống</h2>
          <p>Hãy thêm món ăn yêu thích vào giỏ hàng nhé!</p>
          <button
            className="empty-cta"
            onClick={() => {
              try{
                const lastId = localStorage.getItem('lastRestaurantId');
                if (lastId) {
                  navigate(`/restaurant/${lastId}`);
                  return;
                }
              }catch{}
              navigate('/');
            }}
          >Khám phá món ăn</button>
        </div>
      </div>
    );
  }
    // Tính số món (loại) và tổng phần
    const { dishTypes, portions } = useMemo(() => {
      let types = 0;
      let qtySum = 0;
      // legacy items
      food_list.forEach(it => {
        const q = Number(cartItems?.[it._id] || 0);
        if (q > 0) { types += 1; qtySum += q; }
      });
      // configurable lines
      (cartLines || []).forEach(line => {
        types += 1;
        qtySum += Number(line.quantity || 0);
      });
      return { dishTypes: types, portions: qtySum };
    }, [food_list, cartItems, cartLines]);

    // Xác định nhà hàng hiện tại trong giỏ
    const currentRestaurant = useMemo(() => {
      const restIds = new Set();
      // from legacy items
      for (const id in cartItems) {
        if (cartItems[id] > 0) {
          const item = food_list.find(f => String(f._id) === String(id));
          if (item?.restaurantId) restIds.add(String(item.restaurantId));
        }
      }
      // from lines
      (cartLines || []).forEach(line => {
        const item = food_list.find(f => String(f._id) === String(line.itemId));
        if (item?.restaurantId) restIds.add(String(item.restaurantId));
      });
      const restId = restIds.values().next().value;
      const list = Array.isArray(addRestaurants) ? addRestaurants : [];
      return list.find(r => String(r._id) === String(restId));
    }, [cartItems, cartLines, food_list, addRestaurants]);

    // Xác định trạng thái mở cửa của nhà hàng hiện tại trong giỏ
    // Ưu tiên boolean nếu đã được chuẩn hóa từ StoreContext; nếu là string, so sánh 'true' không phân biệt hoa thường
    const isOpen = (typeof currentRestaurant?.open === 'boolean')
      ? currentRestaurant.open
      : String(currentRestaurant?.open ?? '').toLowerCase() === 'true';

  return (
    <>
    <div className='cart-page'>
      <div className='cart-container'>
          {/* Header + summary + restaurant banner */}
          <div className='cart-header'>
            <div className='cart-title-wrap'>
              <p className='cart-title'>Giỏ hàng</p>
              <p className='cart-summary-text'>{dishTypes} món • {portions} phần</p>
            </div>
            <div className='cartClose'><button className='cart-close-btn' onClick={() => navigate(-1)}>Đóng</button></div>
          </div>
          {currentRestaurant && (
            <div className='cart-restaurant'>
              <div className='cart-restaurant-name'>{currentRestaurant.name}</div>
              <span className={`open-badge ${isOpen ? 'open' : 'closed'}`}>
                {isOpen ? 'Đang mở cửa' : 'Đang đóng cửa'}
              </span>
            </div>
          )}
          {/* Items panel */}
          <div className='cart-panel cart-panel-items'>
            <div className="cart-card-header">Món đã chọn</div>

            {/* Legacy simple items */}
            {food_list && food_list.map(item => {
              const qty = Number(cartItems?.[item._id] || 0);
              if (qty <= 0) return null;
              const lineTotal = Number(item.price) * qty;
              return (
                <div key={`simple-${item._id}`} className="cart-line">
                  <div className="line-left">
                    <img className="line-image" src={item.image} alt={item.name} />
                    <div className="line-info">
                      <div className="line-name">{item.name}</div>
                      <div className="line-unit-price">{formatVND(item.price)}</div>
                      <div className="line-qty">
                        <button className="qty-btn" onClick={() => handleRemoveFromCart(item._id)}>-</button>
                        <span className="qty-num">{qty}</span>
                        <button className="qty-btn" onClick={() => addToCart(item._id)}>+</button>
                      </div>
                    </div>
                  </div>
                  <div className="line-right">
                    <div className="line-total">{formatVND(lineTotal)}</div>
                    <button
                      className="line-remove"
                      title="Xóa món"
                      onClick={() => setCartItems(prev => ({ ...prev, [item._id]: 0 }))}
                    >
                      <img src={assets.trash} alt="remove" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Configurable cart lines */}
            {cartLines && cartLines.map(line => {
              const unit = Number(line.basePrice) + Number(line.optionsPrice || 0);
              const total = unit * Number(line.quantity || 0);
              return (
                <div key={line.key} className="cart-line">
                  <div className="line-left">
                    <img className="line-image" src={line.image} alt={line.name} />
                    <div className="line-info">
                      <div className="line-name">{line.name}</div>
                      <div className="line-unit-price">{formatVND(unit)}</div>
                      {line.selections && (
                        <div className="line-sub">
                          {Object.entries(line.selections).map(([g, vals]) => `${g}: ${vals.join(', ')}`).join(' • ')}
                        </div>
                      )}
                      {line.note && (
                        <div className="line-sub note">Ghi chú: {line.note}</div>
                      )}
                      <div className="line-qty">
                        <button className="qty-btn" onClick={() => updateCartLineQty(line.key, line.quantity - 1)}>-</button>
                        <span className="qty-num">{line.quantity}</span>
                        <button className="qty-btn" onClick={() => updateCartLineQty(line.key, line.quantity + 1)}>+</button>
                      </div>
                    </div>
                  </div>
                  <div className="line-right">
                    <div className="line-total">{formatVND(total)}</div>
                    <button className="line-remove" title="Xóa món" onClick={() => removeCartLine(line.key)}>
                      <img src={assets.trash} alt="remove" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals panel */}
          <div className='cart-panel cart-panel-totals'>
  <div className='cart-bottom'>
    <div className="cart-total">
      <div style={{display: 'flex', alignItems: 'center', fontSize: '20px', fontWeight: '600' }}><img style={{marginRight:'10px'}} src={assets.gross} alt="gross" />Tổng thanh toán</div>
      
      <div className="cart-total-content">
        
        <div className="cart-total-row">
          <div className="label">Tạm tính</div>
          <div className="value">{formatVND(getTotalCartAmount())}</div>
        </div>
        
        <div className="cart-total-row">
          <div className="label">Phí giao hàng</div>
          <div className="value">
            {getTotalCartAmount() === 0 ? formatVND(0) : formatVND(15000)}
          </div>
        </div>
            <hr />
        <div className="cart-total-row total-final">
          <div className="label">Tổng cộng</div>
          <div className="value">
            {getTotalCartAmount() === 0
              ? formatVND(0)
              : formatVND(getTotalCartAmount() + 15000)}
          </div>
        </div>
               <button onClick={proceedToCheckout} disabled={!isOpen || checking} title={!isOpen ? 'Nhà hàng đang đóng cửa' : undefined}>
                 {checking ? 'Đang kiểm tra…' : 'TIẾN HÀNH THANH TOÁN'}
               </button>
               {!isOpen && (
                 <p style={{ marginTop: 8, color: '#d14343', fontSize: 13 }}>
                   Nhà hàng đang đóng cửa, bạn có muốn đổi nhà hàng khác không ?
                 </p>
               )}
      </div>


     
    </div>
  </div>
</div>

      </div>
    </div>
    {validationResult && (
      <ValidationPopup
        invalidEntries={validationResult.invalidEntries || []}
        checking={removingInvalid}
        onRemove={() => {
          if (removingInvalid) return;
          setRemovingInvalid(true);
          try {
            (validationResult.invalidEntries || []).forEach(entry => {
              if (entry.type === 'item' && entry.itemId) {
                setCartItems(prev => ({ ...prev, [entry.itemId]: 0 }));
              } else if (entry.type === 'line' && entry.key) {
                removeCartLine(entry.key);
              }
            });
          } finally {
            setRemovingInvalid(false);
            setValidationResult(null);
          }
        }}
        onClose={() => setValidationResult(null)}
      />
    )}
  </>
  )
}

export default Cart
