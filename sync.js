/* Sync between your devices: notes, highlights, bookmarks, threads and path progress.
   They are kept in one secret Gist on your own GitHub account. Each device holds a GitHub key that can only read
   and write Gists. Nothing else is sent anywhere. The newest change wins; deletions are carried across too. */
"use strict";

const SYNC_FILE = "scripture-notes.json";
const SYNC_DESC = "Scripture app: notes, highlights and threads (synced by the app)";
const syncState = Object.assign({ token: "", gistId: "", last: 0, error: "" }, store.get("sync", {}));
const saveSync = () => store.set("sync", syncState);
let syncing = null, syncTimer = null;

async function gh(path, opts = {}) {
  const r = await fetch("https://api.github.com" + path, { ...opts, headers: {
    Authorization: "Bearer " + syncState.token, Accept: "application/vnd.github+json", "Content-Type": "application/json", ...(opts.headers || {}) } });
  if (r.status === 401 || r.status === 403) throw new Error("key");
  if (!r.ok) throw new Error("http " + r.status);
  return r.status === 204 ? null : r.json();
}

// Combine two copies: for each note, thread, highlight and bookmark the newest version wins, and anything deleted
// after it was last changed stays deleted.
function mergeAnnotations(L, R) {
  const out = { hl: {}, hlT: {}, bm: {}, notes: [], threads: [], pathRead: {}, tomb: {} };
  for (const src of [L.tomb || {}, R.tomb || {}]) for (const [k, t] of Object.entries(src)) out.tomb[k] = Math.max(out.tomb[k] || 0, t);
  const dead = (key, t) => (out.tomb[key] || 0) > (t || 0);
  const hlKeys = new Set([...Object.keys(L.hl || {}), ...Object.keys(R.hl || {})]);
  for (const k of hlKeys) {
    const lt = (L.hlT || {})[k] || 0, rt = (R.hlT || {})[k] || 0, l = (L.hl || {})[k], r = (R.hl || {})[k];
    const [col, t] = r && (!l || rt > lt) ? [r, rt] : [l, lt];
    if (col && !dead("hl:" + k, t)) { out.hl[k] = col; if (t) out.hlT[k] = t; }
  }
  for (const src of [L.bm || {}, R.bm || {}]) for (const [k, t] of Object.entries(src)) if (!dead("bm:" + k, t)) out.bm[k] = Math.max(out.bm[k] || 0, t);
  const byId = (a, b, kind) => {
    const m = new Map();
    for (const x of [...(a || []), ...(b || [])]) { const cur = m.get(x.id); if (!cur || (x.updated || 0) > (cur.updated || 0)) m.set(x.id, x); }
    return [...m.values()].filter((x) => !dead(kind + ":" + x.id, x.updated)).sort((x, y) => (y.updated || 0) - (x.updated || 0));
  };
  out.notes = byId(L.notes, R.notes, "note");
  out.threads = byId(L.threads, R.threads, "thread");
  for (const src of [L.pathRead || {}, R.pathRead || {}]) for (const [k, v] of Object.entries(src)) out.pathRead[k] = [...new Set([...(out.pathRead[k] || []), ...v])].sort((x, y) => x - y);
  return out;
}

async function syncNow(quiet = true) {
  if (!syncState.token || !navigator.onLine) return;
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      if (!syncState.gistId) { // find the notes Gist made from another device, or start one
        const list = await gh("/gists?per_page=100");
        const found = list.find((g) => g.description === SYNC_DESC && g.files[SYNC_FILE]);
        if (found) syncState.gistId = found.id;
      }
      let remote = { hl: {}, bm: {}, notes: [], threads: [] }, remoteText = "";
      if (syncState.gistId) {
        const g = await gh("/gists/" + syncState.gistId);
        const f = g.files[SYNC_FILE];
        remoteText = f ? (f.truncated ? await (await fetch(f.raw_url)).text() : f.content) : "";
        try { remote = JSON.parse(remoteText).annotations || remote; } catch {}
      }
      const merged = mergeAnnotations(A, remote);
      const before = JSON.stringify(A);
      Object.assign(A, merged);
      store.set("annotations", A);                        // not saveA(): that would start another sync
      const text = JSON.stringify({ app: "Scripture", synced: new Date().toISOString(), annotations: merged });
      const changedRemote = JSON.stringify(merged) !== JSON.stringify(mergeAnnotations(remote, remote));
      if (!syncState.gistId) {
        const g = await gh("/gists", { method: "POST", body: JSON.stringify({ description: SYNC_DESC, public: false, files: { [SYNC_FILE]: { content: text } } }) });
        syncState.gistId = g.id;
      } else if (changedRemote) {
        await gh("/gists/" + syncState.gistId, { method: "PATCH", body: JSON.stringify({ files: { [SYNC_FILE]: { content: text } } }) });
      }
      syncState.last = Date.now(); syncState.error = ""; saveSync();
      if (JSON.stringify(A) !== before) refreshViews();
      if (!quiet) toast("Synced");
    } catch (e) {
      syncState.error = e.message === "key" ? "GitHub did not accept the key. It may have expired: make a new one and connect again." : "Could not reach GitHub just now; it will try again.";
      saveSync(); if (!quiet) toast(syncState.error);
    } finally { syncing = null; renderSync(); }
  })();
  return syncing;
}
function refreshViews() {
  if (currentView === "read") render();
  else if (currentView === "notes") renderNotes();
  else if (currentView === "study" && window.Study) Study.show();
}
// Sync a few seconds after any change, when the app is opened again, and when the connection returns.
window.onAnnotationsChanged = () => { if (!syncState.token) return; clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 4000); };
document.addEventListener("visibilitychange", () => { if (!document.hidden) syncNow(); else if (syncTimer) { clearTimeout(syncTimer); syncNow(); } });
addEventListener("online", () => syncNow());

// ---- Settings → Sync between devices
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : new Date(t).toLocaleDateString(); };
function renderSync() {
  const on = !!syncState.token, el = (id) => document.getElementById(id);
  if (!el("syncBox")) return;
  el("syncOff").hidden = on; el("syncOn").hidden = !on;
  el("syncStatus").textContent = syncState.error || (syncState.last ? `On ✓ · last synced ${ago(syncState.last)}` : "On ✓ · syncing…");
  el("syncStatus").className = "hint " + (syncState.error ? "warn" : "ok");
}
document.getElementById("syncConnect").onclick = async () => {
  const t = document.getElementById("syncToken").value.trim();
  if (!/^(gh[pousr]_|github_pat_)\w{20,}/.test(t)) { toast("That does not look like a GitHub key. It starts with ghp_ or github_pat_"); return; }
  syncState.token = t; syncState.gistId = ""; syncState.error = ""; saveSync();
  document.getElementById("syncToken").value = "";
  await syncNow(false);
};
document.getElementById("syncNowBtn").onclick = () => syncNow(false);
document.getElementById("syncOffBtn").onclick = () => {
  syncState.token = ""; syncState.gistId = ""; syncState.last = 0; syncState.error = ""; saveSync(); renderSync();
  toast("Sync is off on this device. Your notes stay here and in your Gist.");
};
renderSync();
setTimeout(syncNow, 1500);
