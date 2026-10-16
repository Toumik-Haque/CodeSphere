import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instantly scroll back to the top-left of the screen
    window.scrollTo(0, 0);
  }, [pathname]); // Fires every time the URL path changes

  return null; // This component doesn't render any visible UI
}
