// Automatic background removal with MediaPipe Selfie Segmentation (Apache 2.0),
// loaded on demand from jsDelivr. Everything runs in the browser.
const SS_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747";
let segP = null;

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.crossOrigin = "anonymous"; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function getSegmenter() {
  if (!segP) {
    segP = (async () => {
      if (!window.SelfieSegmentation) await loadScript(SS_BASE + "/selfie_segmentation.js");
      const ss = new window.SelfieSegmentation({ locateFile: (f) => SS_BASE + "/" + f });
      ss.setOptions({ modelSelection: 0, selfieMode: false });
      await ss.initialize();
      return ss;
    })();
    segP.catch(() => { segP = null; });
  }
  return segP;
}

function runSegment(ss, image) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error("timeout")), 30000);
    ss.onResults((r) => { clearTimeout(timer); res(r); });
    ss.send({ image }).catch((err) => { clearTimeout(timer); rej(err); });
  });
}

// Returns a 256×256 canvas whose alpha is the person mask.
export async function personMask(image, onStatus) {
  onStatus?.("loading");
  const seg = await getSegmenter();
  onStatus?.("finding");
  await new Promise((r) => setTimeout(r, 30));
  const r = await runSegment(seg, image), sm = r.segmentationMask;
  const mw = 256, mh = 256, rc = document.createElement("canvas"); rc.width = mw; rc.height = mh;
  const rx = rc.getContext("2d", { willReadFrequently: true }); rx.drawImage(sm, 0, 0, mw, mh);
  const px = rx.getImageData(0, 0, mw, mh).data, f = new Float32Array(mw * mh);
  let aMin = 255, aMax = 0;
  for (let i = 0; i < f.length; i++) { const a = px[i * 4 + 3]; if (a < aMin) aMin = a; if (a > aMax) aMax = a; }
  const useAlpha = aMax - aMin > 40;
  for (let i = 0; i < f.length; i++) f[i] = (useAlpha ? px[i * 4 + 3] : px[i * 4]) / 255;
  let person = f;
  let c = 0, e = 0, cn = 0, en = 0;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const dx = x / mw - 0.5, dy = y / mh - 0.5, v = f[y * mw + x];
    if (Math.hypot(dx, dy) < 0.15) { c += v; cn++; } else if (Math.max(Math.abs(dx), Math.abs(dy)) > 0.46) { e += v; en++; }
  }
  if (c / cn < e / en) person = f.map((v) => 1 - v);
  const tmp = document.createElement("canvas"); tmp.width = mw; tmp.height = mh;
  const tx = tmp.getContext("2d"), id = tx.createImageData(mw, mh);
  for (let i = 0; i < person.length; i++) {
    const t = Math.max(0, Math.min(1, (person[i] - 0.25) / 0.5)), a = t * t * (3 - 2 * t);
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = Math.round(a * 255);
  }
  tx.putImageData(id, 0, 0);
  return tmp;
}
