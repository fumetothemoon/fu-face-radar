// WebGL mesh warp: stretches a square face image into a six-point radar star.
import { AXES as N } from "../config.js";

const G = 120;
const NV = (G + 1) * (G + 1);
const HALF = 0.36, VALLEY = 0.6 / HALF, CURVE = 2.2, SIG = 0.42;

export class FaceWarp {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = (this.gl = canvas.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: true }));
    this.ready = false;
    this.pos = new Float32Array(NV * 2);
    this.vx = new Float32Array(NV); this.vy = new Float32Array(NV);
    this.vf = new Float32Array(NV); this.vg = new Float32Array(NV);
    this.vq = new Float32Array(NV * N);
    if (!gl) return;
    const vs = "attribute vec2 p; attribute vec2 u; varying vec2 v; void main(){ v=u; gl_Position=vec4(p,0.,1.); }";
    const fs = "precision mediump float; varying vec2 v; uniform sampler2D s; void main(){ gl_FragColor=texture2D(s,v); }";
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    const uv = new Float32Array(NV * 2);
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) { const n = j * (G + 1) + i; uv[n * 2] = i / G; uv[n * 2 + 1] = j / G; }
    const idx = [];
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const a = j * (G + 1) + i, b = a + 1, c = a + G + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    this.nIdx = idx.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const lu = gl.getAttribLocation(prog, "u"); gl.enableVertexAttribArray(lu); gl.vertexAttribPointer(lu, 2, gl.FLOAT, false, 0, 0);
    this.posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf); gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW);
    const lp = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    this.tex = gl.createTexture();
  }

  // src: the square face image. Rotation is applied before warping, so the
  // star shape is rebuilt from the rotated outline.
  setFace(src) {
    this.src = src; this.angle = 0;
    this.apply();
  }

  setRotation(deg) {
    this.angle = deg;
    if (this.src) this.apply();
  }

  apply() {
    const gl = this.gl;
    if (!gl) return;
    const n = 800, rc = this.rotC || (this.rotC = document.createElement("canvas"));
    rc.width = n; rc.height = n;
    const x = rc.getContext("2d");
    x.clearRect(0, 0, n, n);
    x.translate(n / 2, n / 2); x.rotate((this.angle * Math.PI) / 180);
    x.drawImage(this.src, -n / 2, -n / 2, n, n);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rc);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((w) => gl.texParameteri(gl.TEXTURE_2D, w, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.measureEdges(rc);
    this.precompute();
    this.ready = true;
  }

  // How far the visible (non-transparent) image reaches from the centre, per degree.
  measureEdges(src) {
    const n = 240, cv = document.createElement("canvas"); cv.width = n; cv.height = n;
    const cx = cv.getContext("2d"); cx.drawImage(src, 0, 0, n, n);
    const a = cx.getImageData(0, 0, n, n).data, h = n / 2, raw = new Float32Array(360);
    for (let i = 0; i < 360; i++) {
      const th = (i * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
      const tmax = h / Math.max(Math.abs(c), Math.abs(s));
      let last = 0;
      for (let t = 0; t < tmax; t += 1) {
        const x = Math.min(n - 1, Math.round(h + t * c)), y = Math.min(n - 1, Math.round(h + t * s));
        if (a[(y * n + x) * 4 + 3] > 40) last = t;
      }
      raw[i] = Math.max(0.3, last / h);
    }
    const RC = (this.RC = new Float32Array(360));
    for (let i = 0; i < 360; i++) { let s = 0; for (let d = -4; d <= 4; d++) s += raw[(i + d + 360) % 360]; RC[i] = s / 9; }
  }

  rcAt(th) {
    let deg = (th * 180) / Math.PI; deg = ((deg % 360) + 360) % 360;
    const i = Math.floor(deg), f = deg - i;
    return this.RC[i] * (1 - f) + this.RC[(i + 1) % 360] * f;
  }

  precompute() {
    const { vx, vy, vf, vg, vq } = this, T = 1 / HALF;
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      const n = j * (G + 1) + i, x = (i / G) * 2 - 1, y = (j / G) * 2 - 1;
      vx[n] = x; vy[n] = y;
      const r = Math.hypot(x, y);
      if (r < 1e-9) { vf[n] = 0; vg[n] = 0; continue; }
      const th = Math.atan2(y, x), rc = this.rcAt(th);
      const ws = []; let wsum = 0, near = Math.PI;
      for (let k = 0; k < N; k++) {
        let d = th - (-Math.PI / 2 + (k * 2 * Math.PI) / N);
        d = Math.atan2(Math.sin(d), Math.cos(d));
        near = Math.min(near, Math.abs(d));
        const w = Math.exp(-(d / SIG) * (d / SIG)); ws.push(w); wsum += w;
      }
      const u = Math.max(0, 1 - near / (Math.PI / N));
      const Rstar = VALLEY + (T - VALLEY) * Math.pow(u, CURVE);
      const D = Rstar / rc - 1;
      for (let k = 0; k < N; k++) vq[n * N + k] = (ws[k] / wsum) * D;
      const q = Math.min(1, r / rc);
      vf[n] = Math.pow(q, 1.25); vg[n] = Math.pow(q, 1.6);
    }
  }

  // values: six numbers 0–10. Up to 2 leaves the photo untouched.
  render(values) {
    const gl = this.gl;
    if (!gl || !this.ready) return;
    const { pos, vx, vy, vf, vg, vq } = this;
    const S = 1, C = 0.5, half = 0.36 * HALF;
    const amt = values.map((v) => Math.max(0, v - 2) / 8);
    const mean = amt.reduce((a, b) => a + b, 0) / N;
    let ox = 0, oy = 0;
    for (let k = 0; k < N; k++) { const th = -Math.PI / 2 + (k * 2 * Math.PI) / N; ox += (amt[k] - mean) * Math.cos(th); oy += (amt[k] - mean) * Math.sin(th); }
    ox *= 0.35; oy *= 0.35;
    for (let n = 0; n < NV; n++) {
      let m = 0; const o = n * N;
      for (let k = 0; k < N; k++) m += amt[k] * vq[o + k];
      const sc = 1 + (m > 0 ? vf[n] : vg[n]) * m, drift = 1 - vf[n];
      pos[n * 2] = ((C + (vx[n] * sc + ox * drift) * half) / S) * 2 - 1;
      pos[n * 2 + 1] = 1 - ((C + (vy[n] * sc + oy * drift) * half) / S) * 2;
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_SHORT, 0);
  }
}
