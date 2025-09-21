import React from 'react'
import Navbar from './components/Navbar/Navbar'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home/Home'
import Cart from './pages/Cart/Cart'
import PlaceOrder from './pages/PlaceOrder/PlaceOrder'
import Footer from './components/Footer/Footer'

// Đổi tên Restaurant thành RestaurantCard nếu file này chỉ là 1 card, 
// hoặc import đúng trang Menu (FoodDisplay)
import FoodDisplay from './components/FoodDisplay/FoodDisplay'

const App = () => {
  return (
    <>
      <div className='app'>
        <Navbar />
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/order' element={<PlaceOrder />} />

          {/* Route mới cho menu của từng nhà hàng */}
          <Route path='/restaurant/:restaurantId' element={<FoodDisplay />} />
        </Routes>
      </div>
      <Footer />
    </>
  )
}

export default App
