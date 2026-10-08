import { useCallback, useEffect, useRef, useState } from "react";
import { saveImage } from "../lib/saveImage.js";

const ZMAX = 3;

export default function ExportView({ snap, leaving, onClose, onSaved }) {
  const [withChart, setWithChart] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [msg, setMsg] = useState("");
  const canvasRef = useRef(null), blobRef = useRef(null), dlRef = useRef(null), blobTimer = useRef(0);
  const view = useRef({ z: 1, x: 0, y: 0 }), ptrs = useRef(new Map()), pinch = useRef(null);
  const S = snap.face.width;

  // Pan stays within the area the zoom has opened up.
  const clamp = () => {
    const v = view.current, lim = ((v.z - 1) * S) / 2;
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
      o.setTransform(v.z, 0, 0, v.z, S / 2 - (S / 2) * v.z + v.x, S / 2 - (S / 2) * v.z + v.y);
      o.drawImage(snap.face, 0, 0);
    }
    blobRef.current = null; setMsg("");
    clearTimeout(blobTimer.current);
    blobTimer.current = setTimeout(() => c.toBlob((b) => { blobRef.current = b; }, "image/png"), 250);
  }, [S, snap, withChart]);

  useEffect(() => { paint(); }, [paint]);
  useEffect(() => { dlRef.current?.focus(); return () => clearTimeout(blobTimer.current); }, []);

  const setZ = (z, cx = 0, cy = 0) => {
    const v = view.current, nz = Math.max(1, Math.min(ZMAX, z)), k = nz / v.z;
    v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.z = nz;
    clamp(); setZoom(nz); paint();
  };

  // Pointer position relative to the image centre, in output pixels.
  const pt = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width - 0.5) * S, y: ((e.clientY - r.top) / r.height - 0.5) * S }; };
  const onDown = (e) => {
    if (withChart) return;
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
    ptrs.current.set(e.pointerId, pt(e));
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.current.z };
    }
  };
  const onMove = (e) => {
    if (withChart || !ptrs.current.has(e.pointerId)) return;
    const p = pt(e), prev = ptrs.current.get(e.pointerId); ptrs.current.set(e.pointerId, p);
    if (ptrs.current.size >= 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      setZ((pinch.current.z * d) / pinch.current.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (ptrs.current.size === 1 && !pinch.current) {
      view.current.x += p.x - prev.x; view.current.y += p.y - prev.y; clamp(); paint();
    }
  };
  const onUp = (e) => { ptrs.current.delete(e.pointerId); if (!ptrs.current.size) pinch.current = null; };
  const onWheel = (e) => { if (withChart) return; const p = pt(e); setZ(view.current.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y); };
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
      {!withChart && (
        <label className="ed-row ex-zoom" htmlFor="exZoom"><span>Zoom</span>
          <input type="range" id="exZoom" min="1" max={ZMAX} step="0.01" value={zoom} onChange={(e) => setZ(+e.target.value)} />
          <span className="ex-zoom-val">{Math.round(zoom * 100)}%</span>
        </label>
      )}
      <div className="export-actions">
        <button className="act primary" ref={dlRef} onClick={download}>{leaving ? "Download and leave" : "Download"}</button>
        <button className="act" onClick={onClose}>Back to radar</button>
      </div>
      <p aria-live="polite">{withChart || msg ? msg : "Pinch or drag the picture to frame your face."}</p>
    </div>
  );
}
