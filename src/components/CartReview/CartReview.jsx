import React, { useEffect, useMemo, useState } from 'react';
import './CartReview.css';
import { formatVND } from '../../utils/formatCurrency';

const CartReview = ({
  open,
  onClose,
  cartItems,
  cartLines,
  foodList,
  addToCart,
  removeFromCart,
  updateCartLineQty,
  removeCartLine,
  clearCart,
  onCheckout,
  totalAmount,
  token
}) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setNote('');
    }
  }, [open]);

  const legacyLines = useMemo(() => {
    if (!cartItems || !foodList) return [];
    return foodList
      .map(item => {
        const quantity = Number(cartItems?.[item._id] || 0);
        if (quantity <= 0) return null;
        return {
          key: `legacy-${item._id}`,
          itemId: item._id,
          name: item.name,
          image: item.image,
          unitPrice: Number(item.price) || 0,
          quantity
        };
      })
      .filter(Boolean);
  }, [cartItems, foodList]);

  const normalizedLines = useMemo(() => {
    const mappedCartLines = (cartLines || []).map(line => ({
      key: line.key,
      itemId: line.itemId,
      name: line.name,
      image: line.image,
      unitPrice: Number(line.basePrice) + Number(line.optionsPrice || 0),
      quantity: Number(line.quantity || 0),
      selections: line.selections,
      note: line.note,
      isConfigurable: true,
    }));

    return [...legacyLines, ...mappedCartLines];
  }, [legacyLines, cartLines]);

  const hasItems = normalizedLines.length > 0;
  const formattedTotal = formatVND(totalAmount || 0);

  const handleLegacyDecrease = (itemId) => {
    if (!removeFromCart) return;
    const currentQty = Number(cartItems?.[itemId] || 0);
    if (currentQty <= 0) return;
    removeFromCart(itemId);
  };

  const handleLegacyIncrease = (itemId) => {
    if (!addToCart) return;
    addToCart(itemId);
  };

  const handleConfigurableQty = (lineKey, nextQty) => {
    if (!updateCartLineQty) return;
    updateCartLineQty(lineKey, nextQty);
  };

  const clearCartLineQuantity = (itemId) => {
    if (!removeFromCart || !cartItems) return;
    const qty = Number(cartItems?.[itemId] || 0);
    if (qty <= 0) return;
    for (let i = 0; i < qty; i += 1) {
      removeFromCart(itemId);
    }
  };

  const handleRemoveLine = (line) => {
    if (line.isConfigurable) {
      removeCartLine?.(line.key);
    } else {
      clearCartLineQuantity(line.itemId);
    }
  };

  const handleClearCart = () => {
    if (!hasItems) return;
    const confirmed = window.confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?');
    if (!confirmed) return;
    clearCart?.();
  };

  const handleCheckout = () => {
    if (!hasItems) return;
    onCheckout?.(note.trim());
  };

  if (!open) return null;

  return (
    <div className="cart-review-overlay" onClick={onClose}>
      <div className="cart-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cart-review-header">
          <span className="cart-review-title">Giỏ hàng của bạn</span>
          <div className="cart-review-actions">
            <button
              type="button"
              className={`cart-review-clear ${hasItems ? '' : 'disabled'}`}
              onClick={handleClearCart}
              disabled={!hasItems}
            >
              Xóa giỏ hàng
            </button>
            <button type="button" className="cart-review-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="cart-review-body">
          {!token && (
            <div className="cart-review-alert">
              Vui lòng đăng nhập để đặt món và xem giỏ hàng của bạn.
            </div>
          )}
          {hasItems ? (
            normalizedLines.map((line) => (
              <div key={line.key} className="cart-review-item">
                <img src={line.image} alt={line.name} />
                <div className="cart-review-item-info">
                  <span className="cart-review-item-name">{line.name}</span>
                  {line.selections && (
                    <span className="cart-review-item-options">
                      {Object.entries(line.selections)
                        .map(([group, values]) => `${group}: ${values.join(', ')}`)
                        .join(' • ')}
                    </span>
                  )}
                  {line.note && (
                    <span className="cart-review-item-note">Ghi chú: {line.note}</span>
                  )}
                </div>
                <span className="cart-review-item-price">{formatVND(line.unitPrice)}</span>
                <div className="cart-review-item-qty">
                  <button
                    type="button"
                    onClick={() => {
                      if (line.isConfigurable) {
                        handleConfigurableQty(line.key, Math.max(line.quantity - 1, 0));
                      } else {
                        handleLegacyDecrease(line.itemId);
                      }
                    }}
                  >
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (line.isConfigurable) {
                        handleConfigurableQty(line.key, line.quantity + 1);
                      } else {
                        handleLegacyIncrease(line.itemId);
                      }
                    }}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="cart-review-remove"
                  onClick={() => handleRemoveLine(line)}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <div className="cart-review-empty">
              Giỏ hàng của bạn đang trống. Hãy thêm món để tiếp tục.
            </div>
          )}
        </div>

        <div className="cart-review-footer">
          <textarea
            className="cart-review-note"
            placeholder="Thêm ghi chú đặc biệt"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            className="cart-review-checkout"
            onClick={handleCheckout}
            disabled={!hasItems}
          >
            Thanh toán • {formattedTotal}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartReview;
