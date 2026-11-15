/* Offline support: the app and the King James text are stored on the phone on the first visit.
   Other versions are stored when you download them (Settings). Voxly timing files are kept as they are played. */
const SHELL = "scripture-shell-v14";
const FILES = ["./", "index.html", "styles.css", "app.js", "books.js", "study.js", "manifest.webmanifest", "data/versions.json", "data/KJV.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/EBGaramond-400.woff2", "fonts/EBGaramond-400i.woff2", "fonts/CormorantGaramond-500.woff2", "fonts/CormorantGaramond-500i.woff2"];

// Players ask for audio in byte ranges (seeking, and iPhones always do). A saved recording is answered from the
// phone with exactly the part asked for.
async function serveAudio(req) {
  const hit = await caches.match(req.url, { ignoreSearch: true, ignoreVary: true });
  if (!hit) return fetch(req);
  const range = req.headers.get("range");
  if (!range) return hit;
  const buf = await hit.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }  // "the last N bytes"
  if (start >= size) return new Response("", { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    "Content-Type": hit.headers.get("Content-Type") || "audio/mpeg", "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}

self.addEventListener("install", (e) => {
  // cache: "reload" skips the browser's own short-term cache, so an update always brings the newest files
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("scripture-shell-") && k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Audio: chapters saved for offline (Settings) play from the phone; others stream from the network.
  if (/\.(mp3|m4a|wav)$/.test(url.pathname)) { e.respondWith(serveAudio(req)); return; }
  if (url.pathname.includes("/audio/") && url.pathname.endsWith(".json")) {
    e.respondWith(fetch(req)
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open("scripture-audio").then((c) => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req).then((r) => r || new Response("", { status: 404 }))));
    return;
  }
  // Texts downloaded in Settings live in their own cache; the app checks it directly.
  // App files: from the phone first, refreshed in the background for next time.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((r) => {
      const isShell = url.pathname.endsWith("/") || FILES.some((f) => f !== "./" && url.pathname.endsWith("/" + f));
      if (r.ok && isShell) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
      return r;
    }).catch(() => hit || (req.mode === "navigate" ? caches.match("index.html") : new Response("", { status: 504 })));
    return hit || net;
  }));
});
