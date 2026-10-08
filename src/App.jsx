import { useCallback, useRef, useState } from "react";
import RadarView from "./components/RadarView.jsx";
import Landing from "./components/Landing.jsx";
import PhotoEditor from "./components/PhotoEditor.jsx";
import ExportView from "./components/ExportView.jsx";
import LeaveDialog from "./components/LeaveDialog.jsx";
import { DEMO_TILE_SETS, GALLERY_IMAGES, asset } from "./config.js";

const DEFAULT_NOTE = "Your photo stays on your device.";

export default function App() {
  const radarRef = useRef(null), leaveBtnRef = useRef(null), uploadRef = useRef(null);
  const [screen, setScreen] = useState("landing"); // "landing" | "radar"
  const [editImage, setEditImage] = useState(null);
  const [snap, setSnap] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [tiles, setTiles] = useState(() => GALLERY_IMAGES.map(asset));
  const [note, setNote] = useState(DEFAULT_NOTE);

  const onDemoReady = useCallback(() => {
    if (GALLERY_IMAGES.length) return;
    requestAnimationFrame(() => setTiles(radarRef.current?.renderTiles(DEMO_TILE_SETS) ?? []));
  }, []);

  const onFile = (file) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { setNote(DEFAULT_NOTE); setEditImage(im); };
    im.onerror = () => { URL.revokeObjectURL(url); setNote("That file couldn't be opened. Try a JPG or PNG photo."); };
    im.src = url;
  };
  const closeEditor = useCallback(() => {
    setEditImage((im) => { if (im) URL.revokeObjectURL(im.src); return null; });
  }, []);
  const useEdited = (canvas) => {
    radarRef.current.setFace(canvas);
    radarRef.current.restart();
    closeEditor();
    setScreen("radar");
    requestAnimationFrame(() => leaveBtnRef.current?.focus());
  };

  const makeImage = (isLeaving = false) => { setLeaving(isLeaving); setSnap(radarRef.current.snapshot()); };
  const closeExport = () => { setSnap(null); setLeaving(false); };

  const goToLanding = useCallback(() => {
    radarRef.current.reset();
    setSnap(null); setLeaving(false); setLeaveOpen(false); setNote(DEFAULT_NOTE);
    setScreen("landing");
    requestAnimationFrame(() => uploadRef.current?.focus());
  }, []);
  const stay = useCallback(() => { setLeaveOpen(false); leaveBtnRef.current?.focus(); }, []);

  return (
    <div className="frame">
      <RadarView ref={radarRef} leaveBtnRef={leaveBtnRef} onDemoReady={onDemoReady} onLeave={() => setLeaveOpen(true)} onMakeImage={() => makeImage(false)} />
      {snap && <ExportView snap={snap} leaving={leaving} onClose={closeExport} onSaved={goToLanding} />}
      {screen === "landing" && <Landing tiles={tiles} note={note} onFile={onFile} uploadRef={uploadRef} />}
      {editImage && <PhotoEditor image={editImage} onCancel={closeEditor} onDone={useEdited} />}
      {leaveOpen && <LeaveDialog onStay={stay} onLeave={goToLanding} onSaveLeave={() => { setLeaveOpen(false); makeImage(true); }} />}
    </div>
  );
}
