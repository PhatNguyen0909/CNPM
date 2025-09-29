import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    // Scroll to top on every location change (path or query)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
}
