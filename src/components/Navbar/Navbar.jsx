import React, { useContext, useState, useRef } from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'
import SearchBar from '../SearchBar/SearchBar'
import { Link } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';

const Navbar = ({setShowLogin}) => {

  const[menu, setMenu] = useState("home");
  const[showDropdown, setShowDropdown] = useState(false);
  const{getTotalCartAmount, token, user, logout, mockLogin} = useContext(StoreContext);
  const timeoutRef = useRef(null);

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
           <Link to='/cart'> <img src = {assets.basket_icon} alt = " "/></Link>
            <div className={getTotalCartAmount()===0?"":"dot"}>
            </div>
        </div>
        {!token ? (
          <>
            <button onClick={()=>setShowLogin(true)}>Đăng nhập</button>
            <button style={{backgroundColor:'#6b7280'}} onClick={()=>{
              try{ localStorage.setItem('mock_login','1'); }catch(e){}
              mockLogin();
            }}>Đăng nhập tài khoản admin</button>
          </>
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
    </div>
  )
}

export default Navbar
