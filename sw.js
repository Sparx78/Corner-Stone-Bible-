/* Offline support: the app and the King James text are stored on the phone on the first visit.
   Other versions are stored when you download them (Settings). Voxly timing files are kept as they are played. */
const SHELL = "scripture-shell-v3";
const FILES = ["./", "index.html", "styles.css", "app.js", "study.js", "manifest.webmanifest", "data/versions.json", "data/KJV.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/EBGaramond-400.woff2", "fonts/EBGaramond-400i.woff2", "fonts/CormorantGaramond-500.woff2", "fonts/CormorantGaramond-500i.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
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
  // Audio streams straight from the network (the browser needs range requests).
  if (/\.(mp3|m4a|wav)$/.test(url.pathname)) return;
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
