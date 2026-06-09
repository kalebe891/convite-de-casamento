import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll to the top whenever the route pathname changes.
 * Anchored navigation (with `hash`) is preserved so in-page links still work.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
