import React, { useState, useContext } from 'react'
import './LoginPopup.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import api, { attachToken } from '../../services/apiClient'

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
    try {
      if (currState === 'Login') {
        // Gọi API login (giả sử backend đường dẫn /auth/login )
        const res = await api.post('/auth/login', {
          email: data.email,
          password: data.password
        });

        /*
          Dựa vào hình swagger bạn gửi ở signup:
          {
            "statusCode": 1000,
            "data": { "fullName": "Hieu", "email": "...", "token": "JWT..." },
            "message": "..."
          }
          Ta suy đoán login trả về cấu trúc tương tự => dùng data.data.token
        */
        const payload = res.data?.data || {};
        const token = payload.token;
        if (!token) throw new Error('Không tìm thấy token trong phản hồi');
        const userData = {
          name: payload.fullName || data.email.split('@')[0],
          email: payload.email || data.email
        };
        setToken(token, userData);
        attachToken(token);
        setShowLogin(false);
        alert('Đăng nhập thành công!');
      } else {
        // Sign Up -> /auth/signup
        const res = await api.post('/auth/signup', {
          fullName: data.name,
          email: data.email,
          password: data.password
        });
        const payload = res.data?.data || {};
        const token = payload.token; // Backend đang trả token ngay khi signup
        const userData = {
          name: payload.fullName || data.name,
          email: payload.email || data.email
        };
        if (token) {
          setToken(token, userData);
          attachToken(token);
        }
        setShowLogin(false);
        alert('Đăng ký thành công!');
      }
    } catch (err) {
      console.error('Auth error:', err);
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
      alert('Lỗi: ' + msg);
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
        <button type="submit" disabled={!data.email || !data.password || (currState==='Sign Up' && !data.name)}>
          {currState==="Sign Up"?"Tạo tài khoản":"Đăng nhập"}
        </button>
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
