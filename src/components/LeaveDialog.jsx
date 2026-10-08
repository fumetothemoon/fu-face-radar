import { useEffect, useRef } from "react";
import { useT } from "../i18n.js";

export default function LeaveDialog({ onStay, onLeave, onSaveLeave }) {
  const t = useT();
  const stayRef = useRef(null);
  useEffect(() => {
    stayRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onStay(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onStay]);
  return (
    <div className="dlg-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onStay(); }}>
      <div className="dlg" role="alertdialog" aria-modal="true" aria-labelledby="leaveTitle" aria-describedby="leaveDesc">
        <h2 id="leaveTitle">{t.leaveTitle}</h2>
        <p id="leaveDesc">{t.leaveDesc}</p>
        <div className="dlg-actions">
          <button className="act primary" onClick={onSaveLeave}>{t.saveLeave}</button>
          <button className="act danger" onClick={onLeave}>{t.leaveAnyway}</button>
          <button className="act" ref={stayRef} onClick={onStay}>{t.stay}</button>
        </div>
      </div>
    </div>
  );
}
