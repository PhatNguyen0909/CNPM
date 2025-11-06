import React, { useEffect, useMemo, useState } from 'react'
import './TrackOrder.css'
import { useSearchParams } from 'react-router-dom'
import orderAPI from '../../services/orderAPI'
import RatingModal from '../../components/RatingModal/RatingModal'

// Order status flow (3 steps)
const STATUS_FLOW = ['CONFIRMED', 'DELIVERING','COMPLETED']
const STATUS_LABELS = {
  CONFIRMED: 'Đã xác nhận',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành'
}

const formatCurrency = (v = 0) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

const TrackOrder = () => {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Two tabs: 'active' (Theo dõi đơn) | 'history' (Lịch sử)
  const [tab, setTab] = useState('active')

  useEffect(() => {
    let mounted = true
    const loadList = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch all orders once; we will filter per tab on client
        let all = await orderAPI.getOrders()
        if (!Array.isArray(all) || all.length === 0) {
          // fallback: use active set if available
          const activeOnly = await orderAPI.getActiveOrders()
          all = Array.isArray(activeOnly) ? activeOnly : []
        }
        if (mounted) setOrder(all)
      } catch (err) {
        if (mounted) setError('Không thể tải danh sách đơn hàng')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadList()
    return () => { mounted = false }
  }, [code])

  const normalizeStatus = (s) => String(s || '').trim().toUpperCase()
  const isHistory = (s) => {
    const u = normalizeStatus(s)
    return u === 'COMPLETED' || u === 'CANCELED' || u === 'CANCELLED'
  }
  const isActive = (s) => !isHistory(s)

  const activeCount = useMemo(() => Array.isArray(order) ? order.filter(o => isActive(o?.status)).length : 0, [order])
  const historyCount = useMemo(() => Array.isArray(order) ? order.filter(o => isHistory(o?.status)).length : 0, [order])
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(order)) return []
    if (tab === 'history') return order.filter(o => isHistory(o?.status))
    return order.filter(o => isActive(o?.status))
  }, [order, tab])

  const reload = async () => {
    // simple refetch
    try {
      setLoading(true); setError(null)
      let all = await orderAPI.getOrders()
      if (!Array.isArray(all) || all.length === 0) {
        const activeOnly = await orderAPI.getActiveOrders()
        all = Array.isArray(activeOnly) ? activeOnly : []
      }
      setOrder(all)
    } catch (e) {
      setError('Không thể tải danh sách đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="track-page"><p>Đang tải...</p></div>
  if (error) return <div className="track-page"><p className="error">{error}</p></div>
  if (!filteredOrders || filteredOrders.length === 0) return (
    <div className="track-page">
      <div className="track-tabs">
        <button
          type="button"
          className={`track-tab ${tab==='active' ? 'active':''}`}
          onClick={() => setTab('active')}
        >
          <span>Theo dõi đơn</span>
          <span className="badge">{activeCount}</span>
        </button>
        <button
          type="button"
          className={`track-tab ${tab==='history' ? 'active':''}`}
          onClick={() => setTab('history')}
        >
          <span>Lịch sử đơn</span>
          <span className="badge">{historyCount}</span>
        </button>
        <button type="button" className="track-refresh" onClick={reload} disabled={loading}>
          {loading ? 'Đang tải…' : 'Làm mới'}
        </button>
      </div>
       
      <p>Không có đơn hàng.</p>
    </div>
    
    
  )

  // Active orders only; history is accessible via the third tab link
  return (
    <div className="track-page">
      <div className="track-tabs">
        <button
          type="button"
          className={`track-tab ${tab==='active' ? 'active':''}`}
          onClick={() => setTab('active')}
        >
          <span>Theo dõi đơn</span>
          <span className="badge">{activeCount}</span>
        </button>
        <button
          type="button"
          className={`track-tab ${tab==='history' ? 'active':''}`}
          onClick={() => setTab('history')}
        >
          <span>Lịch sử đơn</span>
          <span className="badge">{historyCount}</span>
        </button>
        <button type="button" className="track-refresh" onClick={reload} disabled={loading}>
          {loading ? 'Đang tải…' : 'Làm mới'}
        </button>
      </div>

      <div className="orders-list">
        {filteredOrders.map(o => (
          tab === 'history'
            ? <HistoryAccordion key={o.id || o._id || o.code} orderSummary={o} />
            : <OrderAccordion key={o.id || o._id || o.code} orderSummary={o} />
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
      
      </div>
      {open && (
        <div className="acc-body">
          {loading && <p>Đang tải...</p>}
          {err && <p className="error">{err}</p>}
          {detail && (
            <div>
              <div className="track-card">
                <h3>Trạng thái</h3>
                {(() => {
                  const raw = String(detail.status || orderSummary.status || '').toUpperCase();
                  // Map various backend statuses into our 3-step flow
                  const alias = {
                    CONFIRMED: 'CONFIRMED',
                    DELIVERING:'DELIVERING',
                    COMPLETED:'COMPLETED',
                  };
                  const st = alias[raw] || raw;
                  const idx = Math.max(0.5, STATUS_FLOW.indexOf(st));
                  const totalSteps = STATUS_FLOW.length - 1; // last index
                  const progress = Math.max(0, Math.min(100, (idx / totalSteps) * 100));
                  const iconFor = (key) => {
                    switch(key){
                      case 'CONFIRMED': return '✅';
                      case 'READY': return '📦';
                      case 'DELIVERING': return '🚚';
                      case 'COMPLETED': return '🏁';
                      default: return 'ℹ️';
                    }
                  }
                  return (
                    <div>
                      <div className="progress-line"><div className="progress-fill" style={{width: progress + '%'}} /></div>
                      <div className="steps">
                        {STATUS_FLOW.map((key, i) => (
                          <div key={key} className={`step ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}`}>
                            <div className="step-icon" aria-label={STATUS_LABELS[key]} title={STATUS_LABELS[key]}>{iconFor(key)}</div>
                            <div className="step-label">{STATUS_LABELS[key]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div className="track-card">
                <h3>Chi tiết đơn hàng</h3>
                {(() => {
                  const items = Array.isArray(detail.items) ? detail.items : [];
                  const lineSubtotal = (it) => {
                    const qty = Number(it?.quantity || 1);
                    const base = Number(it?.base_price || 0);
                    const optExtra = Array.isArray(it?.options) ? it.options.reduce((s, o) => s + Number(o?.extra_price || 0), 0) : 0;
                    const sub = Number(it?.subtotal ?? (base + optExtra) * qty);
                    return Number.isFinite(sub) ? sub : 0;
                  };
                  const subTotal = items.reduce((s, it) => s + lineSubtotal(it), 0);
                  const ship = Number(detail.deliveryFee || 0);
                  const grand = Number(detail.totalAmount ?? subTotal + ship);

                  return (
                    <div>
                      {/* Items list */}
                      <div className="items-list">
                        {items.length > 0 ? items.map((it, idx) => (
                          <div key={idx} className="item-row">
                            <div className="item-line">
                              <div>
                                <div className="item-name">{it.name} <span className="item-qty">x{it.quantity}</span></div>
                                {/* Options under the item */}
                                {Array.isArray(it.options) && it.options.length > 0 && (
                                  <ul className="item-options">
                                    {it.options.map((op, j) => (
                                      <li key={j} className="item-option">
                                        {op.option} {op.extra_price > 0 && `(+${formatCurrency(op.extra_price)})`}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {it.note && <div className="item-note">Ghi chú: {it.note}</div>}
                              </div>
                              {/* Hiển thị giá món */}
                              <div className="item-price">{formatCurrency((Number(it.base_price||0)) * (Number(it.quantity||1)))}</div>
                            </div>
                            <hr />
                          </div>
                        )) : (
                          <div>Không có món trong đơn</div>
                        )}
                      </div>


                      {/* Subtotal/fee/total */}
                      <div className="order-info-row"><div>Tạm tính</div><div>{formatCurrency(subTotal)}</div></div>
                      <div className="order-info-row"><div>Phí giao hàng</div><div>{formatCurrency(ship)}</div></div>
                      <div className="order-info-row total"><div>Tổng cộng</div><div>{formatCurrency(grand)}</div></div>

                      <div className="order-meta">Tạo: {detail.createdAt && !Number.isNaN(new Date(detail.createdAt).getTime()) ? new Date(detail.createdAt).toLocaleString() : (orderSummary.createdAt && !Number.isNaN(new Date(orderSummary.createdAt).getTime()) ? new Date(orderSummary.createdAt).toLocaleString() : '-')}</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TrackOrder

function HistoryAccordion({ orderSummary }){
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [rateOpen, setRateOpen] = useState(false)
  const [hasRated, setHasRated] = useState(false)
  const [msg, setMsg] = useState('')

  const statusText = useMemo(() => {
    const raw = String(orderSummary.status || '').toUpperCase()
    if (raw === 'CANCELED' || raw === 'CANCELLED') return 'Hủy đơn'
    if (raw === 'COMPLETED') return 'Hoàn thành'
    return raw || '-'
  }, [orderSummary.status])

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
          <div className="acc-status">{statusText}</div>
        </div>
      </div>
      {open && (
        <div className="acc-body">
          {loading && <p>Đang tải...</p>}
          {err && <p className="error">{err}</p>}
          {msg && <p>{msg}</p>}
          {detail && (
            <div>
              <div className="track-card">
                <div className="status-current">Trạng thái đơn: <strong>{statusText}</strong></div>
              </div>
              <div className="track-card">
                <h3>Chi tiết đơn hàng</h3>
                {(() => {
                  const items = Array.isArray(detail.items) ? detail.items : []
                  const lineSubtotal = (it) => {
                    const qty = Number(it?.quantity || 1)
                    const base = Number(it?.base_price || 0)
                    const optExtra = Array.isArray(it?.options) ? it.options.reduce((s, o) => s + Number(o?.extra_price || 0), 0) : 0
                    const sub = Number(it?.subtotal ?? (base + optExtra) * qty)
                    return Number.isFinite(sub) ? sub : 0
                  }
                  const subTotal = items.reduce((s, it) => s + lineSubtotal(it), 0)
                  const ship = Number(detail.deliveryFee || 0)
                  const grand = Number(detail.totalAmount ?? subTotal + ship)

                  return (
                    <div>
                      <div className="items-list">
                        {items.length > 0 ? items.map((it, idx) => (
                          <div key={idx} className="item-row">
                            <div className="item-line">
                              <div>
                                <div className="item-name">{it.name} <span className="item-qty">x{it.quantity}</span></div>
                                {Array.isArray(it.options) && it.options.length > 0 && (
                                  <ul className="item-options">
                                    {it.options.map((op, j) => (
                                      <li key={j} className="item-option">
                                        {op.option} {op.extra_price > 0 && `(+${formatCurrency(op.extra_price)})`}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {it.note && <div className="item-note">Ghi chú: {it.note}</div>}
                              </div>
                              <div className="item-price">{formatCurrency((Number(it.base_price||0)) * (Number(it.quantity||1)))}</div>
                            </div>
                          </div>
                        )) : (
                          <div>Không có món trong đơn</div>
                        )}
                      </div>

                      <hr className="thin-sep" />

                      <div className="order-info-row"><div>Tạm tính</div><div>{formatCurrency(subTotal)}</div></div>
                      <div className="order-info-row"><div>Phí giao hàng</div><div>{formatCurrency(ship)}</div></div>
                      <div className="order-info-row total"><div>Tổng cộng</div><div>{formatCurrency(grand)}</div></div>

                      <div className="order-meta">Tạo: {detail.createdAt && !Number.isNaN(new Date(detail.createdAt).getTime()) ? new Date(detail.createdAt).toLocaleString() : (orderSummary.createdAt && !Number.isNaN(new Date(orderSummary.createdAt).getTime()) ? new Date(orderSummary.createdAt).toLocaleString() : '-')}</div>
                    </div>
                  )
                })()}
              </div>
              {String(orderSummary.status||'').toUpperCase()==='COMPLETED' && !hasRated && (
                <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}>
                  <button
                    type="button"
                    onClick={(e)=>{e.stopPropagation(); setRateOpen(true)}}
                    className="track-refresh"
                  >
                    Đánh giá
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <RatingModal
        open={rateOpen}
        onClose={()=>setRateOpen(false)}
        onSubmit={async (rating)=>{
          try{
            const id = detail?.id || orderSummary.id || orderSummary._id || orderSummary.orderId
            await orderAPI.rateOrder(id, rating)
            setHasRated(true)
            setMsg('Cảm ơn bạn đã đánh giá!')
            setRateOpen(false)
          }catch(e){
            const m = e?.response?.data?.message || e.message || 'Gửi đánh giá thất bại'
            setMsg(m)
          }
        }}
      />
    </div>
  )
}
