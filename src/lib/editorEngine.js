// Canvas engine for the photo editor: square crop (drag, pinch, wheel) and
// background mask painting (erase/restore brush, 100–400% pinch zoom, undo).
import { personMask } from "./segment.js";

export const W = 800;
const VIEW_MAX = 4, CROP_MAX = 4;

export class EditorEngine {
  constructor(canvas, image, onState) {
    this.c = canvas; this.x = canvas.getContext("2d");
    canvas.width = W; canvas.height = W;
    this.img = image; this.onState = onState;
    const iw = image.naturalWidth, ih = image.naturalHeight, base = W / Math.min(iw, ih);
    this.crop = { base, z: 1, x: (W - iw * base) / 2, y: (W - ih * base) / 2 };
    this.view = { z: 1, x: 0, y: 0 };
    this.step = "crop"; this.mode = "erase"; this.brush = 48;
    this.undoStack = []; this.cursor = null;
    this.ptrs = new Map(); this.pinch = null; this.lastPt = null; this.painting = false;
    const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = W; return c; };
    this.cropC = mk(); this.maskC = mk(); this.compC = mk();
    this.cropX = this.cropC.getContext("2d");
    this.maskX = this.maskC.getContext("2d", { willReadFrequently: true });
    this.compX = this.compC.getContext("2d");
    this.handlers = {
      pointerdown: (e) => this.down(e), pointermove: (e) => this.move(e),
      pointerup: (e) => this.up(e), pointercancel: (e) => this.up(e),
      pointerleave: () => { if (this.step === "bg" && !this.ptrs.size) { this.cursor = null; this.render(); } },
      wheel: (e) => this.wheel(e),
    };
    for (const [k, fn] of Object.entries(this.handlers)) canvas.addEventListener(k, fn, k === "wheel" ? { passive: false } : undefined);
    this.render(); this.emit();
  }

  destroy() { for (const [k, fn] of Object.entries(this.handlers)) this.c.removeEventListener(k, fn); }

  emit() {
    this.onState?.({ step: this.step, cropZoom: this.crop.z, viewZoom: this.view.z, canUndo: this.undoStack.length > 0, mode: this.mode });
  }

  // Steps
  toBackground() {
    this.cropX.clearRect(0, 0, W, W); this.drawCrop(this.cropX);
    this.fillMask(); this.undoStack = []; this.resetView(false);
    this.mode = "erase"; this.step = "bg"; this.render(); this.emit();
  }
  toCrop() { this.step = "crop"; this.cursor = null; this.render(); this.emit(); }

  result() {
    this.composite();
    const out = document.createElement("canvas"); out.width = W; out.height = W;
    out.getContext("2d").drawImage(this.compC, 0, 0);
    return out;
  }

  // Crop
  clampCrop() {
    const { crop, img } = this, dw = img.naturalWidth * crop.base * crop.z, dh = img.naturalHeight * crop.base * crop.z;
    crop.x = Math.min(0, Math.max(W - dw, crop.x)); crop.y = Math.min(0, Math.max(W - dh, crop.y));
  }
  setCropZoom(z, cx = W / 2, cy = W / 2) {
    const crop = this.crop; z = Math.max(1, Math.min(CROP_MAX, z));
    const k = z / crop.z;
    crop.x = cx - (cx - crop.x) * k; crop.y = cy - (cy - crop.y) * k; crop.z = z;
    this.clampCrop(); this.render(); this.emit();
  }
  drawCrop(ctx) {
    const { crop, img } = this;
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(img, crop.x, crop.y, img.naturalWidth * crop.base * crop.z, img.naturalHeight * crop.base * crop.z);
  }

  // Background view zoom
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
  resetView(redraw = true) { this.view = { z: 1, x: 0, y: 0 }; if (redraw) { this.render(); this.emit(); } }
  toWork(p) { const v = this.view; return { x: (p.x - v.x) / v.z, y: (p.y - v.y) / v.z }; }

  // Mask
  fillMask() { const m = this.maskX; m.globalCompositeOperation = "source-over"; m.clearRect(0, 0, W, W); m.fillStyle = "#fff"; m.fillRect(0, 0, W, W); }
  composite() {
    const c = this.compX;
    c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, W, W);
    c.drawImage(this.cropC, 0, 0);
    c.globalCompositeOperation = "destination-in"; c.drawImage(this.maskC, 0, 0);
    c.globalCompositeOperation = "source-over";
  }
  pushUndo() { this.undoStack.push(this.maskX.getImageData(0, 0, W, W)); if (this.undoStack.length > 20) this.undoStack.shift(); }
  undo() { const d = this.undoStack.pop(); if (d) this.maskX.putImageData(d, 0, 0); this.render(); this.emit(); }
  resetMask() { this.pushUndo(); this.fillMask(); this.render(); this.emit(); }
  setMode(m) { this.mode = m; this.render(); this.emit(); }
  setBrush(px) { this.brush = px; this.render(); }
  stroke(a, b) {
    const m = this.maskX;
    m.save();
    m.globalCompositeOperation = this.mode === "erase" ? "destination-out" : "source-over";
    m.strokeStyle = "#fff"; m.lineWidth = this.brush / this.view.z; m.lineCap = "round"; m.lineJoin = "round";
    m.beginPath(); m.moveTo(a.x, a.y); m.lineTo(b.x + 0.01, b.y); m.stroke();
    m.restore();
  }
  async autoRemove(onStatus) {
    const mask = await personMask(this.cropC, onStatus);
    this.pushUndo();
    const m = this.maskX;
    m.globalCompositeOperation = "source-over"; m.clearRect(0, 0, W, W);
    m.imageSmoothingEnabled = true; m.drawImage(mask, 0, 0, W, W);
    this.render(); this.emit();
  }

  render() {
    const x = this.x, v = this.view;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, W);
    if (this.step === "crop") {
      this.drawCrop(x);
      x.save(); x.strokeStyle = "rgba(255,255,255,0.9)"; x.lineWidth = 3; x.setLineDash([10, 10]);
      x.beginPath(); x.arc(W / 2, W / 2, W * 0.36, 0, Math.PI * 2); x.stroke(); x.restore();
      return;
    }
    x.setTransform(v.z, 0, 0, v.z, v.x, v.y);
    if (this.mode === "restore") { x.globalAlpha = 0.22; x.drawImage(this.cropC, 0, 0); x.globalAlpha = 1; }
    this.composite(); x.drawImage(this.compC, 0, 0);
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (this.cursor && !this.pinch) {
      const { cursor } = this, r = this.brush / 2;
      x.save(); x.lineWidth = 2;
      x.strokeStyle = "rgba(0,0,0,0.75)"; x.beginPath(); x.arc(cursor.x, cursor.y, r, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = "rgba(255,255,255,0.9)"; x.beginPath(); x.arc(cursor.x, cursor.y, r + 2, 0, Math.PI * 2); x.stroke();
      x.restore();
    }
  }

  // Pointer input
  pt(e) { const r = this.c.getBoundingClientRect(); return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * W) / r.height }; }
  startPinch() {
    const [a, b] = [...this.ptrs.values()], v = this.view;
    const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinch = this.step === "crop" ? { d, z: this.crop.z } : { d, z: v.z, wx: (m.x - v.x) / v.z, wy: (m.y - v.y) / v.z };
  }
  down(e) {
    try { this.c.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    const p = this.pt(e); this.ptrs.set(e.pointerId, p);
    if (this.ptrs.size === 2) {
      if (this.step === "bg" && this.painting) {
        const d = this.undoStack.pop(); if (d) this.maskX.putImageData(d, 0, 0);
        this.painting = false; this.lastPt = null; this.emit();
      }
      this.startPinch(); this.render(); return;
    }
    if (this.step === "bg" && this.ptrs.size === 1 && !this.pinch) {
      this.pushUndo(); this.painting = true; this.lastPt = this.toWork(p); this.stroke(this.lastPt, this.lastPt);
      this.cursor = p; this.render(); this.emit();
    }
  }
  move(e) {
    const p = this.pt(e);
    if (this.step === "bg") this.cursor = p;
    if (!this.ptrs.has(e.pointerId)) { if (this.step === "bg") this.render(); return; }
    const prev = this.ptrs.get(e.pointerId); this.ptrs.set(e.pointerId, p);
    if (this.ptrs.size >= 2 && this.pinch) {
      const [a, b] = [...this.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (this.step === "crop") this.setCropZoom((this.pinch.z * d) / this.pinch.d, m.x, m.y);
      else {
        const v = this.view;
        v.z = Math.max(1, Math.min(VIEW_MAX, (this.pinch.z * d) / this.pinch.d));
        v.x = m.x - this.pinch.wx * v.z; v.y = m.y - this.pinch.wy * v.z;
        this.clampView(); this.render(); this.emit();
      }
      return;
    }
    if (this.step === "crop") {
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
    if (this.step === "crop") this.setCropZoom(this.crop.z * k, p.x, p.y); else this.zoomViewAt(this.view.z * k, p.x, p.y);
  }
}
