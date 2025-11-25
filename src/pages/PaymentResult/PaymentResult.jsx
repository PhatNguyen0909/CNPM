import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentResult.css';
import { formatVNDIntl } from '../../utils/formatCurrency';

const parsePayDate = (payDate) => {
  if (!payDate || payDate.length !== 14) return null;
  const year = payDate.slice(0, 4);
  const month = payDate.slice(4, 6);
  const day = payDate.slice(6, 8);
  const hour = payDate.slice(8, 10);
  const minute = payDate.slice(10, 12);
  const second = payDate.slice(12, 14);
  return `${hour}:${minute}:${second} ${day}/${month}/${year}`;
};

const normalizeAmount = (amountParam) => {
  if (!amountParam) return null;
  const raw = Number(amountParam);
  if (!Number.isFinite(raw)) return null;
  // VNPay typically returns amount * 100
  return raw >= 1000 ? raw / 100 : raw;
};

const extractOrderCode = (orderInfo, txnRef) => {
  if (txnRef) return txnRef;
  if (!orderInfo) return null;
  const digits = orderInfo.match(/(\d{4,})/);
  return digits ? digits[1] : null;
};

const PaymentResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const responseCode = searchParams.get('vnp_ResponseCode');
  const transactionStatus = searchParams.get('vnp_TransactionStatus');
  const txnRef = searchParams.get('vnp_TxnRef');
  const orderInfo = searchParams.get('vnp_OrderInfo');
  const amountParam = searchParams.get('vnp_Amount');
  const bankCode = searchParams.get('vnp_BankCode');
  const payDate = searchParams.get('vnp_PayDate');
  const status = searchParams.get('Status');

  const isSuccess = status === '00';
  const paidAmount = useMemo(() => normalizeAmount(amountParam), [amountParam]);
  const formattedAmount = paidAmount != null ? formatVNDIntl(paidAmount) : null;
  const formattedPayDate = useMemo(() => parsePayDate(payDate), [payDate]);
  const orderCode = extractOrderCode(orderInfo, txnRef);

  const statusLabel = isSuccess ? 'Thanh toán VNPay thành công!' : 'Thanh toán VNPay thất bại';
  const statusDescription = isSuccess
    ? 'Chúng tôi đã ghi nhận thanh toán của bạn. Drone sẽ sớm được điều phối để giao hàng.'
    : 'Thanh toán chưa thành công. Bạn có thể thử lại VNPay hoặc chọn phương thức khác.';

  const handleTrackOrder = () => {
    if (orderCode) {
      navigate(`/track-order?code=${orderCode}`);
    } else {
      navigate('/track-order');
    }
  };

  return (
    <div className="payment-result-page">
      <div className={`payment-result-card ${isSuccess ? 'success' : 'failed'}`}>
        <div className="status-icon" aria-hidden>
          {isSuccess ? '✅' : '⚠️'}
        </div>
        <h1>{statusLabel}</h1>
        <p className="status-description">{statusDescription}</p>

        <div className="result-details">
          {orderCode && (
            <div>
              <span>Mã đơn hàng</span>
              <strong>#{orderCode}</strong>
            </div>
          )}
          {formattedAmount && (
            <div>
              <span>Số tiền</span>
              <strong>{formattedAmount}</strong>
            </div>
          )}
          {bankCode && (
            <div>
              <span>Ngân hàng</span>
              <strong>{bankCode}</strong>
            </div>
          )}
          {formattedPayDate && (
            <div>
              <span>Thời gian thanh toán</span>
              <strong>{formattedPayDate}</strong>
            </div>
          )}
          {responseCode && (
            <div>
              <span>Mã phản hồi</span>
              <strong>{responseCode}</strong>
            </div>
          )}
          {transactionStatus && (
            <div>
              <span>Trạng thái giao dịch</span>
              <strong>{transactionStatus}</strong>
            </div>
          )}
        </div>

        <div className="result-actions">
          <button type="button" className="primary" onClick={handleTrackOrder}>
            {isSuccess ? 'Theo dõi đơn hàng' : 'Xem trạng thái đơn'}
          </button>
          <button type="button" className="ghost" onClick={() => navigate('/')}>Về trang chủ</button>
          {!isSuccess && (
            <button type="button" className="ghost" onClick={() => navigate('/order')}>
              Chọn lại phương thức thanh toán
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
