// Canvas engine for "Prepare your face": framing (move / pinch / wheel), an
// erase/restore mask brush with 100–400% magnification, undo, and automatic
// background removal. The mask lives in photo coordinates, so re-framing
// after erasing keeps the erased areas attached to the photo.
import { personMask } from "./segment.js";

export const W = 800;
const VIEW_MAX = 4, CROP_MAX = 4, MASK_MAX = 1400, UNDO_MAX = 12;

export class EditorEngine {
  constructor(canvas, image, onState) {
    this.c = canvas; this.x = canvas.getContext("2d");
    canvas.width = W; canvas.height = W;
    this.img = image; this.onState = onState;
    const iw = image.naturalWidth, ih = image.naturalHeight, base = W / Math.min(iw, ih);
    this.iw = iw; this.ih = ih;
    this.crop = { base, z: 1, x: (W - iw * base) / 2, y: (W - ih * base) / 2 };
    this.view = { z: 1, x: 0, y: 0 };
    this.mode = "move"; this.brush = 48;
    this.undoStack = []; this.cursor = null;
    this.ptrs = new Map(); this.pinch = null; this.lastPt = null; this.painting = false;

    this.ms = Math.min(1, MASK_MAX / Math.max(iw, ih));
    this.maskC = document.createElement("canvas");
    this.maskC.width = Math.max(1, Math.round(iw * this.ms)); this.maskC.height = Math.max(1, Math.round(ih * this.ms));
    this.maskX = this.maskC.getContext("2d", { willReadFrequently: true });
    this.fillMask();
    this.compC = document.createElement("canvas"); this.compC.width = W; this.compC.height = W;
    this.compX = this.compC.getContext("2d");

    this.handlers = {
      pointerdown: (e) => this.down(e), pointermove: (e) => this.move(e),
      pointerup: (e) => this.up(e), pointercancel: (e) => this.up(e),
      pointerleave: () => { if (!this.ptrs.size) { this.cursor = null; this.render(); } },
      wheel: (e) => this.wheel(e),
    };
    for (const [k, fn] of Object.entries(this.handlers)) canvas.addEventListener(k, fn, k === "wheel" ? { passive: false } : undefined);
    this.render(); this.emit();
  }

  destroy() { for (const [k, fn] of Object.entries(this.handlers)) this.c.removeEventListener(k, fn); }

  emit() {
    this.onState?.({ mode: this.mode, cropZoom: this.crop.z, viewZoom: this.view.z, canUndo: this.undoStack.length > 0 });
  }

  result() {
    this.composite();
    const out = document.createElement("canvas"); out.width = W; out.height = W;
    out.getContext("2d").drawImage(this.compC, 0, 0);
    return out;
  }

  // ---- Photo framing (crop) ----
  rect() { const k = this.crop.base * this.crop.z; return { x: this.crop.x, y: this.crop.y, w: this.iw * k, h: this.ih * k }; }
  clampCrop() {
    const r = this.rect();
    this.crop.x = Math.min(0, Math.max(W - r.w, this.crop.x)); this.crop.y = Math.min(0, Math.max(W - r.h, this.crop.y));
  }
  setCropZoom(z, cx = W / 2, cy = W / 2) {
    const crop = this.crop; z = Math.max(1, Math.min(CROP_MAX, z));
    const k = z / crop.z;
    crop.x = cx - (cx - crop.x) * k; crop.y = cy - (cy - crop.y) * k; crop.z = z;
    this.clampCrop(); this.render(); this.emit();
  }

  // ---- Magnification while brushing ----
  clampView() {
    const v = this.view;
    v.z = Math.max(1, Math.min(VIEW_MAX, v.z));
    v.x = Math.min(0, Math.max(W - W * v.z, v.x)); v.y = Math.min(0, Math.max(W - W * v.z, v.y));
  }
  zoomViewAt(z, sx, sy) {
    const v = this.view, wx = (sx - v.x) / v.z, wy = (sy - v.y) / v.z;
    v.z = Math.max(1, Math.min(VIEW_MAX, z)); v.x = sx - wx * v.z; v.y = sy - wy * v.z;
    this.clampView(); this.render(); this.emit();
  }
  resetView() { this.view = { z: 1, x: 0, y: 0 }; this.render(); this.emit(); }
  toWork(p) { const v = this.view; return { x: (p.x - v.x) / v.z, y: (p.y - v.y) / v.z }; }
  toMask(w) { const r = this.rect(), sx = this.maskC.width / r.w; return { x: (w.x - r.x) * sx, y: (w.y - r.y) * sx }; }

  setMode(m) {
    this.mode = m;
    if (m === "move" && this.view.z !== 1) this.view = { z: 1, x: 0, y: 0 };
    this.cursor = null; this.render(); this.emit();
  }
  setBrush(px) { this.brush = px; this.render(); }

  // ---- Mask ----
  fillMask() { const m = this.maskX; m.globalCompositeOperation = "source-over"; m.clearRect(0, 0, this.maskC.width, this.maskC.height); m.fillStyle = "#fff"; m.fillRect(0, 0, this.maskC.width, this.maskC.height); }
  pushUndo() { this.undoStack.push(this.maskX.getImageData(0, 0, this.maskC.width, this.maskC.height)); if (this.undoStack.length > UNDO_MAX) this.undoStack.shift(); }
  undo() { const d = this.undoStack.pop(); if (d) this.maskX.putImageData(d, 0, 0); this.render(); this.emit(); }
  resetMask() { this.pushUndo(); this.fillMask(); this.render(); this.emit(); }
  stroke(a, b) {
    const m = this.maskX, r = this.rect(), k = this.maskC.width / r.w;
    const pa = this.toMask(a), pb = this.toMask(b);
    m.save();
    m.globalCompositeOperation = this.mode === "erase" ? "destination-out" : "source-over";
    m.strokeStyle = "#fff"; m.lineWidth = (this.brush / this.view.z) * k; m.lineCap = "round"; m.lineJoin = "round";
    m.beginPath(); m.moveTo(pa.x, pa.y); m.lineTo(pb.x + 0.01, pb.y); m.stroke();
    m.restore();
  }
  composite() {
    const c = this.compX, r = this.rect();
    c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, W, W);
    c.drawImage(this.img, r.x, r.y, r.w, r.h);
    c.globalCompositeOperation = "destination-in"; c.drawImage(this.maskC, r.x, r.y, r.w, r.h);
    c.globalCompositeOperation = "source-over";
  }

  // Runs the person model twice: on the whole photo (so re-framing later still
  // has a cut-out) and on the framed square (sharper edges where it matters).
  async autoRemove(onStatus) {
    const { iw, ih } = this, L = Math.max(iw, ih), side = Math.min(1024, L), s = side / L;
    const sq = document.createElement("canvas"); sq.width = side; sq.height = side;
    const sx = sq.getContext("2d");
    sx.fillStyle = "#808080"; sx.fillRect(0, 0, side, side);
    sx.drawImage(this.img, ((L - iw) / 2) * s, ((L - ih) / 2) * s, iw * s, ih * s);
    const full = await personMask(sq, onStatus);

    const frame = document.createElement("canvas"); frame.width = W; frame.height = W;
    const r = this.rect(); frame.getContext("2d").drawImage(this.img, r.x, r.y, r.w, r.h);
    const framed = await personMask(frame, onStatus);

    this.pushUndo();
    const m = this.maskX, mw = this.maskC.width, mh = this.maskC.height, ms = mw / iw;
    m.save();
    m.globalCompositeOperation = "source-over"; m.imageSmoothingEnabled = true;
    m.clearRect(0, 0, mw, mh);
    m.drawImage(full, (-(L - iw) / 2) * ms, (-(L - ih) / 2) * ms, L * ms, L * ms);
    const k = mw / r.w, fx = -r.x * k, fy = -r.y * k, fs = W * k;
    m.clearRect(fx, fy, fs, fs);
    m.drawImage(framed, fx, fy, fs, fs);
    m.restore();
    this.render(); this.emit();
  }

  // ---- Drawing ----
  drawGuide(x) {
    const line = (w, style) => { x.lineWidth = w; x.strokeStyle = style; };
    const paths = () => {
      const cx = W / 2, cy = W * 0.48, rx = W * 0.33, ry = W * 0.42;
      x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    };
    x.save();
    paths(); line(5, "rgba(0,0,0,0.28)"); x.stroke();
    paths(); line(2, "rgba(255,255,255,0.85)"); x.stroke();
    x.setLineDash([3, 9]); x.lineCap = "round";
    x.beginPath(); x.ellipse(W / 2, W * 0.5, W * 0.23, W * 0.31, 0, 0, Math.PI * 2);
    line(4, "rgba(0,0,0,0.25)"); x.stroke(); line(2, "rgba(255,255,255,0.85)"); x.stroke();
    x.restore();
  }

  render() {
    const x = this.x, v = this.view, r = this.rect();
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, W);
    x.setTransform(v.z, 0, 0, v.z, v.x, v.y);
    if (this.mode === "restore") { x.globalAlpha = 0.22; x.drawImage(this.img, r.x, r.y, r.w, r.h); x.globalAlpha = 1; }
    this.composite(); x.drawImage(this.compC, 0, 0);
    this.drawGuide(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (this.cursor && !this.pinch && this.mode !== "move") {
      const { cursor } = this, rad = this.brush / 2;
      x.save(); x.lineWidth = 2;
      x.strokeStyle = "rgba(0,0,0,0.75)"; x.beginPath(); x.arc(cursor.x, cursor.y, rad, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = "rgba(255,255,255,0.9)"; x.beginPath(); x.arc(cursor.x, cursor.y, rad + 2, 0, Math.PI * 2); x.stroke();
      x.restore();
    }
  }

  // ---- Pointer input ----
  pt(e) { const b = this.c.getBoundingClientRect(); return { x: ((e.clientX - b.left) * W) / b.width, y: ((e.clientY - b.top) * W) / b.height }; }
  startPinch() {
    const [a, b] = [...this.ptrs.values()], v = this.view, crop = this.crop;
    const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinch = this.mode === "move"
      ? { d, z: crop.z, m, cx: crop.x, cy: crop.y }
      : { d, z: v.z, wx: (m.x - v.x) / v.z, wy: (m.y - v.y) / v.z };
  }
  down(e) {
    try { this.c.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    const p = this.pt(e); this.ptrs.set(e.pointerId, p);
    if (this.ptrs.size === 2) {
      if (this.painting) {
        const d = this.undoStack.pop(); if (d) this.maskX.putImageData(d, 0, 0);
        this.painting = false; this.lastPt = null; this.emit();
      }
      this.startPinch(); this.render(); return;
    }
    if (this.mode !== "move" && this.ptrs.size === 1 && !this.pinch) {
      this.pushUndo(); this.painting = true; this.lastPt = this.toWork(p); this.stroke(this.lastPt, this.lastPt);
      this.cursor = p; this.render(); this.emit();
    }
  }
  move(e) {
    const p = this.pt(e);
    if (this.mode !== "move") this.cursor = p;
    if (!this.ptrs.has(e.pointerId)) { if (this.mode !== "move") this.render(); return; }
    const prev = this.ptrs.get(e.pointerId); this.ptrs.set(e.pointerId, p);
    if (this.ptrs.size >= 2 && this.pinch) {
      const [a, b] = [...this.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const P = this.pinch;
      if (this.mode === "move") {
        const crop = this.crop, z = Math.max(1, Math.min(CROP_MAX, (P.z * d) / P.d)), k = z / P.z;
        crop.z = z; crop.x = m.x - (P.m.x - P.cx) * k; crop.y = m.y - (P.m.y - P.cy) * k;
        this.clampCrop(); this.render(); this.emit();
      } else {
        const v = this.view;
        v.z = Math.max(1, Math.min(VIEW_MAX, (P.z * d) / P.d));
        v.x = m.x - P.wx * v.z; v.y = m.y - P.wy * v.z;
        this.clampView(); this.render(); this.emit();
      }
      return;
    }
    if (this.mode === "move") {
      if (this.ptrs.size === 1 && !this.pinch) { this.crop.x += p.x - prev.x; this.crop.y += p.y - prev.y; this.clampCrop(); this.render(); }
    } else if (this.painting && this.lastPt) { const w = this.toWork(p); this.stroke(this.lastPt, w); this.lastPt = w; this.render(); }
  }
  up(e) {
    this.ptrs.delete(e.pointerId);
    if (this.ptrs.size === 0) { this.pinch = null; this.painting = false; this.lastPt = null; }
    this.render();
  }
  wheel(e) {
    e.preventDefault();
    const p = this.pt(e), k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    if (this.mode === "move") this.setCropZoom(this.crop.z * k, p.x, p.y); else this.zoomViewAt(this.view.z * k, p.x, p.y);
  }
}
