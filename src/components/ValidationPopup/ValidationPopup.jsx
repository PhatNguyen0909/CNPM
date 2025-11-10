import React from 'react';
import './ValidationPopup.css';

// Props:
// invalidEntries: [{ name, reason, type, itemId|key }]
// onRemove: function to remove invalid items
// onClose: function to close popup
// checking: boolean (optional) for ongoing removal action
const ValidationPopup = ({ invalidEntries = [], onRemove, onClose, checking }) => {
  const hasItems = Array.isArray(invalidEntries) && invalidEntries.length > 0;
  return (
    <div className="vp-overlay" onClick={onClose}>
      <div className="vp-modal" onClick={e => e.stopPropagation()}>
        <h3 className="vp-title">Một số món đã hết hoặc không còn bán</h3>
        <p className="vp-sub">Bạn có thể xóa các món này khỏi giỏ để tiếp tục.</p>
        <div className="vp-list">
          {hasItems ? (
            invalidEntries.map((it, idx) => (
              <div key={idx} className="vp-item">
                <span className="vp-item-name">{it.name}</span>
                {it.reason && <span className="vp-item-reason"></span>}
              </div>
            ))
          ) : (
            <div className="vp-empty">Không có dữ liệu món lỗi.</div>
          )}
        </div>
        <div className="vp-actions">
          <button className="vp-btn vp-close" onClick={onClose}>Đóng</button>
          <button className="vp-btn vp-remove" disabled={!hasItems || checking} onClick={onRemove}>
            {checking ? 'Đang xóa...' : 'Xóa các món lỗi'}
          </button>
        </div>
      </div>
    </div>
  );
};

function translateReason(reason) {
  if (!reason) return '';
  // Collapse combined reasons
  if (reason.includes('inactive')) return 'ngừng bán';
  if (reason.includes('hidden')) return 'đang ẩn';
  if (reason === 'unavailable') return 'hết hàng';
  if (reason === 'deleted' || reason === 'not_found') return 'không tồn tại';
  if (reason === 'error') return 'lỗi tải';
  return reason;
}

export default ValidationPopup;
