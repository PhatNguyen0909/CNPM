import React from 'react'
import './Header.css'

const Header = () => {
  return (
    <div className = 'header'>
        <div className="header-contents">
            <h2>Món ngon đang chờ bạn</h2>
            <p>Mọi hương vị bạn muốn, đều có tại đây. Chúng tôi cam kết mang đến trải nghiệm ẩm thực tuyệt vời cho mọi bữa ăn của bạn. </p>
            <a href="#food-display"><button>XEM DANH SÁCH QUÁN ĂN</button></a>
        </div>
    </div>
  )
}

export default Header
