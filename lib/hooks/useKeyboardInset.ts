import { useEffect, useState } from "react";

/**
 * Height in px currently taken up by the on-screen keyboard, from the
 * VisualViewport API. Returns 0 when no keyboard is showing (or on browsers
 * without VisualViewport, e.g. older desktops).
 *
 * Why this is needed: mobile browsers do NOT shrink `dvh`/`vh` when the virtual
 * keyboard opens — the keyboard overlays the viewport. So a bottom-anchored
 * sheet keeps its full height and its lower fields end up hidden *behind* the
 * keyboard, with no way to reach them. Feed this value into the bottom padding
 * of the sheet's scroll container: the extra space lets those fields scroll up
 * into the still-visible area above the keyboard (and lets the browser's
 * focus-into-view scroll actually land above it).
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // The gap between the visual viewport's bottom and the layout viewport's
      // bottom is the keyboard. `offsetTop` covers the (rarer) case where the
      // viewport is also pushed down. Ignore tiny gaps so a closed keyboard —
      // or address-bar chrome — reads as flat 0.
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(gap > 120 ? Math.round(gap) : 0);
    };

    // Defer the first read a tick so we never setState synchronously in the
    // effect body (react-hooks/set-state-in-effect).
    const id = setTimeout(update, 0);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      clearTimeout(id);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
