// Utility function to format numbers as Vietnamese Dong (VND)
export const formatVND = (price) => {
  if (typeof price !== 'number') {
    return '0đ';
  }
  
  // Convert number to string and add thousand separators
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
};

// Alternative function that uses Intl.NumberFormat for more robust formatting
export const formatVNDIntl = (price) => {
  if (typeof price !== 'number') {
    return '0đ';
  }
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};