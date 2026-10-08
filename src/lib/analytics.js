// Visitor counting with GoatCounter (https://www.goatcounter.com): no cookies,
// no personal data, and photos are never sent anywhere. Set GOATCOUNTER_CODE
// in src/config.js to turn it on; while it's empty nothing loads.
import { GOATCOUNTER_CODE } from "../config.js";

const pending = [];
let started = false;

export function startAnalytics() {
  if (started || !GOATCOUNTER_CODE || import.meta.env.DEV) return;
  started = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  s.onload = flush;
  document.head.appendChild(s);
}

function flush() {
  const gc = window.goatcounter;
  if (!gc?.count) return;
  while (pending.length) gc.count(pending.shift());
}

// Counts an action, e.g. track("photo-uploaded"). Shows under "Events" in the dashboard.
export function track(name, title = name) {
  if (!GOATCOUNTER_CODE || import.meta.env.DEV) return;
  pending.push({ path: name, title, event: true });
  flush();
}
