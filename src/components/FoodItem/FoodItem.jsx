import React, { useContext, useEffect, useMemo, useState } from 'react'
import './FoodItem.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import { formatVND } from '../../utils/formatCurrency'
import FoodOptionsModal from '../FoodOptionsModal/FoodOptionsModal'
import { item_options } from '../../assets/itemOptions'
import menuAPI from '../../services/menuAPI'
const FoodItem = ({id,restaurantId,name,price,description,image, variant}) => {
  const[itemCount,setItemCount] = useState(0)
  const{cartItems,addToCart,removeFromCart,addToCartWithOptions,food_list,token} = useContext(StoreContext);
  const [open, setOpen] = useState(false);
  const [remoteItem, setRemoteItem] = useState(null);
  const [loadingItem, setLoadingItem] = useState(false);

  const itemDef = useMemo(() => food_list.find(f => f._id === id), [food_list, id]);

  // Normalize backend optionResponses -> optionGroups expected by modal
  const optionGroupsFromAPI = useMemo(() => {
    const base = remoteItem || itemDef;
    if (!base) return [];
    const src = base.optionResponses || base.raw?.optionResponses;
    if (!Array.isArray(src) || src.length === 0) return [];
  return src.map((group) => {
      const title = String(
        group?.name ?? group?.optionName ?? group?.groupName ?? group?.title ?? 'Tùy chọn'
      );
      const required = Boolean(group?.required);
      // Quy ước: nếu backend không chỉ rõ selection type,
      // nhóm Bắt buộc => single, nhóm Tùy chọn => multiple
      let type = 'single';
      const apiType = group?.type || group?.selectionType;
      if (apiType) {
        type = String(apiType).toLowerCase() === 'multiple' ? 'multiple' : 'single';
      } else {
        type = required ? 'single' : 'multiple';
      }
      const values = group?.optionValues || group?.optionValueResponses || group?.values || [];
      const options = (Array.isArray(values) ? values : [])
        .filter((v) => v?.visible !== false)
        .map((v) => ({
          label: String(v?.name ?? v?.optionValueName ?? v?.valueName ?? v?.label ?? ''),
          priceDelta: Number(v?.extraPrice ?? v?.priceDelta ?? 0) || 0,
          id: v?.id ?? v?._id ?? v?.optionValueId ?? v?.valueId,
          defaultSelected: Boolean(v?.default)
        }));
      return { title, required, type, options };
    });
  }, [itemDef]);

  // Fallback to static item_options only when API has no options
  const optionGroups = optionGroupsFromAPI.length > 0 ? optionGroupsFromAPI : (item_options?.[id] || []);
  const hasOptions = optionGroups.length > 0;
  
  const decideHasOptions = (base) => {
    if (!base) return false;
    const src = base.optionResponses || base.raw?.optionResponses;
    if (Array.isArray(src) && src.some(g => (g?.optionValues || g?.optionValueResponses || g?.values || []).length > 0)) {
      return true;
    }
    // fallback to static
    return (item_options?.[id] || []).length > 0;
  }
  
  const handleOpenOrAdd = async (e) => {
    if (e) e.stopPropagation();
    if (!token) {
      alert("Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!");
      return;
    }
    // Open modal immediately for better UX
    setOpen(true);

    // Try to fetch latest item to populate options
    let latest = itemDef;
    if (restaurantId) {
      const controller = new AbortController();
      try {
        setLoadingItem(true);
        const list = await menuAPI.fetchMenuItemsByMerchant(restaurantId, controller.signal);
        const found = (Array.isArray(list) ? list : []).find((it) => {
          const cand = it?._id ?? it?.id ?? it?.itemId ?? it?.menuItemId;
          return String(cand) === String(id);
        });
        if (found) latest = found;
        setRemoteItem(found || null);
      } catch (err) {
        // ignore and use fallback
      } finally {
        setLoadingItem(false);
      }
    }
    // Modal remains open; options will populate if available
  }
  
  const handleRemoveFromCart = (e) => {
    if (e) e.stopPropagation();
    if (!token) {
      alert("Vui lòng đăng nhập để thao tác với giỏ hàng!");
      return;
    }
    removeFromCart(id);
  }
  return (
  <div className={`food-item ${variant ? variant : ''}`} onClick={handleOpenOrAdd}>
    <div className="food-item-img-container" onClick={handleOpenOrAdd}>
            <img className = 'food-item-image'  src = {image} alt ="" />
            {
              !cartItems[id]
              ?<img className='add' onClick={handleOpenOrAdd} src={assets.add_icon_white} alt='' />
              :<div className='food-item-counter'>
                <img onClick={handleRemoveFromCart}  src={assets.remove_icon_red} alt='' />
                <p>{cartItems[id]}</p>
                <img onClick={handleOpenOrAdd}  src={assets.add_icon_green} alt='' />
              </div>
            }
        </div>
        <div className='food-item-info'>
           <div className='food-item-name-rating'>
              <p>{name}</p>
              <img src={assets.rating_starts} alt = ""/>
           </div>
           <p className='food-item-desc'>{description}</p>
           <p className='food-item-price'>{formatVND(price)}</p>
        </div>
        <FoodOptionsModal
          open={open}
          onClose={() => setOpen(false)}
          item={{ _id: id, name, price, description, image, optionGroups }}
          onAdd={(selections, qty, note) => addToCartWithOptions(id, selections, qty, note)}
          loading={loadingItem}
        />
    </div>
  )
}

export default FoodItem
