import React, { useMemo, useState } from 'react';
import './FoodOptionsModal.css';
import { formatVND } from '../../utils/formatCurrency';

const FoodOptionsModal = ({ open, onClose, item, onAdd }) => {
  const [selections, setSelections] = useState({}); // { groupTitle: string[] }
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const groups = item?.optionGroups || [];

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
      <div className="fom-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fom-header">
          <div className="fom-title">
            <img src={item.image} alt="" />
            <div>
              <div className="fom-price">{formatVND(item.price)}</div>
              <h3>{item.name}</h3>
              <p className="fom-desc">{item.description}</p>
            </div>
          </div>
          <button className="fom-close" onClick={onClose}>×</button>
        </div>

        <div className="fom-body">
          {groups.map((group) => {
            const isSingle = group.type === 'single';
            const sel = selections[group.title] || [];
            return (
              <div key={group.title} className="fom-group">
                <div className="fom-group-header">
                  <div className="fom-group-title">{group.title}</div>
                  <div className={`fom-group-sub ${group.required ? 'required' : ''}`}>
                    {group.required ? 'Bắt buộc • Chọn 1' : 'Tùy chọn'}
                  </div>
                </div>
                <div className="fom-options">
                  {group.options.map((opt) => (
                    <label key={opt.label} className="fom-option">
                      <input
                        type={isSingle ? 'radio' : 'checkbox'}
                        name={group.title}
                        checked={sel.includes(opt.label)}
                        onChange={() => toggleOption(group, opt, isSingle)}
                      />
                      <span className="fom-custom-check" aria-hidden="true" />
                      <span className="fom-option-label">{opt.label}</span>
                      {Number(opt.priceDelta) > 0 && (
                        <span className="fom-option-price">+ {formatVND(Number(opt.priceDelta))}</span>
                      )}
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
          <div className="fom-qty">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(q => q + 1)}>+</button>
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
