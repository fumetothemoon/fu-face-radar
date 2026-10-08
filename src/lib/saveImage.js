// Phones: open the share sheet so the picture can go straight to Photos.
// Desktop: a normal file download.
export async function saveImage(blob, filename) {
  const file = new File([blob], filename, { type: "image/png" });
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return "shared"; }
    catch (err) { if (err && err.name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a"), url = URL.createObjectURL(blob);
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
