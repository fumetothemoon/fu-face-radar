import { useEffect, useRef } from "react";

export default function LeaveDialog({ onStay, onLeave, onSaveLeave }) {
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
        <h2 id="leaveTitle">Leave current session without saving?</h2>
        <p id="leaveDesc">Your stretched face and slider values will be lost.</p>
        <div className="dlg-actions">
          <button className="act primary" onClick={onSaveLeave}>Save and leave</button>
          <button className="act danger" onClick={onLeave}>Leave anyway</button>
          <button className="act" ref={stayRef} onClick={onStay}>Stay</button>
        </div>
      </div>
    </div>
  );
}
