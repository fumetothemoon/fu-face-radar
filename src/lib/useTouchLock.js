import { useEffect } from "react";

// Keeps the browser from taking over touch gestures on an element, so our own
// drag / pinch / twist handlers get every finger. iOS Safari otherwise grabs
// two-finger gestures for page zoom (and cancels our pointer events), even when
// CSS touch-action is set.
export function useTouchLock(ref, active = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const stop = (e) => { if (e.cancelable) e.preventDefault(); };
    const opts = { passive: false };
    el.addEventListener("touchstart", stop, opts);
    el.addEventListener("touchmove", stop, opts);
    el.addEventListener("gesturestart", stop, opts);
    el.addEventListener("gesturechange", stop, opts);
    return () => {
      el.removeEventListener("touchstart", stop, opts);
      el.removeEventListener("touchmove", stop, opts);
      el.removeEventListener("gesturestart", stop, opts);
      el.removeEventListener("gesturechange", stop, opts);
    };
  }, [ref, active]);
}
