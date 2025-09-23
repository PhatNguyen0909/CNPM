import React, { useState, useContext } from 'react'
import './LoginPopup.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'

const LoginPopup = ({setShowLogin}) => {

  const [currState, setCurrState] = useState("Login")
  const { setToken } = useContext(StoreContext)
  const [data, setData] = useState({
    name: "",
    email: "",
    password: ""
  })

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData(data => ({ ...data, [name]: value }))
  }

  const onLogin = async (event) => {
    event.preventDefault();
    
    // Giả lập login thành công (trong thực tế sẽ gọi API)
    if (currState === "Login") {
      // Kiểm tra email và password (demo)
      if (data.email && data.password) {
        const mockToken = "demo_token_" + Date.now();
        setToken(mockToken); // Sẽ tự động lưu vào cookie
        setShowLogin(false);
        alert("Đăng nhập thành công! Token đã được lưu vào cookie.");
      } else {
        alert("Vui lòng nhập đầy đủ email và mật khẩu!");
      }
    } else {
      // Sign Up
      if (data.name && data.email && data.password) {
        const mockToken = "demo_token_" + Date.now();
        setToken(mockToken); // Sẽ tự động lưu vào cookie
        setShowLogin(false);
        alert("Đăng ký thành công! Token đã được lưu vào cookie.");
      } else {
        alert("Vui lòng điền đầy đủ thông tin!");
      }
    }
  }

  return (
    <div className ='login-popup'>
      <form onSubmit={onLogin} className="login-popup-container">
        <div className="login-popup-title">
          <h2>{currState}</h2>
          <img onClick={()=>setShowLogin(false)} src={assets.cross_icon} alt="" />
        </div>
        <div className="login-popup-inputs">
          {currState==="Login"?<></>:<input name='name' onChange={onChangeHandler} value={data.name} type="text" placeholder='Tên của bạn' required />}
          <input name='email' onChange={onChangeHandler} value={data.email} type="email" placeholder='Email của bạn' required />
          <input name='password' onChange={onChangeHandler} value={data.password} type="password" placeholder='Mật khẩu' required />
        </div>
        <button type="submit">{currState==="Sign Up"?"Tạo tài khoản":"Đăng nhập"}</button>
        <div className="login-popup-condition">
          <input type="checkbox" required />
          <p>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật</p>
        </div>
        {currState==="Login"
        ?<p>Tạo tài khoản mới? <span onClick={()=>setCurrState("Sign Up")}>Đăng ký tại đây</span></p>
        :<p>Đã có tài khoản? <span onClick={()=>setCurrState("Login")}>Đăng nhập tại đây</span></p>
        }
      </form>
    </div>
  )
}

export default LoginPopup
