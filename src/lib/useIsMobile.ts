import { useEffect, useState } from "react";

/**
 * The owner's phone is a different product from the plant office's monitor, not
 * a narrower one, so the two layouts are chosen rather than reflowed.
 *
 * Supervisors and plant heads use the desktop layout; this breakpoint only
 * decides which of the two Level 1 screens to render.
 */
const QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener("change", onChange);
    setIsMobile(media.matches);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
