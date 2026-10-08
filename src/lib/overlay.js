// Draws the radar rings, axis ticks, labels and values on a 2D canvas.
import { AXES as N } from "../config.js";

export function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function drawOverlay(c, S, scale, labels, values) {
  const line = themeColor("--line"), ink = themeColor("--ink"), muted = themeColor("--muted");
  const C = S / 2, Rout = S * 0.36;
  c.setTransform(scale, 0, 0, scale, 0, 0); c.clearRect(0, 0, S, S);
  c.strokeStyle = line; c.lineWidth = 1;
  c.beginPath(); c.arc(C, C, Rout, 0, Math.PI * 2); c.stroke();
  c.setLineDash([1.5, 4]); c.beginPath(); c.arc(C, C, Rout * 0.6, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  const fs = Math.max(11, Math.round(S * 0.034));
  for (let k = 0; k < N; k++) {
    const th = -Math.PI / 2 + (k * 2 * Math.PI) / N, co = Math.cos(th), si = Math.sin(th);
    c.strokeStyle = line; c.beginPath(); c.moveTo(C + co * Rout * 0.9, C + si * Rout * 0.9); c.lineTo(C + co * Rout * 1.07, C + si * Rout * 1.07); c.stroke();
    let lx = C + co * Rout * 1.13; const ly = C + si * Rout * 1.13;
    c.textAlign = Math.abs(co) < 0.2 ? "center" : co > 0 ? "left" : "right";
    c.textBaseline = si < -0.8 ? "bottom" : si > 0.8 ? "top" : "middle";
    c.font = `400 ${fs}px "IBM Plex Mono", monospace`; c.fillStyle = ink;
    const label = labels[k] || " ";
    const tw = c.measureText(label).width, pad = S * 0.012;
    if (c.textAlign === "right") lx = Math.max(lx, pad + tw); else if (c.textAlign === "left") lx = Math.min(lx, S - pad - tw);
    c.fillText(label, lx, ly);
    c.font = `400 ${Math.round(fs * 0.85)}px "IBM Plex Mono", monospace`; c.fillStyle = muted;
    const dy = c.textBaseline === "bottom" ? -fs * 1.2 : fs * 1.25;
    c.fillText((Math.round(values[k] * 10) / 10).toString(), lx, ly + (c.textBaseline === "middle" ? fs * 1.15 : dy));
  }
}
