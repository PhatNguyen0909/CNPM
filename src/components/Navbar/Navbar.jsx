import React, { useContext, useState, useRef } from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'
import SearchBar from '../SearchBar/SearchBar'
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import CartReview from '../CartReview/CartReview';

const Navbar = ({setShowLogin}) => {

  const[menu, setMenu] = useState("home");
  const[showDropdown, setShowDropdown] = useState(false);
  const [showCartReview, setShowCartReview] = useState(false);
  const{
    getTotalCartAmount,
    cartItems,
    cartLines,
    food_list,
    addToCart,
    removeFromCart,
    updateCartLineQty,
    removeCartLine,
    clearCart,
    token,
    user,
    logout
  } = useContext(StoreContext);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  const handleCartIconClick = () => {
    setShowCartReview(true);
  };

  const handleCheckout = () => {
    setShowCartReview(false);
    navigate('/cart');
  };

  const handleCloseCartReview = () => {
    setShowCartReview(false);
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
        <img src ={assets.search_icon} alt= " "/>
        <div className="navbar-search-icon">
           <button type="button" className="navbar-cart-btn" onClick={handleCartIconClick}>
            <img src = {assets.basket_icon} alt = "Giỏ hàng"/>
           </button>
            <div className={getTotalCartAmount()===0?"":"dot"}>
            </div>
        </div>
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
                <li onClick={logout}>
                  <img src={assets.logout_icon} alt="" />
                  <p>Đăng xuất</p>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
      <CartReview
        open={showCartReview}
        onClose={handleCloseCartReview}
        cartItems={cartItems}
        cartLines={cartLines}
        foodList={food_list}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        updateCartLineQty={updateCartLineQty}
        removeCartLine={removeCartLine}
        clearCart={clearCart}
        onCheckout={handleCheckout}
        totalAmount={getTotalCartAmount()}
        token={token}
      />
    </div>
  )
}

export default Navbar
