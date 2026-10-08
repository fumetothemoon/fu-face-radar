import { useEffect, useRef, useState } from "react";
import { EditorEngine } from "../lib/editorEngine.js";
import { useTouchLock } from "../lib/useTouchLock.js";
import { asset } from "../config.js";

const TIPS_SEEN = "ffr-tips-seen";
const HINTS = {
  move: "Drag and pinch to fit your face inside the guide.",
  erase: "Paint over anything that isn't your face. Pinch to zoom in up to 400%.",
  restore: "Paint to bring parts back. Pinch to zoom in up to 400%.",
};
const EXAMPLES = [
  { src: "hints/wrong-background.png", ok: false, caption: "Body left in" },
  { src: "hints/wrong-body.png", ok: false, caption: "Face not centered" },
  { src: "hints/right-face.png", ok: true, caption: "Just the face, centered" },
];

function Tips({ onClose }) {
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <div className="tips-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tips" role="dialog" aria-modal="true" aria-labelledby="tipsTitle">
        <h3 id="tipsTitle">Leave only your face</h3>
        <p>Remove everything except your face, and keep it centered inside the guide. Hair, shoulders and background stretch into messy spikes.</p>
        <ul className="tips-grid">
          {EXAMPLES.map((ex) => (
            <li key={ex.src}>
              <div className="tip-img">
                <img src={asset(ex.src)} alt="" />
                <span className={`tip-mark ${ex.ok ? "ok" : "bad"}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    {ex.ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7L7 17" />}
                  </svg>
                </span>
              </div>
              <span className="tip-cap"><span className="sr-only">{ex.ok ? "Correct: " : "Wrong: "}</span>{ex.caption}</span>
            </li>
          ))}
        </ul>
        <button className="act primary" ref={btn} onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

export default function PhotoEditor({ image, onCancel, onDone }) {
  const canvasRef = useRef(null), engineRef = useRef(null), doneRef = useRef(null);
  useTouchLock(canvasRef);
  const [s, setS] = useState({ mode: "move", cropZoom: 1, viewZoom: 1, canUndo: false });
  const [brush, setBrush] = useState(48);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [tips, setTips] = useState(() => { try { return !localStorage.getItem(TIPS_SEEN); } catch { return true; } });

  useEffect(() => {
    const eng = (engineRef.current = new EditorEngine(canvasRef.current, image, setS));
    return () => eng.destroy();
  }, [image]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") (tips ? closeTips() : onCancel()); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  useEffect(() => { if (!tips) doneRef.current?.focus(); }, [tips]);

  const closeTips = () => { setTips(false); try { localStorage.setItem(TIPS_SEEN, "1"); } catch { /* private mode */ } };
  const eng = () => engineRef.current;
  const move = s.mode === "move";

  const auto = async () => {
    setMsg(""); setBusy("Loading the background remover…");
    try { await eng().autoRemove(setBusy); setMsg("Done. Switch to Erase or Restore to touch up the edges."); }
    catch { setMsg("Automatic removal didn't load. Check your connection and try again, or use Erase."); }
    finally { setBusy(""); }
  };

  return (
    <div className="editor" role="dialog" aria-modal="true" aria-labelledby="edTitle">
      <div className="ed-head">
        <div className="ed-title-row">
          <h2 id="edTitle">Prepare your face</h2>
          <button className="chip" onClick={() => setTips(true)} aria-haspopup="dialog">Tips</button>
        </div>
        <p>{HINTS[s.mode]}</p>
      </div>
      <canvas ref={canvasRef} className={`ed-canvas checker${move ? " move" : ""}`} aria-label="Photo editor with face guide" />
      <div className="ed-controls">
        <button className="act" onClick={auto} disabled={!!busy}>Remove background automatically</button>
        <div className="ed-row">
          <div className="seg" role="group" aria-label="Tool">
            {["move", "erase", "restore"].map((m) => (
              <button key={m} className="chip" aria-pressed={s.mode === m} onClick={() => eng().setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>
            ))}
          </div>
          <button className="chip" disabled={!s.canUndo} onClick={() => eng().undo()}>Undo</button>
          <button className="chip" onClick={() => eng().resetMask()}>Reset</button>
          {!move && (
            <button className="chip" disabled={s.viewZoom === 1} aria-label={`Zoom ${Math.round(s.viewZoom * 100)}%, tap to reset to 100%`} onClick={() => eng().resetView()}>{Math.round(s.viewZoom * 100)}%</button>
          )}
        </div>
        {move ? (
          <label className="ed-row" htmlFor="zoom"><span>Zoom</span>
            <input type="range" id="zoom" min="1" max="4" step="0.01" value={s.cropZoom} onChange={(e) => eng().setCropZoom(+e.target.value)} />
          </label>
        ) : (
          <label className="ed-row" htmlFor="brush"><span>Brush</span>
            <input type="range" id="brush" min="10" max="140" step="1" value={brush} onChange={(e) => { setBrush(+e.target.value); eng().setBrush(+e.target.value); }} />
          </label>
        )}
        <p className="ed-msg" aria-live="polite">{msg}</p>
      </div>
      <div className="ed-actions">
        <button className="act" onClick={onCancel}>Cancel</button>
        <button className="act primary" ref={doneRef} onClick={() => onDone(eng().result())}>Use this photo</button>
      </div>
      {busy && (
        <div className="busy" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>{busy}</p>
        </div>
      )}
      {tips && <Tips onClose={closeTips} />}
    </div>
  );
}
