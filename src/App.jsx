import { useCallback, useEffect, useRef, useState } from "react";
import { LangContext, STRINGS, initialLang, rememberLang } from "./i18n.js";
import { startAnalytics, track } from "./lib/analytics.js";
import RadarView from "./components/RadarView.jsx";
import Landing from "./components/Landing.jsx";
import PhotoEditor from "./components/PhotoEditor.jsx";
import ExportView from "./components/ExportView.jsx";
import LeaveDialog from "./components/LeaveDialog.jsx";
import { DEMO_TILE_SETS, GALLERY_IMAGES, asset } from "./config.js";


export default function App() {
  const radarRef = useRef(null), leaveBtnRef = useRef(null), uploadRef = useRef(null);
  const [lang, setLang] = useState(initialLang);
  useEffect(() => { document.documentElement.lang = lang === "zh" ? "zh-Hant-TW" : "en"; }, [lang]);
  const toggleLang = () => { const next = lang === "zh" ? "en" : "zh"; setLang(next); rememberLang(next); track(`language-${next}`, `Switched language to ${next}`); };
  // Visit count, plus which language the visitor started in.
  useEffect(() => { startAnalytics(); track(`opened-in-${initialLang()}`, `Opened in ${initialLang()}`); }, []);
  const [screen, setScreen] = useState("landing"); // "landing" | "radar"
  const [editImage, setEditImage] = useState(null);
  const [snap, setSnap] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [tiles, setTiles] = useState(() => GALLERY_IMAGES.map(asset));
  const [note, setNote] = useState("privacy"); // key into STRINGS

  const onDemoReady = useCallback(() => {
    if (GALLERY_IMAGES.length) return;
    requestAnimationFrame(() => setTiles(radarRef.current?.renderTiles(DEMO_TILE_SETS) ?? []));
  }, []);

  const onFile = (file) => {
    track("photo-uploaded", "Uploaded a photo");
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { setNote("privacy"); setEditImage(im); };
    im.onerror = () => { URL.revokeObjectURL(url); setNote("badFile"); };
    im.src = url;
  };
  const closeEditor = useCallback(() => {
    setEditImage((im) => { if (im) URL.revokeObjectURL(im.src); return null; });
  }, []);
  const useEdited = (canvas) => {
    track("photo-used", "Finished preparing a face");
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
    setSnap(null); setLeaving(false); setLeaveOpen(false); setNote("privacy");
    setScreen("landing");
    requestAnimationFrame(() => uploadRef.current?.focus());
  }, []);
  const stay = useCallback(() => { setLeaveOpen(false); leaveBtnRef.current?.focus(); }, []);

  return (
    <LangContext.Provider value={lang}>
    <div className="frame">
      <RadarView ref={radarRef} leaveBtnRef={leaveBtnRef} onDemoReady={onDemoReady} onLeave={() => setLeaveOpen(true)} onMakeImage={() => makeImage(false)} />
      {snap && <ExportView snap={snap} leaving={leaving} onClose={closeExport} onSaved={goToLanding} />}
      {screen === "landing" && <Landing tiles={tiles} note={STRINGS[lang][note]} onFile={onFile} uploadRef={uploadRef} onToggleLang={toggleLang} />}
      {editImage && <PhotoEditor image={editImage} onCancel={closeEditor} onDone={useEdited} />}
      {leaveOpen && <LeaveDialog onStay={stay} onLeave={goToLanding} onSaveLeave={() => { setLeaveOpen(false); makeImage(true); }} />}
    </div>
    </LangContext.Provider>
  );
}
