import React, { useState } from 'react';
import './RatingModal.css';

/**
 * Simple star rating modal (1-5 stars). No comment field.
 * Props:
 * - open: boolean
 * - onClose: fn
 * - onSubmit: async fn(rating)
 * - title: optional string
 */
const RatingModal = ({ open, onClose, onSubmit, title = 'Đánh giá đơn hàng' }) => {
  const [stars, setStars] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;

  const handleSelect = (n) => {
    if (submitting) return;
    setStars(n);
  };

  const handleSubmit = async () => {
    if (!stars || submitting) return;
    try {
      setSubmitting(true);
      await onSubmit?.(stars);
      setStars(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rating-modal">
      <div className="rating-modal-container" role="dialog" aria-modal="true">
        <div className="rating-modal-title">
          <h3>{title}</h3>
          <button className="rating-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className="rating-stars" aria-label="Chọn số sao">
          {[1,2,3,4,5].map((n) => (
            <button
              key={n}
              type="button"
              className={`star ${n <= stars ? 'active' : ''}`}
              onClick={() => handleSelect(n)}
              aria-label={`${n} sao`}
            >
              {n <= stars ? '★' : '☆'}
            </button>
          ))}
        </div>

        <div className="rating-actions">
          <button className="btn cancel" onClick={onClose} disabled={submitting}>Hủy</button>
          <button className="btn submit" onClick={handleSubmit} disabled={!stars || submitting}>
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
