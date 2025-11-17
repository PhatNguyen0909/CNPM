import React, { useState } from 'react';
import './FeedbackModal.css';

/**
 * Feedback modal with star rating (1-5), comment field, and image upload
 * Props:
 * - open: boolean
 * - onClose: fn
 * - onSubmit: async fn({ orderId, rating, comment, imgFiles })
 * - orderId: number (required)
 * - title: optional string
 */
const FeedbackModal = ({ open, onClose, onSubmit, orderId, title = 'Đánh giá đơn hàng' }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imgFiles, setImgFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleStarSelect = (n) => {
    if (submitting) return;
    setRating(n);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Add new files to existing ones
    const newFiles = [...imgFiles, ...files];
    setImgFiles(newFiles);

    // Create preview URLs for new files
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };

  const handleRemoveImage = (index) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);

    // Remove from both arrays
    const newFiles = imgFiles.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    
    setImgFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  const handleSubmit = async () => {
    if (!rating || submitting) return;
    
    try {
      setSubmitting(true);
      
      // Prepare feedback data
      const feedbackData = {
        orderId,
        rating,
        comment: comment.trim() || undefined,
        imgFiles: imgFiles.length > 0 ? imgFiles : undefined
      };

      await onSubmit?.(feedbackData);
      
      // Reset form
      setRating(0);
      setComment('');
      setImgFiles([]);
      
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    
    // Clean up preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    // Reset form
    setRating(0);
    setComment('');
    setImgFiles([]);
    setPreviewUrls([]);
    
    onClose();
  };

  return (
    <div className="feedback-modal">
      <div className="feedback-modal-container" role="dialog" aria-modal="true">
        <div className="feedback-modal-title">
          <h3>{title}</h3>
          <button className="feedback-close" onClick={handleClose} disabled={submitting} aria-label="Đóng">×</button>
        </div>

        <div className="feedback-content">
          {/* Star Rating */}
          <div className="feedback-section">
            <label className="feedback-label">Đánh giá <span className="required">*</span></label>
            <div className="feedback-stars" aria-label="Chọn số sao">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`star ${n <= rating ? 'active' : ''}`}
                  onClick={() => handleStarSelect(n)}
                  disabled={submitting}
                  aria-label={`${n} sao`}
                >
                  {n <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="feedback-section">
            <label className="feedback-label" htmlFor="feedback-comment">Nhận xét</label>
            <textarea
              id="feedback-comment"
              className="feedback-textarea"
              placeholder="Chia sẻ trải nghiệm của bạn về đơn hàng này..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              rows={4}
              maxLength={500}
            />
            <div className="feedback-char-count">{comment.length}/500</div>
          </div>

          {/* Image Upload */}
          <div className="feedback-section">
            <label className="feedback-label">Hình ảnh</label>
            <div className="feedback-images">
              {previewUrls.map((url, index) => (
                <div key={index} className="feedback-image-preview">
                  <img src={url} alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    className="remove-image"
                    onClick={() => handleRemoveImage(index)}
                    disabled={submitting}
                    aria-label="Xóa hình ảnh"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {previewUrls.length < 5 && (
                <label className="feedback-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={submitting}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-placeholder">
                    <span className="upload-icon">+</span>
                    <span className="upload-text">Thêm ảnh</span>
                  </div>
                </label>
              )}
            </div>
            <div className="feedback-hint">Tối đa 5 hình ảnh</div>
          </div>
        </div>

        <div className="feedback-actions">
          <button className="btn cancel" onClick={handleClose} disabled={submitting}>
            Hủy
          </button>
          <button 
            className="btn submit" 
            onClick={handleSubmit} 
            disabled={!rating || submitting}
          >
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
