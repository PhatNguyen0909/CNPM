import React from 'react'
import './Footer.css'
import { assets } from '../../assets/assets'

const Footer = () => {
  return (
    <div className='footer' id='footer'>
      <div className="footer-content">
        <div className="footer-content-left">
            {/* <img className='img-logo' src={assets.logo}/> */}
            <p>Lorem ipsum dolor, sit amet consectetur adipisicing elit. Unde autem sapiente tempore dicta libero animi expedita ipsa odit magnam. Quam minima repellendus eaque voluptatum illo consectetur, sit natus atque veniam?</p>
            <div className="footer-social-icons">
                <img src={assets.facebook_icon} alt="" />
                <img src={assets.twitter_icon} alt="" />
                <img src={assets.linkedin_icon} alt="" />
            </div>
        </div>
        <div className="footer-content-center">
            <h2>COMPANY</h2>
            <ul>
                <li>Home</li>
                <li>About Us</li>
                <li>Delivery</li>
                <li>Privacy policy</li>
            </ul>
        </div>
        <div className="footer-content-right">
            <h2>GET IN TOUCH</h2>
            <ul>
                <li>+84909997576</li>
                <li>contact@potato.com</li>
            </ul>
        </div>
      </div>
      <hr />
      <p className="footer-copyright">Copyright 2024 potato.com - All Right Reserved.</p>
    </div>
  )
}

export default Footer
