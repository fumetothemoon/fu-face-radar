import { useEffect, useRef, useState } from "react";
import { EditorEngine } from "../lib/editorEngine.js";
import { useTouchLock } from "../lib/useTouchLock.js";
import { asset } from "../config.js";
import { useT } from "../i18n.js";

const TIPS_SEEN = "ffr-tips-seen";
const EXAMPLES = [
  { src: "hints/wrong-background.png", ok: false },
  { src: "hints/wrong-body.png", ok: false },
  { src: "hints/right-face.png", ok: true },
];

function Tips({ onClose, dontShow, setDontShow }) {
  const t = useT();
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <div className="tips-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tips" role="dialog" aria-modal="true" aria-labelledby="tipsTitle">
        <h3 id="tipsTitle">{t.tipsTitle}</h3>
        <p>{t.tipsBody}</p>
        <ul className="tips-grid">
          {EXAMPLES.map((ex, i) => (
            <li key={ex.src}>
              <div className="tip-img">
                <img src={asset(ex.src)} alt="" />
                <span className={`tip-mark ${ex.ok ? "ok" : "bad"}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    {ex.ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7L7 17" />}
                  </svg>
                </span>
              </div>
              <span className="tip-cap"><span className="sr-only">{ex.ok ? t.correct : t.wrong}</span>{t.tipCaptions[i]}</span>
            </li>
          ))}
        </ul>
        <label className="tips-check" htmlFor="tipsDontShow">
          <input type="checkbox" id="tipsDontShow" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          <span>{t.dontShow}</span>
        </label>
        <button className="act primary" ref={btn} onClick={onClose}>{t.gotIt}</button>
      </div>
    </div>
  );
}

export default function PhotoEditor({ image, onCancel, onDone }) {
  const t = useT();
  const canvasRef = useRef(null), engineRef = useRef(null), doneRef = useRef(null);
  useTouchLock(canvasRef);
  const [s, setS] = useState({ mode: "move", cropZoom: 1, viewZoom: 1, canUndo: false });
  const [brush, setBrush] = useState(48);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const optedOut = () => { try { return localStorage.getItem(TIPS_SEEN) === "1"; } catch { return false; } };
  const [tips, setTips] = useState(() => !optedOut());
  const [dontShow, setDontShow] = useState(optedOut);

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

  // Tips open every time this page opens, unless "Don't show again" was ticked.
  const closeTips = () => {
    setTips(false);
    try { if (dontShow) localStorage.setItem(TIPS_SEEN, "1"); else localStorage.removeItem(TIPS_SEEN); } catch { /* private mode */ }
  };
  const eng = () => engineRef.current;
  const move = s.mode === "move";

  const auto = async () => {
    setMsg(""); setBusy(t.autoLoading);
    const status = (key) => setBusy(key === "finding" ? t.autoFinding : t.autoLoadingFirst);
    try { await eng().autoRemove(status); setMsg(t.autoDone); }
    catch { setMsg(t.autoFail); }
    finally { setBusy(""); }
  };

  return (
    <div className="editor" role="dialog" aria-modal="true" aria-labelledby="edTitle">
      <div className="ed-head">
        <div className="ed-title-row">
          <h2 id="edTitle">{t.prepare}</h2>
          <button className="chip" onClick={() => setTips(true)} aria-haspopup="dialog">{t.tips}</button>
        </div>
        <p>{t.hints[s.mode]}</p>
      </div>
      <canvas ref={canvasRef} className={`ed-canvas checker${move ? " move" : ""}`} aria-label={t.editorAria} />
      <div className="ed-controls">
        <button className="act" onClick={auto} disabled={!!busy}>{t.autoRemove}</button>
        <div className="ed-row">
          <div className="seg" role="group" aria-label={t.toolGroup}>
            {["move", "erase", "restore"].map((m) => (
              <button key={m} className="chip" aria-pressed={s.mode === m} onClick={() => eng().setMode(m)}>{t.tools[m]}</button>
            ))}
          </div>
          <button className="chip" disabled={!s.canUndo} onClick={() => eng().undo()}>{t.undo}</button>
          <button className="chip" onClick={() => eng().resetMask()}>{t.resetMask}</button>
          {!move && (
            <button className="chip" disabled={s.viewZoom === 1} aria-label={t.zoomChip(Math.round(s.viewZoom * 100))} onClick={() => eng().resetView()}>{Math.round(s.viewZoom * 100)}%</button>
          )}
        </div>
        {move ? (
          <label className="ed-row" htmlFor="zoom"><span>{t.zoom}</span>
            <input type="range" id="zoom" min="1" max="4" step="0.01" value={s.cropZoom} onChange={(e) => eng().setCropZoom(+e.target.value)} />
          </label>
        ) : (
          <label className="ed-row" htmlFor="brush"><span>{t.brush}</span>
            <input type="range" id="brush" min="10" max="140" step="1" value={brush} onChange={(e) => { setBrush(+e.target.value); eng().setBrush(+e.target.value); }} />
          </label>
        )}
        <p className="ed-msg" aria-live="polite">{msg}</p>
      </div>
      <div className="ed-actions">
        <button className="act" onClick={onCancel}>{t.cancel}</button>
        <button className="act primary" ref={doneRef} onClick={() => onDone(eng().result())}>{t.usePhoto}</button>
      </div>
      {busy && (
        <div className="busy" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>{busy}</p>
        </div>
      )}
      {tips && <Tips onClose={closeTips} dontShow={dontShow} setDontShow={setDontShow} />}
    </div>
  );
}
