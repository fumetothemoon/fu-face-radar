import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AXES as N, NOTES, PRESETS, asset } from "../config.js";
import { FaceWarp } from "../lib/faceWarp.js";
import { drawOverlay, themeColor } from "../lib/overlay.js";
import { useTouchLock } from "../lib/useTouchLock.js";

const SNAP = 1080;
const BREATH_MIN = 3, BREATH_MAX = 10;
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const round1 = (v) => Math.round(v * 10) / 10;

export default function RadarView({ ref, onLeave, onMakeImage, onDemoReady, leaveBtnRef }) {
  const [preset, setPreset] = useState("ability");
  const [labels, setLabels] = useState(PRESETS.ability.labels);
  const [base, setBase] = useState(PRESETS.ability.values);
  const [display, setDisplay] = useState(PRESETS.ability.values);
  const [playing, setPlaying] = useState(false);
  const [rotation, setRotationState] = useState(0);
  const [rotOpen, setRotOpen] = useState(false);

  const stageRef = useRef(null), glRef = useRef(null), ovRef = useRef(null);
  useTouchLock(glRef);
  useTouchLock(ovRef);
  const warpRef = useRef(null), shownRef = useRef(PRESETS.ability.values.slice());
  const labelsRef = useRef(labels), baseRef = useRef(base), playingRef = useRef(false);
  const sizeRef = useRef(0), dprRef = useRef(1), rafRef = useRef(0), tweenRef = useRef(0);
  labelsRef.current = labels; baseRef.current = base;
  const rotRef = useRef(0), rotRaf = useRef(0), twistRef = useRef(null), touchRef = useRef(new Map());

  const draw = useCallback(() => {
    const S = sizeRef.current;
    if (!S || !warpRef.current) return;
    warpRef.current.render(shownRef.current);
    drawOverlay(ovRef.current.getContext("2d"), S, dprRef.current, labelsRef.current, shownRef.current);
  }, []);

  const resize = useCallback(() => {
    const st = stageRef.current; if (!st) return;
    dprRef.current = Math.min(window.devicePixelRatio || 1, 2);
    sizeRef.current = st.clientWidth;
    const px = Math.round(sizeRef.current * dprRef.current);
    for (const c of [glRef.current, ovRef.current]) { c.width = px; c.height = px; }
    draw();
  }, [draw]);

  // Setup: WebGL, demo face, resize and theme listeners.
  useEffect(() => {
    warpRef.current = new FaceWarp(glRef.current);
    const ro = new ResizeObserver(resize); ro.observe(stageRef.current);
    resize();
    const img = new Image();
    img.onload = () => { warpRef.current.setFace(img); draw(); onDemoReady?.(); };
    img.src = asset("demo-face.png");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", draw);
    const mo = new MutationObserver(draw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(draw);
    return () => { ro.disconnect(); mq.removeEventListener("change", draw); mo.disconnect(); cancelAnimationFrame(rafRef.current); cancelAnimationFrame(tweenRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { draw(); }, [labels, draw]);

  const tween = useCallback((target, ms) => {
    cancelAnimationFrame(tweenRef.current);
    if (reduceMotion()) { shownRef.current = target.slice(); draw(); return; }
    const from = shownRef.current.slice(), st = performance.now();
    const step = (now) => {
      if (playingRef.current) return;
      const p = Math.min(1, (now - st) / ms), e = 1 - Math.pow(1 - p, 3);
      shownRef.current = from.map((v, k) => v + (target[k] - v) * e); draw();
      if (p < 1) tweenRef.current = requestAnimationFrame(step);
    };
    tweenRef.current = requestAnimationFrame(step);
  }, [draw]);

  // Breathe: each axis glides to a random value between 3 and 10, out of sync.
  const stopPlaying = useCallback(() => {
    playingRef.current = false; setPlaying(false);
    cancelAnimationFrame(rafRef.current);
    shownRef.current = baseRef.current.slice(); setDisplay(baseRef.current.slice()); draw();
  }, [draw]);
  const startPlaying = useCallback(() => {
    playingRef.current = true; setPlaying(true);
    cancelAnimationFrame(tweenRef.current);
    let legs = null;
    const newLeg = (from, now) => ({ from, to: BREATH_MIN + Math.random() * (BREATH_MAX - BREATH_MIN), start: now, dur: 700 + Math.random() * 1100 });
    const tick = (ts) => {
      if (!playingRef.current) return;
      if (!legs) legs = shownRef.current.map((v) => newLeg(v, ts));
      shownRef.current = shownRef.current.map((v, k) => {
        const L = legs[k], p = (ts - L.start) / L.dur;
        if (p >= 1) { legs[k] = newLeg(L.to, ts); return L.to; }
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        return L.from + (L.to - L.from) * e;
      });
      setDisplay(shownRef.current.slice()); draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  const setValues = useCallback((vals, ms = 600) => {
    setBase(vals); baseRef.current = vals; setDisplay(vals);
    if (!playingRef.current) tween(vals, ms);
  }, [tween]);

  const applyPreset = useCallback((name) => {
    setPreset(name); setLabels(PRESETS[name].labels.slice()); labelsRef.current = PRESETS[name].labels.slice();
    setValues(PRESETS[name].values.slice(), 700);
  }, [setValues]);

  const onSlider = (k, v) => {
    const next = baseRef.current.slice(); next[k] = v;
    setBase(next); baseRef.current = next;
    if (!playingRef.current) { cancelAnimationFrame(tweenRef.current); shownRef.current = next.slice(); setDisplay(next); draw(); }
  };
  const onLabel = (k, text) => { const next = labels.slice(); next[k] = text; setLabels(next); };

  // Rotation: re-runs the warp setup at most once per frame.
  const rotate = useCallback((deg) => {
    const d = Math.max(-180, Math.min(180, Math.round(deg)));
    rotRef.current = d; setRotationState(d);
    if (rotRaf.current) return;
    rotRaf.current = requestAnimationFrame(() => { rotRaf.current = 0; warpRef.current.setRotation(rotRef.current); draw(); });
  }, [draw]);

  // Two-finger twist on the chart rotates the face.
  const onStageDown = (e) => {
    touchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touchRef.current.size === 2) {
      const [a, b] = [...touchRef.current.values()];
      twistRef.current = { a0: Math.atan2(b.y - a.y, b.x - a.x), r0: rotRef.current };
    }
  };
  const onStageMove = (e) => {
    if (!touchRef.current.has(e.pointerId)) return;
    touchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touchRef.current.size === 2 && twistRef.current) {
      const [a, b] = [...touchRef.current.values()], ang = Math.atan2(b.y - a.y, b.x - a.x);
      let deg = twistRef.current.r0 + ((ang - twistRef.current.a0) * 180) / Math.PI;
      deg = ((deg + 540) % 360) - 180;
      rotate(deg);
    }
  };
  const onStageUp = (e) => { touchRef.current.delete(e.pointerId); if (touchRef.current.size < 2) twistRef.current = null; };

  useImperativeHandle(ref, () => ({
    setFace(src) { rotRef.current = 0; setRotationState(0); setRotOpen(false); warpRef.current.setFace(src); draw(); },
    reset() { if (playingRef.current) stopPlaying(); applyPreset("ability"); },
    restart() { if (playingRef.current) stopPlaying(); applyPreset(preset); },
    stop() { if (playingRef.current) stopPlaying(); },
    snapshot() {
      draw();
      const face = document.createElement("canvas"); face.width = SNAP; face.height = SNAP;
      face.getContext("2d").drawImage(glRef.current, 0, 0, SNAP, SNAP);
      const chart = document.createElement("canvas"); chart.width = SNAP; chart.height = SNAP;
      drawOverlay(chart.getContext("2d"), sizeRef.current, SNAP / sizeRef.current, labelsRef.current, shownRef.current);
      return { face, chart, bg: themeColor("--bg") };
    },
    renderTiles(sets, T = 360) {
      if (!sizeRef.current || !warpRef.current?.ready) return [];
      const keep = shownRef.current, out = [], gl = glRef.current;
      for (const vals of sets) {
        shownRef.current = vals; warpRef.current.render(vals);
        const c = document.createElement("canvas"); c.width = T; c.height = T;
        const s = gl.width, m = s * 0.1;
        c.getContext("2d").drawImage(gl, m, m, s - 2 * m, s - 2 * m, 0, 0, T, T);
        out.push(c.toDataURL("image/png"));
      }
      shownRef.current = keep; draw();
      return out;
    },
  }), [applyPreset, draw, preset, stopPlaying]);

  return (
    <div className="wrap">
      <header>
        <h1>Fu Face <em>Radar</em></h1>
        <div className="presets" role="group" aria-label="Label preset">
          <button className="chip" aria-pressed={preset === "ability"} onClick={() => applyPreset("ability")}>abilities</button>
          <button className="chip" aria-pressed={preset === "vibe"} onClick={() => applyPreset("vibe")}>vibes</button>
        </div>
      </header>

      <div className="stage" ref={stageRef} onPointerDown={onStageDown} onPointerMove={onStageMove} onPointerUp={onStageUp} onPointerCancel={onStageUp}>
        <canvas ref={glRef} aria-hidden="true" />
        <canvas ref={ovRef} role="img" aria-label="Portrait stretched into a six-point radar shape" />
        <button className="chip rot-btn" aria-expanded={rotOpen} aria-controls="rotPanel" onClick={() => setRotOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>
          <span>{rotation === 0 ? "Rotate" : `${rotation}°`}</span>
        </button>
        {rotOpen && (
          <div className="rot-panel" id="rotPanel">
            <label className="ed-row" htmlFor="rotate"><span>Rotate</span>
              <input type="range" id="rotate" min="-180" max="180" step="1" value={rotation} onChange={(e) => rotate(+e.target.value)} />
            </label>
            <button className="chip" disabled={rotation === 0} onClick={() => rotate(0)}>0°</button>
          </div>
        )}
      </div>

      <div className="controls">
        {Array.from({ length: N }, (_, k) => (
          <div className="stat" key={k}>
            <input type="text" id={`lab${k}`} maxLength={14} aria-label={`Axis ${k + 1} name`} value={labels[k]} onChange={(e) => onLabel(k, e.target.value)} />
            <output htmlFor={`val${k}`}>{round1(display[k])}</output>
            <input type="range" id={`val${k}`} min="0" max="10" step="0.1" aria-label={`${labels[k] || `Axis ${k + 1}`} value`} value={display[k]} onChange={(e) => onSlider(k, +e.target.value)} />
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="act icon" ref={leaveBtnRef} aria-label="Back to upload" title="Back to upload" onClick={onLeave}>
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg>
        </button>
        <button className="act primary" onClick={() => (playing ? stopPlaying() : startPlaying())}>{playing ? "Pause" : "Breathe"}</button>
        <button className="act" onClick={() => setValues(baseRef.current.map(() => Math.round(Math.random() * 20) / 2))}>Shuffle</button>
        <button className="act" onClick={() => { const l = PRESETS[preset].labels.slice(); setLabels(l); labelsRef.current = l; setValues(Array(N).fill(0)); }}>Reset</button>
        <button className="act" onClick={onMakeImage}>Save</button>
      </div>
      <p className="note">{NOTES[preset]}</p>
    </div>
  );
}
