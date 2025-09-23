import React, { useContext } from 'react';
import { StoreContext } from '../../context/StoreContext';
import './ProtectedRoute.css';

const ProtectedRoute = ({ children, redirectMessage = "Vui lòng đăng nhập để truy cập trang này." }) => {
  const { token } = useContext(StoreContext);

  if (!token) {
    return (
      <div className='protected-route'>
        <div className="protected-route-container">
          <h2>Yêu cầu đăng nhập</h2>
          <p>{redirectMessage}</p>
          <p>Bạn cần đăng nhập để tiếp tục sử dụng dịch vụ.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;