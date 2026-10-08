import { useEffect, useMemo, useRef, useState } from "react";
import { saveImage } from "../lib/saveImage.js";

export default function ExportView({ snap, leaving, onClose, onSaved }) {
  const [withChart, setWithChart] = useState(true);
  const [msg, setMsg] = useState("");
  const blobRef = useRef(null), dlRef = useRef(null);

  const canvas = useMemo(() => {
    const S = snap.face.width, out = document.createElement("canvas"); out.width = S; out.height = S;
    const o = out.getContext("2d");
    if (withChart) { o.fillStyle = snap.bg; o.fillRect(0, 0, S, S); }
    o.drawImage(snap.face, 0, 0);
    if (withChart) o.drawImage(snap.chart, 0, 0);
    return out;
  }, [snap, withChart]);
  const url = useMemo(() => canvas.toDataURL("image/png"), [canvas]);

  useEffect(() => { blobRef.current = null; setMsg(""); canvas.toBlob((b) => { blobRef.current = b; }, "image/png"); }, [canvas]);
  useEffect(() => { dlRef.current?.focus(); }, []);

  const download = async () => {
    if (!blobRef.current) { setMsg("Still preparing the image. Try again in a second."); return; }
    const result = await saveImage(blobRef.current, withChart ? "fu-face-radar.png" : "fu-face.png");
    if (result === "cancelled") return;
    setMsg(result === "shared" ? "" : "Saved.");
    if (leaving) setTimeout(onSaved, 500);
  };

  return (
    <div className="export" role="dialog" aria-modal="true" aria-label="Save image">
      <img src={url} className={withChart ? "" : "bare"} alt={withChart ? "Warped portrait with radar labels and circles" : "Warped portrait on a transparent background"} />
      <label className="switch" htmlFor="showChart">
        <input type="checkbox" id="showChart" role="switch" checked={withChart} onChange={(e) => setWithChart(e.target.checked)} />
        <span className="track" aria-hidden="true" />
        <span>Show labels and circles</span>
      </label>
      <div className="export-actions">
        <button className="act primary" ref={dlRef} onClick={download}>{leaving ? "Download and leave" : "Download"}</button>
        <button className="act" onClick={onClose}>Back to radar</button>
      </div>
      <p aria-live="polite">{msg}</p>
    </div>
  );
}
