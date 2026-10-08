import { useEffect, useRef, useState } from "react";
import { EditorEngine } from "../lib/editorEngine.js";

export default function PhotoEditor({ image, onCancel, onDone }) {
  const canvasRef = useRef(null), engineRef = useRef(null), nextRef = useRef(null);
  const [s, setS] = useState({ step: "crop", cropZoom: 1, viewZoom: 1, canUndo: false, mode: "erase" });
  const [brush, setBrush] = useState(48);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const eng = (engineRef.current = new EditorEngine(canvasRef.current, image, setS));
    nextRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => { eng.destroy(); document.removeEventListener("keydown", onKey); };
  }, [image, onCancel]);

  const eng = () => engineRef.current;
  const crop = s.step === "crop";

  const auto = async () => {
    setBusy(true);
    try { await eng().autoRemove(setMsg); setMsg("Done. Use Erase or Restore to touch up the edges."); }
    catch { setMsg("Automatic removal didn't load. Check your connection and try again, or use the brush."); }
    finally { setBusy(false); }
  };

  return (
    <div className="editor" role="dialog" aria-modal="true" aria-labelledby="edTitle">
      <div className="ed-head">
        <h2 id="edTitle">{crop ? "Crop your photo" : "Remove the background"}</h2>
        <p>{crop ? "Drag to move and zoom until your face fills the circle." : "Try automatic first, then brush to fix edges. Pinch with two fingers to zoom in up to 400%."}</p>
      </div>
      <canvas ref={canvasRef} className={`ed-canvas${crop ? "" : " checker"}`} aria-label="Photo editor" />
      {crop ? (
        <div className="ed-controls">
          <label className="ed-row" htmlFor="zoom"><span>Zoom</span>
            <input type="range" id="zoom" min="1" max="4" step="0.01" value={s.cropZoom} onChange={(e) => eng().setCropZoom(+e.target.value)} />
          </label>
        </div>
      ) : (
        <div className="ed-controls">
          <button className="act" disabled={busy} onClick={auto}>Remove background automatically</button>
          <div className="ed-row">
            <div className="seg" role="group" aria-label="Brush mode">
              <button className="chip" aria-pressed={s.mode === "erase"} onClick={() => eng().setMode("erase")}>Erase</button>
              <button className="chip" aria-pressed={s.mode === "restore"} onClick={() => eng().setMode("restore")}>Restore</button>
            </div>
            <button className="chip" disabled={!s.canUndo} onClick={() => eng().undo()}>Undo</button>
            <button className="chip" onClick={() => eng().resetMask()}>Reset</button>
            <button className="chip" disabled={s.viewZoom === 1} aria-label={`Zoom ${Math.round(s.viewZoom * 100)}%, tap to reset to 100%`} onClick={() => eng().resetView()}>{Math.round(s.viewZoom * 100)}%</button>
          </div>
          <label className="ed-row" htmlFor="brush"><span>Brush</span>
            <input type="range" id="brush" min="10" max="140" step="1" value={brush} onChange={(e) => { setBrush(+e.target.value); eng().setBrush(+e.target.value); }} />
          </label>
          <p className="ed-msg" aria-live="polite">{msg}</p>
        </div>
      )}
      <div className="ed-actions">
        <button className="act" onClick={() => (crop ? onCancel() : (setMsg(""), eng().toCrop()))}>{crop ? "Cancel" : "Back"}</button>
        <button className="act primary" ref={nextRef} onClick={() => (crop ? (eng().toBackground(), eng().setBrush(brush)) : onDone(eng().result()))}>{crop ? "Next" : "Use this photo"}</button>
      </div>
    </div>
  );
}
