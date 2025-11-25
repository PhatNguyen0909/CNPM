import React, { useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import ScrollToTop from './components/ScrollToTop'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home/Home'
import Cart from './pages/Cart/Cart'
import ProtectedPlaceOrder from './pages/PlaceOrder/PlaceOrder'
import TrackOrder from './pages/TrackOrder/TrackOrder'
import PaymentResult from './pages/PaymentResult/PaymentResult'
import Footer from './components/Footer/Footer'
import LoginPopup from './components/LoginPopup/LoginPopup'


import FoodDisplay from './components/FoodDisplay/FoodDisplay'

const App = () => {

  const [showLogin,setShowLogin] = useState(false)

  return (
    <>
    {showLogin?<LoginPopup setShowLogin={setShowLogin}/>:<></>}
  <div className ='app'>
   <ScrollToTop />
      <Navbar setShowLogin={setShowLogin} />
      <Routes>
        <Route path = '/' element ={<Home/>}/>
        <Route path = '/cart' element = {<Cart/>} />
        <Route path = '/order' element = {<ProtectedPlaceOrder/>} />
        <Route path = '/track-order' element = {<TrackOrder/>} />
        <Route path = '/payment-result' element={<PaymentResult />} />
        <Route path = '/payment/call-back' element={<PaymentResult />} />
        <Route path = '/potato-api/payment/call-back' element={<PaymentResult />} />
        <Route path='/restaurant/:restaurantId' element={<FoodDisplay />} />
      </Routes>
    </div>
    
    <Footer />
    </>
  )
}

export default App
