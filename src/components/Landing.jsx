import { useRef } from "react";

export default function Landing({ tiles, note, onFile, uploadRef }) {
  const fileRef = useRef(null);
  const half = Math.ceil(tiles.length / 2);
  const rows = [tiles.slice(0, half), tiles.slice(half)].map((r) => (r.length ? r : tiles.slice(0, half)));
  return (
    <section className="landing" aria-labelledby="landTitle">
      <div className="gallery" aria-hidden="true">
        {rows.map((list, r) => (
          <div className={`g-track${r ? " rev" : ""}`} key={r}>
            {[...list, ...list].map((src, i) => <img className="g-tile" src={src} alt="" decoding="async" key={i} />)}
          </div>
        ))}
      </div>
      <div className="land-text">
        <h1 id="landTitle">Fu Face <em>Radar</em></h1>
        <p>Track your ability and mood with your face. Upload a selfie and stretch it into a six-point radar of how you feel.</p>
      </div>
      <div className="land-cta">
        <button className="act primary big" ref={uploadRef} onClick={() => { fileRef.current.value = ""; fileRef.current.click(); }}>Upload your image</button>
        <p className="land-note" aria-live="polite">{note}</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </section>
  );
}
