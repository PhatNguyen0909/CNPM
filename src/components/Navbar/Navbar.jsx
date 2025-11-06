import React, { useContext, useState, useRef } from 'react'
import './Navbar.css'
import '../CartDrawer/CartDrawer.css'
import { assets } from '../../assets/assets'
import SearchBar from '../SearchBar/SearchBar'
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';

const Navbar = ({setShowLogin}) => {

  const[menu, setMenu] = useState("home");
  const[showDropdown, setShowDropdown] = useState(false);
  const{getTotalCartAmount, token, user, logout, cartLines, cartItems, food_list, addToCart, removeFromCart, updateCartLineQty, removeCartLine, setCartItems, restaurant_list, clearCart, validateCartVisibility} = useContext(StoreContext);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [pendingDeleteLines, setPendingDeleteLines] = useState([]);
  const [pendingDeleteItems, setPendingDeleteItems] = useState([]);
  const [closingDrawer, setClosingDrawer] = useState(false);

  const openDrawer = () => {
    if (closingDrawer) return; // prevent interrupting close animation
    setShowCartDrawer(true);
  };
  const closeDrawer = () => {
    // enable closing animation and delay unmount
    setClosingDrawer(true);
    setTimeout(() => {
      setShowCartDrawer(false);
      setClosingDrawer(false);
      // clear pending delete flags when drawer fully closed so quantities
      // return to their original values when reopened
      setPendingDeleteLines([]);
      setPendingDeleteItems([]);
    }, 350);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 200); // Delay 200ms trước khi ẩn dropdown
  };
  return (
    <div className = 'navbar'>
      <Link to = '/'><img src = {assets.logo} alt = " " className="logo"/></Link>
      <ul className="navbar-menu">
        <li className="navbar-search-wrap"><SearchBar /></li>
      </ul>
      <div className="navbar-right">
        <div className="navbar-search-icon">
           <img
             src={assets.bag_icon}
             alt=" "
             role="button"
             onClick={openDrawer}
             style={{width:'30px',cursor:'pointer'}}
           />
          <div className={getTotalCartAmount()===0?"":"dot"} />
        </div>

        {/* Cart Drawer */}
        {showCartDrawer && (
          <div className={`cart-drawer-overlay ${closingDrawer ? 'is-closing' : ''}`} onClick={closeDrawer}>
            <div className={`cart-drawer ${closingDrawer ? 'is-closing' : ''}`} onClick={e => e.stopPropagation()}>
              <div className="cart-drawer-header">
                <div className="cart-header-top">
                  <button className="cart-close" onClick={closeDrawer}><img src={assets.cross_icon} alt="Đóng" /></button>
                </div>
                <div className="cart-header-main">
                  <h2 style={{margin:0}}>{(() => {
                    // derive restaurant name from cartLines or cartItems
                    let restId = null;
                    if (Array.isArray(cartLines) && cartLines.length > 0) {
                      const p = (Array.isArray(food_list) ? food_list.find(f => String(f._id) === String(cartLines[0].itemId)) : null);
                      restId = p ? String(p.restaurantId) : null;
                    }
                    if (!restId && cartItems) {
                      const first = Object.entries(cartItems).find(([id,qty])=>qty>0);
                      if (first) {
                        const prod = (Array.isArray(food_list) ? food_list.find(f => String(f._id) === String(first[0])) : null);
                        restId = prod ? String(prod.restaurantId) : null;
                      }
                    }
                    if (restId && Array.isArray(restaurant_list)) {
                      const rest = restaurant_list.find(r => String(r._id) === String(restId) || String(r.id) === String(restId));
                      return rest ? rest.name : 'Giỏ hàng';
                    }
                    return 'Giỏ hàng';
                  })()}</h2>
                  <button className="clear-cart" onClick={() => {
                    if (getTotalCartAmount() === 0) return;
                    if (window.confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) {
                      clearCart();
                    }
                  }}>Xóa giỏ hàng</button>
                </div>
              </div>
              <div className="cart-drawer-body">
                <div className="cart-items-list">
                  {Array.isArray(cartLines) && cartLines.length > 0 && cartLines.map(line => (
                    <div className={`cart-drawer-item ${pendingDeleteLines.includes(line.key)? 'pending-delete':''}`} key={line.key}>
                      <img className="cart-item-thumb" src={line.image} alt={line.name} />
                      <div className="cart-item-main">
                        <div className="item-name">{line.name}</div>
                        {/* show selected options and note if available */}
                        {line.selections && Object.keys(line.selections).length > 0 && (
                          <div className="item-sub">
                            {Object.entries(line.selections).map(([g,vals])=>`${g}: ${vals.join(', ')}`).join(' • ')}
                          </div>
                        )}
                        {line.note && <div className="item-sub">Ghi chú: {line.note}</div>}
                        <div className="item-meta">{new Intl.NumberFormat('vi-VN').format((Number(line.basePrice) + Number(line.optionsPrice || 0)) * Number(line.quantity || 0))}đ</div>
                      </div>
                      <div className="item-controls">
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={() => {
                            if (Number(line.quantity) > 1) updateCartLineQty(line.key, Number(line.quantity) - 1);
                            else setPendingDeleteLines(prev => prev.includes(line.key) ? prev : [...prev, line.key]);
                          }}><img src={assets.minus} alt="" /></button>
                          <div className="qty-display">{line.quantity}</div>
                          <button className="qty-btn" onClick={() => updateCartLineQty(line.key, Number(line.quantity) + 1)}><img src={assets.plus} alt="" /></button>
                        </div>
                        {pendingDeleteLines.includes(line.key) ? (
                          <button className="trash-btn" onClick={() => { removeCartLine(line.key); setPendingDeleteLines(prev => prev.filter(k => k !== line.key)); }}><img src={assets.trash} alt="Xóa" /></button>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {cartItems && Object.keys(cartItems).length > 0 && Object.entries(cartItems).filter(([id,qty])=>qty>0).map(([id,qty]) => {
                    const product = Array.isArray(food_list) ? food_list.find(f => String(f._id) === String(id)) : null;
                    const name = product?.name || 'Sản phẩm';
                    const image = product?.image || '';
                    const price = product ? (Number(product.price) * qty) : 0;
                    return (
                      <div className={`cart-drawer-item ${pendingDeleteItems.includes(id)? 'pending-delete':''}`} key={id}>
                        <img className="cart-item-thumb" src={image} alt={name} />
                        <div className="cart-item-main">
                          <div className="item-name">{name}</div>
                          <div className="item-meta">{new Intl.NumberFormat('vi-VN').format(price)}đ</div>
                        </div>
                        <div className="item-controls">
                          <div className="qty-controls">
                            <button className="qty-btn" onClick={() => {
                              if (qty > 1) removeFromCart(id);
                              else setPendingDeleteItems(prev => prev.includes(id) ? prev : [...prev, id]);
                            }}>
                              <img src={assets.minus} alt="-" />
                            </button>
                            <div className="qty-display">{qty}</div>
                            <button className="qty-btn" onClick={() => addToCart(id)}>
                              <img src={assets.plus} alt="+" />
                            </button>
                          </div>
                          {pendingDeleteItems.includes(id) ? (
                            <button className="trash-btn" onClick={() => {
                              setCartItems(prev => {
                                const copy = { ...prev };
                                delete copy[id];
                                return copy;
                              });
                              setPendingDeleteItems(prev => prev.filter(k => k !== id));
                            }}>🗑</button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}

                  {((!Array.isArray(cartLines) || cartLines.length === 0) && (!cartItems || Object.values(cartItems).filter(v=>v>0).length===0)) && (
                    <p style={{color:'#6b7280'}}>Giỏ hàng trống</p>
                  )}
                </div>
                <p style={{color:'#6b7280', marginTop:12}}>Tổng: <b style={{color:'#f77c6eff'}}>{getTotalCartAmount()===0? '0đ' : new Intl.NumberFormat('vi-VN').format(getTotalCartAmount()) + 'đ'}</b></p>
              </div>
              <div className="cart-drawer-footer">
                <button
                  className="cart-drawer-checkout"
                  onClick={async () => {
                    if (getTotalCartAmount() === 0){
                      closeDrawer();
                      navigate('/cart');
                      return;
                    }
                    try{
                      const result = await (validateCartVisibility?.());
                      if (result && !result.ok){
                        const msg = 'Một số món hiện không còn khả dụng/đang ẩn:\n- ' + result.invalid.join('\n- ') + '\n\nBạn có muốn xóa các món này khỏi giỏ hàng không?';
                        const confirmRemove = window.confirm(msg);
                        if (confirmRemove) {
                          (result.invalidEntries || []).forEach(entry => {
                            if (entry.type === 'item' && entry.itemId) {
                              setCartItems(prev => ({ ...prev, [entry.itemId]: 0 }));
                            } else if (entry.type === 'line' && entry.key) {
                              removeCartLine(entry.key);
                            }
                          });
                          alert('Đã xóa các món không còn khả dụng khỏi giỏ hàng.');
                        }
                        return;
                      }
                    }catch{}
                    closeDrawer();
                    navigate('/cart');
                  }}
                >
                  Thanh toán • {getTotalCartAmount()===0? '0đ' : new Intl.NumberFormat('vi-VN').format(getTotalCartAmount()) + 'đ'}
                </button>
              </div>
            </div>
          </div>
        )}
        {!token ? (
          <button className="navbar-login-btn" onClick={()=>setShowLogin(true)}>Đăng nhập</button>
        ) : (
          <div 
            className='navbar-profile'
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <img src={assets.profile_icon} alt="" />
            {showDropdown && (
              <ul 
                className='nav-profile-dropdown'
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <li onClick={() => { logout(); navigate('/'); }}>
                  <img src={assets.logout_icon} alt="" />
                  <p style={{margin:0}}>Đăng xuất</p>
                </li>
                <li onClick={() => navigate('/track-order')}>
                    <img src={assets.track_order} alt="" />
                    <p style={{margin:0}}>Theo dõi đơn hàng</p>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Navbar
