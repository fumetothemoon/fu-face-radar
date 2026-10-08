import { useCallback, useEffect, useRef, useState } from "react";
import { saveImage } from "../lib/saveImage.js";
import { useTouchLock } from "../lib/useTouchLock.js";

const ZMAX = 3;

export default function ExportView({ snap, leaving, onClose, onSaved }) {
  const [withChart, setWithChart] = useState(true);
  const [msg, setMsg] = useState("");
  const canvasRef = useRef(null), blobRef = useRef(null), dlRef = useRef(null), blobTimer = useRef(0);
  // Face-only framing: zoom z, rotation r (radians), offset x/y from the centre.
  const view = useRef({ z: 1, r: 0, x: 0, y: 0 }), ptrs = useRef(new Map()), pinch = useRef(null);
  const S = snap.face.width;

  useTouchLock(canvasRef, !withChart);

  // The face can move anywhere as long as its centre stays inside the picture.
  const clamp = () => {
    const v = view.current, lim = S / 2;
    v.x = Math.max(-lim, Math.min(lim, v.x)); v.y = Math.max(-lim, Math.min(lim, v.y));
  };

  const paint = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const o = c.getContext("2d");
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, S, S);
    if (withChart) {
      o.fillStyle = snap.bg; o.fillRect(0, 0, S, S);
      o.drawImage(snap.face, 0, 0); o.drawImage(snap.chart, 0, 0);
    } else {
      const v = view.current;
      o.translate(S / 2 + v.x, S / 2 + v.y); o.rotate(v.r); o.scale(v.z, v.z); o.translate(-S / 2, -S / 2);
      o.drawImage(snap.face, 0, 0);
    }
    blobRef.current = null; setMsg((m) => (m ? "" : m));
    clearTimeout(blobTimer.current);
    blobTimer.current = setTimeout(() => c.toBlob((b) => { blobRef.current = b; }, "image/png"), 250);
  }, [S, snap, withChart]);

  useEffect(() => { paint(); }, [paint]);
  useEffect(() => { dlRef.current?.focus(); return () => clearTimeout(blobTimer.current); }, []);

  // Zoom (factor k) and rotate (angle da) around point m, both relative to the centre.
  const transformAround = (base, k, da, m) => {
    const v = view.current, z = Math.max(1, Math.min(ZMAX, base.z * k)), kk = z / base.z;
    const dx = (base.x - base.m.x) * kk, dy = (base.y - base.m.y) * kk, c = Math.cos(da), s = Math.sin(da);
    v.z = z; v.r = base.r + da;
    v.x = m.x + dx * c - dy * s; v.y = m.y + dx * s + dy * c;
    clamp(); paint();
  };

  // Pointer position relative to the image centre, in output pixels.
  const pt = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width - 0.5) * S, y: ((e.clientY - r.top) / r.height - 0.5) * S }; };
  const onDown = (e) => {
    if (withChart) return;
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
    ptrs.current.set(e.pointerId, pt(e));
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()], v = view.current;
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), z: v.z, r: v.r, x: v.x, y: v.y, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    }
  };
  const onMove = (e) => {
    if (withChart || !ptrs.current.has(e.pointerId)) return;
    const p = pt(e), prev = ptrs.current.get(e.pointerId); ptrs.current.set(e.pointerId, p);
    if (ptrs.current.size >= 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()], P = pinch.current;
      const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      transformAround(P, d / P.d, ang - P.a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    } else if (ptrs.current.size === 1 && !pinch.current) {
      view.current.x += p.x - prev.x; view.current.y += p.y - prev.y; clamp(); paint();
    }
  };
  const onUp = (e) => { ptrs.current.delete(e.pointerId); if (!ptrs.current.size) pinch.current = null; };
  // Desktop: wheel zooms, Shift + wheel rotates.
  const onWheel = (e) => {
    if (withChart) return;
    const p = pt(e), v = view.current, base = { ...v, m: p };
    if (e.shiftKey) transformAround(base, 1, (e.deltaY || e.deltaX) * 0.003, p);
    else transformAround(base, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), 0, p);
  };
  useEffect(() => {
    const c = canvasRef.current, fn = (e) => { if (!withChart) e.preventDefault(); };
    c.addEventListener("wheel", fn, { passive: false });
    return () => c.removeEventListener("wheel", fn);
  }, [withChart]);

  const download = async () => {
    if (!blobRef.current) { setMsg("Still preparing the image. Try again in a second."); return; }
    const result = await saveImage(blobRef.current, withChart ? "fu-face-radar.png" : "fu-face.png");
    if (result === "cancelled") return;
    setMsg(result === "shared" ? "" : "Saved.");
    if (leaving) setTimeout(onSaved, 500);
  };

  return (
    <div className="export" role="dialog" aria-modal="true" aria-label="Save image">
      <canvas
        ref={canvasRef} width={S} height={S}
        className={`ex-canvas${withChart ? "" : " bare"}`}
        role="img" aria-label={withChart ? "Warped portrait with radar labels and circles" : "Warped portrait on a transparent background"}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
      />
      <label className="switch" htmlFor="showChart">
        <input type="checkbox" id="showChart" role="switch" checked={withChart} onChange={(e) => setWithChart(e.target.checked)} />
        <span className="track" aria-hidden="true" />
        <span>Show labels and circles</span>
      </label>
      <div className="export-actions">
        <button className="act primary" ref={dlRef} onClick={download}>{leaving ? "Download and leave" : "Download"}</button>
        <button className="act" onClick={onClose}>Back to radar</button>
      </div>
      <p aria-live="polite">{withChart || msg ? msg : "Drag to move. Pinch to zoom, twist with two fingers to rotate."}</p>
    </div>
  );
}
