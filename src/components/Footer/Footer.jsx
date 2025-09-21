import React from 'react'
import './Footer.css'
import { assets } from '../../assets/assets'

const Footer = () => {
  return (
    <div className='footer' id='footer'>
      <div className="footer-content">
        <div className="footer-content-left">
            <img className='img-logo' src={assets.logo}/>
            <p>Potato là nền tảng giao hàng tận nơi hàng đầu Việt Nam, kết nối bạn với hàng nghìn nhà hàng và quán ăn ngon nhất trong thành phố. Chúng tôi cam kết mang đến trải nghiệm ẩm thực tuyệt vời và dịch vụ giao hàng nhanh chóng, tiện lợi.</p>
            <div className="footer-social-icons">
                <img src={assets.facebook_icon} alt="" />
                <img src={assets.twitter_icon} alt="" />
                <img src={assets.linkedin_icon} alt="" />
            </div>
        </div>
        <div className="footer-content-center">
            <h2>CÔNG TY</h2>
            <ul>
                <li>Trang chủ</li>
                <li>Giới thiệu</li>
                <li>Giao hàng</li>
                <li>Chính sách bảo mật</li>
            </ul>
        </div>
        <div className="footer-content-right">
            <h2>LIÊN HỆ</h2>
            <ul>
                <li>+84909997576</li>
                <li>contact@potato.com</li>
            </ul>
        </div>
      </div>
      <hr />
      <p className="footer-copyright">Bản quyền © 2025 potato.com - Mọi quyền được bảo lưu.</p>
    </div>
  )
}

export default Footer
