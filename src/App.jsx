import React, { useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home/Home'
import Cart from './pages/Cart/Cart'
import ProtectedPlaceOrder from './pages/PlaceOrder/PlaceOrder'
import Footer from './components/Footer/Footer'
import LoginPopup from './components/LoginPopup/LoginPopup'


import FoodDisplay from './components/FoodDisplay/FoodDisplay'

const App = () => {

  const [showLogin,setShowLogin] = useState(false)

  return (
    <>
    {showLogin?<LoginPopup setShowLogin={setShowLogin}/>:<></>}
     <div className ='app'>
      <Navbar setShowLogin={setShowLogin} />
      <Routes>
        <Route path = '/' element ={<Home/>}/>
        <Route path = '/cart' element = {<Cart/>} />
        <Route path = '/order' element = {<ProtectedPlaceOrder/>} />
        <Route path='/restaurant/:restaurantId' element={<FoodDisplay />} />
      </Routes>
    </div>
    
    <Footer />
    </>
  )
}

export default App
