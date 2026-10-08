import { useRef } from "react";
import { useLang, useT } from "../i18n.js";

export default function Landing({ tiles, note, onFile, uploadRef, onToggleLang }) {
  const t = useT(), lang = useLang();
  const fileRef = useRef(null);
  const half = Math.ceil(tiles.length / 2);
  const rows = [tiles.slice(0, half), tiles.slice(half)].map((r) => (r.length ? r : tiles.slice(0, half)));
  return (
    <section className="landing" aria-labelledby="landTitle">
      <button className="lang-btn" onClick={onToggleLang} aria-label={t.langButton} title={t.langButton}>
        <span className={lang === "zh" ? "on" : ""} lang="zh-Hant">中</span><span aria-hidden="true">/</span><span className={lang === "en" ? "on" : ""} lang="en">A</span>
      </button>
      <div className="gallery" aria-hidden="true">
        {rows.map((list, r) => (
          <div className={`g-track${r ? " rev" : ""}`} key={r}>
            {[...list, ...list].map((src, i) => <img className="g-tile" src={src} alt="" decoding="async" key={i} />)}
          </div>
        ))}
      </div>
      <div className="land-text">
        <h1 id="landTitle">Fu Face <em>Radar</em></h1>
        <p>{t.landTagline}</p>
      </div>
      <div className="land-cta">
        <button className="act primary big" ref={uploadRef} onClick={() => { fileRef.current.value = ""; fileRef.current.click(); }}>{t.upload}</button>
        <p className="land-note" aria-live="polite">{note}</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </section>
  );
}
