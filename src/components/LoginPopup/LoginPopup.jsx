import React, { useState, useContext } from 'react'
import './LoginPopup.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import userAPI from '../../services/userAPI'

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
      let payload;
      if (currState === 'Login') {
        // Gọi API login (giả sử backend đường dẫn /auth/login )
        payload = await userAPI.login({
          email:data.email,
          password:data.password,
        });
        }
        else{
          payload = await userAPI.register({
          fullName: data.name,
          email: data.email,
          password: data.password,
        });
        }
        if(!payload?.token) throw new Error("Không tìm thấy token");
        setToken(payload.token,{
          name: payload.fullName || data.name || data.email.split("@")[0],
          email: payload.email || data.email,
        });
        setShowLogin(false);
        alert(`${currState === "Login" ? "Đăng nhập" : "Đăng ký"} thành công!`);
  }catch(err){
    console.error("Auth error:", err);
      const msg = err.response?.data?.message || err.message || "Có lỗi xảy ra";
      alert("Lỗi: " + msg);
  }
};

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
