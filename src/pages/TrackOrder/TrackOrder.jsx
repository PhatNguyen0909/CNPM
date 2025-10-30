import React, { useEffect, useState } from 'react'
import './TrackOrder.css'
import { useSearchParams } from 'react-router-dom'
import orderAPI from '../../services/orderAPI'

const STATUS_STEPS = ['PENDING', 'PREPARING', 'READY', 'DELIVERING']

const formatCurrency = (v = 0) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

const TrackOrder = () => {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const loadList = async () => {
      setLoading(true)
      setError(null)
      try {
        // fetch orders list (prefer active)
        let list = await orderAPI.getActiveOrders()
        if (!Array.isArray(list) || list.length === 0) list = await orderAPI.getOrders() || []
        if (mounted) setOrder(list)
      } catch (err) {
        if (mounted) setError('Không thể tải danh sách đơn hàng')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadList()
    return () => { mounted = false }
  }, [code])

  if (loading) return <div className="track-page"><p>Đang tải...</p></div>
  if (error) return <div className="track-page"><p className="error">{error}</p></div>
  if (!order || order.length === 0) return <div className="track-page"><p>Không có đơn hàng.</p></div>

  // 'order' now is a list; we provide accordion to expand details per order
  return (
    <div className="track-page">
      <div className="track-header">
        <h1>Đơn hàng của bạn</h1>
      </div>

      <div className="orders-list">
        {order.map(o => (
          <OrderAccordion key={o.id || o._id || o.code} orderSummary={o} />
        ))}
      </div>
    </div>
  )
}

function OrderAccordion({ orderSummary }){
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const toggle = async () => {
    setOpen(prev => !prev)
    if (!open && !detail){
      setLoading(true); setErr(null)
      try{
        const data = await orderAPI.getOrderById(orderSummary.id || orderSummary._id || orderSummary.orderId)
        setDetail(data)
      }catch(e){ setErr('Không tải được chi tiết') }
      setLoading(false)
    }
  }

  return (
    <div className={`order-accordion ${open? 'open':''}`}>
      <div className="acc-header" onClick={toggle}>
        <div className="acc-left">
          <div className="acc-code">#{orderSummary.code}</div>
          <div className="acc-meta">{orderSummary.fullName} • {orderSummary.deliveryAddress}</div>
        </div>
        <div className="acc-right">
          <div className="acc-status">{orderSummary.status}</div>
          <div className="acc-arrow">{open? '▲':'▼'}</div>
        </div>
      </div>
      {open && (
        <div className="acc-body">
          {loading && <p>Đang tải...</p>}
          {err && <p className="error">{err}</p>}
          {detail && (
            <div>
              <div className="track-card">
                <h3>Trạng thái</h3>
                <div>Hiện tại: {detail.status || orderSummary.status}</div>
              </div>
              <div className="track-card">
                <h3>Chi tiết</h3>
                <div className="order-info-row"><div>Người nhận</div><div>{detail.fullName || orderSummary.fullName || '—'}</div></div>
                <div className="order-info-row"><div>Địa chỉ</div><div>{detail.deliveryAddress || orderSummary.deliveryAddress || '—'}</div></div>
                <div className="order-info-row"><div>Phí giao</div><div>{formatCurrency(detail.deliveryFee ?? 0)}</div></div>
                <div className="order-info-row total"><div>Tổng</div><div>{formatCurrency((detail.totalAmount ?? orderSummary.totalAmount ?? 0))}</div></div>
                <div className="order-meta">Tạo: {detail.createdAt && !Number.isNaN(new Date(detail.createdAt).getTime()) ? new Date(detail.createdAt).toLocaleString() : (orderSummary.createdAt && !Number.isNaN(new Date(orderSummary.createdAt).getTime()) ? new Date(orderSummary.createdAt).toLocaleString() : '-')}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TrackOrder
