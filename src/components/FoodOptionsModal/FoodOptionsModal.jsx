import React, { useEffect, useMemo, useRef, useState } from 'react';
import './FoodOptionsModal.css';
import { formatVND } from '../../utils/formatCurrency';

const FoodOptionsModal = ({ open, onClose, item, onAdd, loading }) => {
  const [selections, setSelections] = useState({}); // { groupTitle: string[] }
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const groups = item?.optionGroups || [];
  const modalRef = useRef(null);

  // Initialize default selections when opening
  useEffect(() => {
    if (!open || !groups.length) return;
    const initial = {};
    groups.forEach((g) => {
      const defaults = (g.options || []).filter(o => o.defaultSelected).map(o => o.label);
      if (defaults.length) {
        if (g.type === 'single') {
          initial[g.title] = [defaults[0]];
        } else {
          initial[g.title] = defaults;
        }
      }
    });
    if (Object.keys(initial).length > 0) setSelections(initial);
    // reset qty and note each open
    setQty(1);
    setNote('');
  }, [open, groups]);

  // Close on Escape and lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    const onDocMouseDown = (e) => {
      if (!modalRef.current) return;
      if (!modalRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocMouseDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const optionsPrice = useMemo(() => {
    if (!groups.length) return 0;
    let sum = 0;
    groups.forEach(group => {
      const chosen = selections[group.title] || [];
      chosen.forEach(label => {
        const opt = group.options.find(o => o.label === label);
        if (opt) sum += Number(opt.priceDelta || 0);
      });
    });
    return sum;
  }, [groups, selections]);

  const totalPrice = useMemo(() => (Number(item?.price || 0) + optionsPrice) * qty, [item, optionsPrice, qty]);

  const toggleOption = (group, option, isSingle) => {
    setSelections(prev => {
      const current = prev[group.title] || [];
      if (isSingle) {
        return { ...prev, [group.title]: [option.label] };
      }
      const exists = current.includes(option.label);
      return {
        ...prev,
        [group.title]: exists ? current.filter(l => l !== option.label) : [...current, option.label]
      };
    });
  };

  const validateRequired = () => {
    for (const g of groups) {
      if (g.required && (!selections[g.title] || selections[g.title].length === 0)) {
        return false;
      }
    }
    return true;
  };

  const handleAdd = () => {
    if (!validateRequired()) {
      alert('Vui lòng chọn đầy đủ các mục bắt buộc');
      return;
    }
    onAdd(selections, qty, note.trim());
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fom-overlay" onClick={onClose}>
      <div ref={modalRef} className="fom-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fom-hero">
          <img src={item.image} alt="" />
          <button className="fom-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className="fom-header">
          <div className="fom-title-block">
            <div className="fom-price">{formatVND(item.price)}</div>
            <h3 className="fom-name">{item.name}</h3>
            {item.description ? (
              <p className="fom-desc">{item.description}</p>
            ) : null}
          </div>
        </div>

        <div className="fom-body">
          {(!groups || groups.length === 0) && (
            <div style={{padding:'12px 4px', color:'#6b7280', fontSize:14}}>
              {loading ? 'Đang tải tùy chọn…' : 'Món này hiện chưa có tùy chọn.'}
            </div>
          )}
          {groups.map((group) => {
            const isSingle = group.type === 'single';
            const sel = selections[group.title] || [];
            return (
              <div key={group.title} className="fom-group">
                <div className="fom-group-header">
                  <div className="fom-group-title">{group.title}</div>
                  <div className={`fom-group-sub ${group.required ? 'required' : ''}`}>
                    {group.required
                      ? group.type === 'multiple'
                        ? 'Bắt buộc • Chọn nhiều'
                        : 'Bắt buộc • Chọn 1'
                      : group.type === 'multiple'
                        ? 'Tùy chọn • Chọn nhiều'
                        : 'Tùy chọn'}
                  </div>
                </div>
                <div className="fom-options">
                  {group.options.map((opt) => (
                    <label key={opt.label} className={`fom-option ${isSingle ? 'is-radio' : 'is-checkbox'}`}>
                      <input
                        type={isSingle ? 'radio' : 'checkbox'}
                        name={group.title}
                        checked={sel.includes(opt.label)}
                        onChange={() => toggleOption(group, opt, isSingle)}
                      />
                      <span className="fom-custom-check" aria-hidden="true" />
                      <span className="fom-option-label">{opt.label}</span>
                      <span className="fom-option-price">+ {formatVND(Number(opt.priceDelta || 0))}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{padding:'0 16px 12px'}}>
          <textarea
            className="fom-note"
            placeholder="Điền thêm yêu cầu khác nếu có"
            rows={3}
            value={note}
            onChange={(e)=>setNote(e.target.value)}
          />
        </div>
        <div className="fom-footer">
          <div className="fom-qty" role="group" aria-label="Số lượng">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Giảm">−</button>
            <span aria-live="polite">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} aria-label="Tăng">+</button>
          </div>
          <button className="fom-add" onClick={handleAdd}>
            Thêm vào giỏ {formatVND(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodOptionsModal;
