/* Scripture — read, listen and take notes. No build step, no accounts, works offline. */
"use strict";

// ------------------------------------------------------------------ books
const BOOKS = [
  ["Genesis", "gen ge gn"], ["Exodus", "exo ex exod"], ["Leviticus", "lev le lv"], ["Numbers", "num nu nm nb"],
  ["Deuteronomy", "deut de dt deu"], ["Joshua", "josh jos jsh"], ["Judges", "judg jdg jg jdgs"], ["Ruth", "ruth rth ru"],
  ["1 Samuel", "1sam 1sa 1sm 1s"], ["2 Samuel", "2sam 2sa 2sm 2s"], ["1 Kings", "1kgs 1ki 1kin 1k"], ["2 Kings", "2kgs 2ki 2kin 2k"],
  ["1 Chronicles", "1chr 1ch 1chron"], ["2 Chronicles", "2chr 2ch 2chron"], ["Ezra", "ezra ezr"], ["Nehemiah", "neh ne"],
  ["Esther", "esth est es"], ["Job", "job jb"], ["Psalms", "ps psa psalm pss psm"], ["Proverbs", "prov pro prv pr"],
  ["Ecclesiastes", "eccl ecc ec qoh"], ["Song of Solomon", "song sos so canticles songofsongs"], ["Isaiah", "isa is"],
  ["Jeremiah", "jer je jr"], ["Lamentations", "lam la"], ["Ezekiel", "ezek eze ezk"], ["Daniel", "dan da dn"],
  ["Hosea", "hos ho"], ["Joel", "joel jl"], ["Amos", "amos am"], ["Obadiah", "obad ob"], ["Jonah", "jonah jnh jon"],
  ["Micah", "mic mc"], ["Nahum", "nah na"], ["Habakkuk", "hab hb"], ["Zephaniah", "zeph zep zp"], ["Haggai", "hag hg"],
  ["Zechariah", "zech zec zc"], ["Malachi", "mal ml"],
  ["Matthew", "matt mt mat"], ["Mark", "mark mk mar mrk"], ["Luke", "luke lk luk"], ["John", "john jn jhn joh"],
  ["Acts", "acts ac act"], ["Romans", "rom ro rm"], ["1 Corinthians", "1cor 1co"], ["2 Corinthians", "2cor 2co"],
  ["Galatians", "gal ga"], ["Ephesians", "eph ephes"], ["Philippians", "phil php pp"], ["Colossians", "col co"],
  ["1 Thessalonians", "1thess 1th 1thes"], ["2 Thessalonians", "2thess 2th 2thes"], ["1 Timothy", "1tim 1ti 1tm"],
  ["2 Timothy", "2tim 2ti 2tm"], ["Titus", "titus tit ti"], ["Philemon", "philem phm pm"], ["Hebrews", "heb he"],
  ["James", "jas jm ja"], ["1 Peter", "1pet 1pe 1pt 1p"], ["2 Peter", "2pet 2pe 2pt 2p"], ["1 John", "1john 1jn 1jo 1j"],
  ["2 John", "2john 2jn 2jo 2j"], ["3 John", "3john 3jn 3jo 3j"], ["Jude", "jude jud jd"], ["Revelation", "rev re rv revelations"],
];
const NT_START = 39;
// The book titles as printed in the King James Bible, shown at the head of each book.
const KJV_TITLES = [
  "The First Book of Moses, called Genesis", "The Second Book of Moses, called Exodus", "The Third Book of Moses, called Leviticus",
  "The Fourth Book of Moses, called Numbers", "The Fifth Book of Moses, called Deuteronomy", "The Book of Joshua", "The Book of Judges",
  "The Book of Ruth", "The First Book of Samuel, otherwise called the First Book of the Kings",
  "The Second Book of Samuel, otherwise called the Second Book of the Kings", "The First Book of the Kings, commonly called the Third Book of the Kings",
  "The Second Book of the Kings, commonly called the Fourth Book of the Kings", "The First Book of the Chronicles", "The Second Book of the Chronicles",
  "The Book of Ezra", "The Book of Nehemiah", "The Book of Esther", "The Book of Job", "The Book of Psalms", "The Proverbs",
  "Ecclesiastes; or, the Preacher", "The Song of Solomon", "The Book of the Prophet Isaiah", "The Book of the Prophet Jeremiah",
  "The Lamentations of Jeremiah", "The Book of the Prophet Ezekiel", "The Book of Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah",
  "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "The Gospel according to Saint Matthew", "The Gospel according to Saint Mark", "The Gospel according to Saint Luke",
  "The Gospel according to Saint John", "The Acts of the Apostles", "The Epistle of Paul the Apostle to the Romans",
  "The First Epistle of Paul the Apostle to the Corinthians", "The Second Epistle of Paul the Apostle to the Corinthians",
  "The Epistle of Paul the Apostle to the Galatians", "The Epistle of Paul the Apostle to the Ephesians",
  "The Epistle of Paul the Apostle to the Philippians", "The Epistle of Paul the Apostle to the Colossians",
  "The First Epistle of Paul the Apostle to the Thessalonians", "The Second Epistle of Paul the Apostle to the Thessalonians",
  "The First Epistle of Paul the Apostle to Timothy", "The Second Epistle of Paul the Apostle to Timothy", "The Epistle of Paul to Titus",
  "The Epistle of Paul to Philemon", "The Epistle of Paul the Apostle to the Hebrews", "The General Epistle of James",
  "The First Epistle General of Peter", "The Second Epistle General of Peter", "The First Epistle General of John",
  "The Second Epistle of John", "The Third Epistle of John", "The General Epistle of Jude", "The Revelation of Saint John the Divine",
].map((t, i, all) => (all.length === 66 && t.replace(/^The /, "") !== BOOKS[i][0] ? t : null));
const bookName = (b) => BOOKS[b][0];
const refLabel = (r) => r ? `${bookName(r.b)} ${r.c + 1}${r.v != null ? ":" + (r.v + 1) : ""}` : "Journal";
const refKey = (b, c, v) => `${b}.${c}.${v}`;

// ------------------------------------------------------------------ storage (every access guarded: private mode can throw)
const store = {
  get(k, d) { try { const v = localStorage.getItem("scripture." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("scripture." + k, JSON.stringify(v)); } catch { toast("Could not save on this phone"); } },
};
const DEFAULTS = {
  version: "KJV", parallel: "", theme: "auto", font: "garamond", fontSize: 20, lineH: 1.7, showNums: true, paraMode: false,
  audioSource: "auto", voxlyBase: "audio/", voice: "", rate: 1, autoNext: true, followAudio: true,
  redLetters: false, italics: false, showXrefs: true, voxlyVoice: "bf_emma",
};
const S = Object.assign({}, DEFAULTS, store.get("settings", {}));
const saveSettings = () => store.set("settings", S);
let pos = store.get("pos", { b: 0, c: 0 });
// annotations: highlights {key: colour}, bookmarks {key: time}, notes [{id, ref|null, title, body, tags, created, updated}]
const A = Object.assign({ hl: {}, bm: {}, notes: [], threads: [] }, store.get("annotations", {}));
const saveA = () => store.set("annotations", A);

// ------------------------------------------------------------------ helpers
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2200);
}
const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// ------------------------------------------------------------------ texts
let VERSIONS = [];
const bibles = {};
async function loadVersions() {
  try { VERSIONS = await (await fetch("data/versions.json")).json(); }
  catch { VERSIONS = [{ id: "KJV", name: "King James Version", builtin: true, year: "1611/1769", description: "" }]; }
}
const verInfo = (id) => VERSIONS.find((v) => v.id === id) || { id, name: id };
async function isDownloaded(id) {
  if (bibles[id]) return true;
  try { return !!(await caches.match(`data/${id}.json`)); } catch { return false; }
}
async function getBible(id) {
  if (bibles[id]) return bibles[id];
  const res = await fetch(`data/${id}.json`);
  if (!res.ok) throw new Error("Not available");
  const data = await res.json();
  try { (await caches.open("scripture-texts")).put(`data/${id}.json`, new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })); } catch {}
  bibles[id] = data;
  return data;
}
const chapterCount = (b) => (bibles.KJV || bibles[S.version]).books[b].length;

// ------------------------------------------------------------------ reader
const reader = $("#reader");
let selected = null; // {b,c,v}

async function render(scrollToVerse) {
  let bible;
  try { bible = await getBible(S.version); }
  catch { S.version = "KJV"; saveSettings(); bible = await getBible("KJV"); toast("That version is not downloaded yet"); }
  const par = S.parallel && S.parallel !== S.version ? await getBible(S.parallel).catch(() => null) : null;
  const { b, c } = pos;
  if (c >= bible.books[b].length) pos.c = 0;
  const verses = bible.books[b][pos.c] || [];
  // Red letters and the translators' added words come from the study layer (KJV only).
  const rich = S.version === "KJV" && (S.redLetters || S.italics) && window.Study ? await Study.rich().catch(() => null) : null;
  const parVerses = par ? par.books[b][pos.c] || [] : null;
  const noteRefs = new Set(A.notes.filter((n) => n.ref).map((n) => refKey(n.ref.b, n.ref.c, n.ref.v)));
  const ico = (p) => `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${p}"/></svg>`;
  const star = `<svg aria-hidden="true" viewBox="0 0 64 64"><path d="M32 0l4.2 23.4L60 32l-23.8 8.6L32 64l-4.2-23.4L4 32l23.8-8.6z"/></svg>`;
  let html = `<header class="chapter-head">
    <button class="book-title" data-bookinfo="${b}" aria-label="About the book of ${esc(bookName(b))}">${esc(bookName(b))}</button>
    ${pos.c === 0 && KJV_TITLES[b] ? `<p class="book-sub">${esc(KJV_TITLES[b])}</p>` : ""}
    <h1 aria-label="${esc(bookName(b))} chapter ${pos.c + 1}">${pos.c + 1}</h1>
    <div class="ornament">${star}</div>
    <div class="ver-label">${esc(verInfo(S.version).name)}${par ? " · " + esc(par.id) : ""}</div></header>
    ${bible.titles && bible.titles[b] && bible.titles[b][pos.c] ? `<p class="ps-title">${esc(bible.titles[b][pos.c])}</p>` : ""}
    <div class="verses${S.paraMode && !par ? " para" : ""}">`;
  verses.forEach((t, i) => {
    const k = refKey(b, pos.c, i);
    const cls = ["v"]; if (A.hl[k]) cls.push("hl-" + A.hl[k]);
    let text = rich ? rich(b, pos.c, i) : esc(t);
    const m = i === 0 && !par && !rich && t.match(/^([^A-Za-z]*)([A-Za-z])/);
    if (m) { cls.push("first"); text = `${esc(m[1])}<span class="dropcap" aria-hidden="true">${m[2]}</span>${esc(t.slice(m[0].length))}`; }
    html += `<span class="${cls.join(" ")}" data-v="${i}" role="button" tabindex="0" aria-label="Verse ${i + 1}. ${esc(t)}"><span class="n" aria-hidden="true">${i + 1}</span>${text}` +
      (noteRefs.has(k) ? `<span class="note-mark" aria-label="has note">${ico("M4 20h4L19 9l-4-4L4 16z")}</span>` : "") +
      (A.bm[k] ? `<span class="bm-mark" aria-label="bookmarked">${ico("M6 3h12v18l-6-4-6 4z")}</span>` : "") +
      (parVerses && parVerses[i] ? `<span class="par-text"><b>${esc(par.id)}</b>${esc(parVerses[i])}</span>` : "") +
      `</span>${S.paraMode && !par ? " " : ""}`;
  });
  html += "</div>";
  reader.innerHTML = html;
  reader.classList.toggle("no-nums", !S.showNums);
  $("#refText").textContent = `${bookName(b)} ${pos.c + 1}`;
  $("#verText").textContent = S.version + (par ? "+" + par.id : "");
  document.title = `${bookName(b)} ${pos.c + 1} · Scripture`;
  const prev = neighbour(-1), next = neighbour(1);
  $("#prevCh").disabled = !prev; $("#nextCh").disabled = !next;
  $("#prevLabel").textContent = prev ? `${shortName(prev.b)} ${prev.c + 1}` : "";
  $("#nextLabel").textContent = next ? `${shortName(next.b)} ${next.c + 1}` : "";
  store.set("pos", pos);
  $(".topbar").classList.remove("hide");
  if (scrollToVerse != null) {
    const el = reader.querySelector(`[data-v="${scrollToVerse}"]`);
    if (el) { el.classList.add("selected"); requestAnimationFrame(() => el.scrollIntoView({ block: "center" })); setTimeout(() => el.classList.remove("selected"), 1800); }
  } else window.scrollTo(0, 0);
  if (player.active && !player.advancing && !player.queue && (player.b !== b || player.c !== pos.c)) {
    if (player.playing) player.start(b, pos.c, 0); else { player.stopAt = null; player.load(b, pos.c); }   // the voice follows the chapter you open
  }
  else if (player.active) markReading(player.verse);
}
const shortName = (b) => bookName(b).replace("Song of Solomon", "Song").replace("Thessalonians", "Thess").replace("Corinthians", "Cor")
  .replace("Lamentations", "Lam").replace("Deuteronomy", "Deut").replace("Ecclesiastes", "Eccl").replace("Revelation", "Rev");
function neighbour(d, p = pos) {
  let { b, c } = p; c += d;
  if (c < 0) { b--; if (b < 0) return null; c = chapterCount(b) - 1; }
  else if (c >= chapterCount(b)) { b++; c = 0; if (b >= BOOKS.length) return null; }
  return { b, c };
}
function goTo(b, c, v) { pos = { b, c }; render(v); }
function step(d) { const n = neighbour(d); if (n) goTo(n.b, n.c); }

reader.addEventListener("click", (e) => {
  const info = e.target.closest("[data-bookinfo]"); if (info) { Study.open({ type: "book", b: +info.dataset.bookinfo }); return; }
  const el = e.target.closest(".v"); if (!el) return;
  openVerse(+el.dataset.v);
});
reader.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("v")) { e.preventDefault(); openVerse(+e.target.dataset.v); }
});
$("#prevCh").onclick = () => step(-1);
$("#nextCh").onclick = () => step(1);

// swipe between chapters
let touch = null;
reader.addEventListener("touchstart", (e) => { if (e.touches.length === 1) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; }, { passive: true });
reader.addEventListener("touchend", (e) => {
  if (!touch) return; const t = e.changedTouches[0]; const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  if (Math.abs(dx) > 80 && Math.abs(dy) < 50 && Date.now() - touch.t < 600) step(dx < 0 ? 1 : -1);
  touch = null;
}, { passive: true });
// hide the top bar while reading downwards
let lastY = 0, autoScrollAt = 0;
window.addEventListener("scroll", () => {
  const y = window.scrollY; const top = $(".topbar");
  if (currentView === "read" && Date.now() - autoScrollAt > 1200) top.classList.toggle("hide", y > lastY && y > 120);
  lastY = y;
}, { passive: true });

// ------------------------------------------------------------------ views
let currentView = "read";
function showView(v) {
  if (v === "listen") { player.toggleFromTab(); return; }
  currentView = v;
  $$(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + v));
  $$(".tab").forEach((t) => { const on = t.dataset.view === v; t.classList.toggle("active", on); on ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current"); });
  $(".topbar").classList.remove("hide");
  window.scrollTo(0, 0);
  if (v === "notes") renderNotes();
  if (v === "study") Study.show();
  if (v === "more") renderSettings();
  if (v === "search") setTimeout(() => $("#searchInput").focus(), 50);
}
$$(".tab").forEach((t) => (t.onclick = () => showView(t.dataset.view)));
$("#searchBtn").onclick = () => showView(currentView === "search" ? "read" : "search");

// ------------------------------------------------------------------ sheets
let openSheetEl = null, lastFocus = null;
function openSheet(id) {
  closeSheet(true);
  lastFocus = document.activeElement;
  openSheetEl = $("#" + id); openSheetEl.hidden = false; $("#scrim").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => (openSheetEl.querySelector("[data-close], button") || openSheetEl).focus(), 60);
}
function closeSheet(silent) {
  if (!openSheetEl) return;
  openSheetEl.hidden = true; $("#scrim").hidden = true; document.body.style.overflow = "";
  if (openSheetEl.id === "sheet-verse") $$(".v.selected").forEach((e) => e.classList.remove("selected"));
  if (openSheetEl.id === "sheet-note") store.set("draft", null);
  openSheetEl = null;
  if (!silent && lastFocus) lastFocus.focus();
}
$("#scrim").onclick = () => closeSheet();
$$("[data-close]").forEach((b) => (b.onclick = () => closeSheet()));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSheet();
  // On a computer: the arrow keys turn the chapter while reading (not while typing or with a sheet open)
  if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && currentView === "read" && !openSheetEl && !e.target.closest("input, textarea, select") && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1);
  }
});
// drag a sheet down by its grabber to close it
$$(".sheet").forEach((sh) => {
  let y0 = null;
  sh.addEventListener("touchstart", (e) => { if (sh.scrollTop <= 0 && e.target.closest(".grabber, .sheet-head")) y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener("touchmove", (e) => { if (y0 != null) { const d = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${d}px)`; } }, { passive: true });
  sh.addEventListener("touchend", (e) => { if (y0 != null) { const d = e.changedTouches[0].clientY - y0; sh.style.transform = ""; y0 = null; if (d > 90) closeSheet(); } });
});

// book & chapter picker
let pickTest = "ot";
function renderBookGrid() {
  $("#refTitle").textContent = "Choose a book";
  $$("#sheet-ref .seg button").forEach((b) => b.setAttribute("aria-selected", b.dataset.test === pickTest));
  const range = pickTest === "ot" ? [0, NT_START] : [NT_START, BOOKS.length];
  let h = "";
  for (let i = range[0]; i < range[1]; i++) h += `<button data-b="${i}" class="${i === pos.b ? "current" : ""}">${esc(bookName(i))}</button>`;
  $("#bookGrid").innerHTML = h; $("#bookGrid").hidden = false; $("#chapterGrid").hidden = true; $("#sheet-ref .seg").hidden = false;
}
function renderChapterGrid(b) {
  $("#refTitle").textContent = bookName(b);
  let h = `<button class="back" data-back>‹ All books</button>`;
  for (let c = 0; c < chapterCount(b); c++) h += `<button data-c="${c}" class="${b === pos.b && c === pos.c ? "current" : ""}" aria-label="Chapter ${c + 1}">${c + 1}</button>`;
  const g = $("#chapterGrid"); g.innerHTML = h; g.dataset.b = b; g.hidden = false; $("#bookGrid").hidden = true; $("#sheet-ref .seg").hidden = true;
  setTimeout(() => (g.querySelector(".current") || g.querySelector("[data-c]")).focus(), 30);
}
$("#refBtn").onclick = () => { pickTest = pos.b >= NT_START ? "nt" : "ot"; renderBookGrid(); openSheet("sheet-ref"); };
$$("#sheet-ref .seg button").forEach((b) => (b.onclick = () => { pickTest = b.dataset.test; renderBookGrid(); }));
$("#bookGrid").onclick = (e) => { const b = e.target.closest("[data-b]"); if (!b) return; const n = +b.dataset.b; chapterCount(n) === 1 ? (closeSheet(), goTo(n, 0)) : renderChapterGrid(n); };
$("#chapterGrid").onclick = (e) => {
  if (e.target.closest("[data-back]")) return renderBookGrid();
  const c = e.target.closest("[data-c]"); if (!c) return; closeSheet(); goTo(+$("#chapterGrid").dataset.b, +c.dataset.c);
};

// version picker
async function renderVerPick() {
  let h = "", p = `<li><button data-par=""><span class="ab">—</span><span class="nm">None</span>${!S.parallel ? '<span class="ck">✓</span>' : ""}</button></li>`;
  for (const v of VERSIONS) {
    const have = await isDownloaded(v.id);
    h += `<li><button data-ver="${v.id}" ${have ? "" : "disabled"}><span class="ab">${v.id}</span><span class="nm">${esc(v.name)}${have ? "" : " <small class='muted'>(download in Settings)</small>"}</span>${S.version === v.id ? '<span class="ck">✓</span>' : ""}</button></li>`;
    if (v.id !== S.version) p += `<li><button data-par="${v.id}" ${have ? "" : "disabled"}><span class="ab">${v.id}</span><span class="nm">${esc(v.name)}</span>${S.parallel === v.id ? '<span class="ck">✓</span>' : ""}</button></li>`;
  }
  $("#verPick").innerHTML = h; $("#parPick").innerHTML = p;
}
$("#verBtn").onclick = async () => { await renderVerPick(); openSheet("sheet-ver"); };
$("#verPick").onclick = (e) => { const b = e.target.closest("[data-ver]"); if (!b) return; S.version = b.dataset.ver; if (S.parallel === S.version) S.parallel = ""; saveSettings(); closeSheet(); render(); };
$("#parPick").onclick = (e) => { const b = e.target.closest("[data-par]"); if (!b) return; S.parallel = b.dataset.par; saveSettings(); closeSheet(); render(); };

// display settings
const THEMES = [ // id, name, a few words, glyph, status-bar colour
  ["light", "Ivory", "Clean and bright", "☼", "#fbf8f1"],
  ["sepia", "Parchment", "Warm, like an old Bible", "✠", "#f3ead4"],
  ["dawn", "Dawn", "First light of morning", "✧", "#f9dcc4"],
  ["heavens", "Heavens", "Stars upon the deep", "✦", "#070d1a"],
  ["night", "Night", "True black, easy on eyes", "☾", "#000000"],
  ["auto", "Auto", "Ivory by day, Heavens by night", "◐", ""],
];
if (S.theme === "dark") S.theme = "heavens"; // earlier versions of the app
if (S.font === "serif") S.font = "garamond";
$$("[data-theme-picker]").forEach((row) => {
  row.innerHTML = THEMES.map(([id, n, d, g]) => `<button role="radio" data-theme="${id}" class="theme-chip ${id}" aria-label="${n}: ${d}"><span class="glyph" aria-hidden="true">${g}</span><span class="tn">${n}</span><span class="ts" aria-hidden="true">${d.split(",")[0]}</span></button>`).join("");
  row.onclick = (e) => { const b = e.target.closest("[data-theme]"); if (!b) return; S.theme = b.dataset.theme; saveSettings(); applyDisplay(); };
});
function applyDisplay() {
  const r = document.documentElement;
  r.dataset.theme = S.theme; r.dataset.font = S.font;
  r.style.setProperty("--font-size", S.fontSize + "px"); r.style.setProperty("--line-h", S.lineH);
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const t = THEMES.find((x) => x[0] === S.theme) || THEMES[0];
  $('meta[name="theme-color"]').content = t[4] || (dark ? "#070d1a" : "#fbf8f1");
  $$("[data-theme-picker] [data-theme]").forEach((b) => b.setAttribute("aria-checked", b.dataset.theme === S.theme));
  $$("[data-font]", $("#sheet-text")).forEach((b) => b.setAttribute("aria-checked", b.dataset.font === S.font));
  $("#fontSize").value = S.fontSize; $("#lineH").value = S.lineH;
}
$("#textBtn").onclick = () => { applyDisplay(); openSheet("sheet-text"); };
$("#moreDisplay").onclick = () => { applyDisplay(); openSheet("sheet-text"); };
$$("#sheet-text [data-font]").forEach((b) => (b.onclick = () => { S.font = b.dataset.font; saveSettings(); applyDisplay(); }));
$("#fontSize").oninput = (e) => { S.fontSize = +e.target.value; saveSettings(); applyDisplay(); };
$("#fontDown").onclick = () => { S.fontSize = Math.max(15, S.fontSize - 1); saveSettings(); applyDisplay(); };
$("#fontUp").onclick = () => { S.fontSize = Math.min(34, S.fontSize + 1); saveSettings(); applyDisplay(); };
$("#lineH").oninput = (e) => { S.lineH = +e.target.value; saveSettings(); applyDisplay(); };

// ------------------------------------------------------------------ verse actions
function openVerse(v) {
  selected = { b: pos.b, c: pos.c, v };
  $$(".v.selected").forEach((e) => e.classList.remove("selected"));
  const el = reader.querySelector(`[data-v="${v}"]`); if (el) el.classList.add("selected");
  const text = bibles[S.version].books[pos.b][pos.c][v];
  $("#verseTitle").textContent = refLabel(selected) + " · " + S.version;
  $("#versePreview").textContent = text;
  const k = refKey(pos.b, pos.c, v);
  $$(".hl-dot").forEach((d) => d.classList.toggle("on", (A.hl[k] || "") === d.dataset.hl && !!A.hl[k]));
  $("#actBookmark span").textContent = A.bm[k] ? "Bookmarked" : "Bookmark";
  $("#compareBox").hidden = true;
  openSheet("sheet-verse");
}
$$(".hl-dot").forEach((d) => (d.onclick = () => {
  const k = refKey(selected.b, selected.c, selected.v);
  if (d.dataset.hl) A.hl[k] = d.dataset.hl; else delete A.hl[k];
  saveA(); closeSheet(true); render(selected.v); toast(d.dataset.hl ? "Highlighted" : "Highlight removed");
}));
$("#actBookmark").onclick = () => {
  const k = refKey(selected.b, selected.c, selected.v);
  if (A.bm[k]) delete A.bm[k]; else A.bm[k] = Date.now();
  saveA(); closeSheet(true); render(selected.v); toast(A.bm[k] ? "Bookmarked" : "Bookmark removed");
};
const verseText = (r, id = S.version) => bibles[id].books[r.b][r.c][r.v];
const shareText = (r) => `“${verseText(r)}”\n— ${refLabel(r)} (${S.version})`;
$("#actCopy").onclick = async () => { try { await navigator.clipboard.writeText(shareText(selected)); toast("Copied"); } catch { toast("Copy is not available here"); } closeSheet(); };
$("#actShare").onclick = async () => {
  if (navigator.share) { try { await navigator.share({ text: shareText(selected) }); } catch {} }
  else { try { await navigator.clipboard.writeText(shareText(selected)); toast("Copied to share"); } catch {} }
};
$("#actListen").onclick = () => { closeSheet(true); player.start(selected.b, selected.c, selected.v); };
$("#actNote").onclick = () => { const ex = A.notes.find((n) => n.ref && n.ref.b === selected.b && n.ref.c === selected.c && n.ref.v === selected.v); openNote(ex ? ex.id : null, { ...selected }); };
$("#actCompare").onclick = async () => {
  const box = $("#compareBox"); let h = "";
  for (const v of VERSIONS) if (await isDownloaded(v.id)) { await getBible(v.id); h += `<div><b>${v.id}</b>${esc(verseText(selected, v.id) || "—")}</div>`; }
  const missing = (await Promise.all(VERSIONS.map((v) => isDownloaded(v.id)))).filter((x) => !x).length;
  if (missing) h += `<p class="hint">${missing} more version${missing > 1 ? "s" : ""} can be downloaded in Settings.</p>`;
  box.innerHTML = h; box.hidden = false;
};

// ------------------------------------------------------------------ notes
let editing = null;
function openNote(id, ref) {
  const n = id ? A.notes.find((x) => x.id === id) : null;
  editing = { id: n ? n.id : null, ref: n ? n.ref : ref || null };
  $("#noteTitle").textContent = n ? "Edit note" : editing.ref ? "New note" : "Journal entry";
  $("#noteVerse").hidden = !editing.ref;
  if (editing.ref) { getBible(S.version).then(() => ($("#noteVerse").textContent = `${refLabel(editing.ref)} — ${verseText(editing.ref)}`)); }
  $("#noteHeading").value = n ? n.title || "" : "";
  $("#noteBody").value = n ? n.body || "" : "";
  $("#noteTags").value = n ? (n.tags || []).join(", ") : "";
  $("#noteDelete").style.visibility = n ? "visible" : "hidden";
  openSheet("sheet-note");
  setTimeout(() => $("#noteBody").focus(), 120);
  // keep an unsaved draft if the app is closed mid-sentence
  store.set("draft", null);
}
$("#noteBody").addEventListener("input", () => store.set("draft", { editing, title: $("#noteHeading").value, body: $("#noteBody").value, tags: $("#noteTags").value }));
$("#noteSave").onclick = () => {
  const body = $("#noteBody").value.trim(), title = $("#noteHeading").value.trim();
  const tags = $("#noteTags").value.split(",").map((t) => t.trim()).filter(Boolean);
  if (!body && !title) { toast("Nothing to save yet"); return; }
  const now = Date.now();
  if (editing.id) Object.assign(A.notes.find((x) => x.id === editing.id), { title, body, tags, updated: now });
  else A.notes.unshift({ id: "n" + now.toString(36) + Math.random().toString(36).slice(2, 6), ref: editing.ref, title, body, tags, created: now, updated: now });
  saveA(); store.set("draft", null); closeSheet(); toast("Note saved");
  if (currentView === "notes") renderNotes(); else render(editing.ref && editing.ref.b === pos.b && editing.ref.c === pos.c ? editing.ref.v : undefined);
};
$("#noteDelete").onclick = () => {
  if (!editing.id || !confirm("Delete this note?")) return;
  A.notes = A.notes.filter((x) => x.id !== editing.id); saveA(); store.set("draft", null); closeSheet(); toast("Note deleted");
  currentView === "notes" ? renderNotes() : render();
};
$("#newJournal").onclick = () => openNote(null, null);

let notesFilter = "all";
async function renderNotes() {
  await getBible(S.version);
  const q = $("#notesFilter").value.trim().toLowerCase();
  const items = [];
  if (notesFilter === "all" || notesFilter === "note") A.notes.forEach((n) => items.push({ kind: "note", t: n.updated, n, ref: n.ref }));
  const parse = (k) => { const [b, c, v] = k.split(".").map(Number); return { b, c, v }; };
  if (notesFilter === "all" || notesFilter === "hl") Object.entries(A.hl).forEach(([k, col]) => items.push({ kind: "hl", t: 0, ref: parse(k), col }));
  if (notesFilter === "all" || notesFilter === "bm") Object.entries(A.bm).forEach(([k, t]) => items.push({ kind: "bm", t, ref: parse(k) }));
  items.sort((a, b) => (b.t - a.t) || (a.ref && b.ref ? a.ref.b - b.ref.b || a.ref.c - b.ref.c || a.ref.v - b.ref.v : 0));
  const mark = (s) => { const e = esc(s); return q ? e.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`) : e; };
  let h = "";
  for (const it of items) {
    const vt = it.ref ? verseText(it.ref) || "" : "";
    const hay = (vt + " " + (it.n ? `${it.n.title} ${it.n.body} ${(it.n.tags || []).join(" ")}` : "") + " " + refLabel(it.ref)).toLowerCase();
    if (q && !hay.includes(q)) continue;
    const label = it.kind === "hl" ? `<span class="swatch" style="background:var(--hl-${it.col})"></span>` : it.kind === "bm" ? "Bookmark" : "";
    h += `<li class="clickable" data-kind="${it.kind}" ${it.n ? `data-id="${it.n.id}"` : ""} ${it.ref ? `data-ref="${refKey(it.ref.b, it.ref.c, it.ref.v)}"` : ""} tabindex="0" role="button">
      <div class="ref"><span>${esc(refLabel(it.ref))} ${label}</span>${it.n ? `<time>${fmtDate(it.n.updated)}</time>` : ""}</div>
      ${vt ? `<p class="vt">${mark(vt)}</p>` : ""}
      ${it.n ? `<div class="nt">${it.n.title ? `<strong>${mark(it.n.title)}</strong>` : ""}${mark(it.n.body)}</div>` : ""}
      ${it.n && it.n.tags && it.n.tags.length ? `<div class="tags">${it.n.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>` : ""}</li>`;
  }
  $("#notesList").innerHTML = h || `<li class="empty" style="border:0;background:none"><span class="big">${q ? "Nothing matches" : "Nothing here yet"}</span>Tap any verse while reading to highlight it, bookmark it or write a note.</li>`;
}
$("#notesList").onclick = (e) => {
  const li = e.target.closest("li[data-kind]"); if (!li) return;
  if (li.dataset.kind === "note") return openNote(li.dataset.id);
  const [b, c, v] = li.dataset.ref.split(".").map(Number); showView("read"); goTo(b, c, v);
};
$("#notesList").onkeydown = (e) => { if (e.key === "Enter") $("#notesList").onclick(e); };
$("#notesFilter").oninput = renderNotes;
$$("#view-notes .seg button").forEach((b) => (b.onclick = () => { notesFilter = b.dataset.filter; $$("#view-notes .seg button").forEach((x) => x.setAttribute("aria-selected", x === b)); renderNotes(); }));
$("#exportNotes").onclick = async () => {
  const data = JSON.stringify({ app: "Scripture", exported: new Date().toISOString(), annotations: A }, null, 1);
  const name = `scripture-notes-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([data], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "Scripture notes backup" }); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
$("#importNotes").onclick = () => $("#importFile").click();
$("#importFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text()).annotations; if (!d) throw 0;
    const ids = new Set(A.notes.map((n) => n.id));
    Object.assign(A.hl, d.hl || {}); Object.assign(A.bm, d.bm || {});
    const tids = new Set(A.threads.map((t) => t.id)); (d.threads || []).forEach((t) => { if (!tids.has(t.id)) A.threads.push(t); });
    A.pathRead = A.pathRead || {}; Object.entries(d.pathRead || {}).forEach(([k, v]) => { A.pathRead[k] = [...new Set([...(A.pathRead[k] || []), ...v])].sort((x, y) => x - y); });
    (d.notes || []).forEach((n) => { if (!ids.has(n.id)) A.notes.push(n); });
    saveA(); renderNotes(); toast("Backup restored");
  } catch { toast("That file is not a Scripture backup"); }
  e.target.value = "";
};

// ------------------------------------------------------------------ search
let searchScope = "all";
function parseRef(q) {
  const m = q.trim().toLowerCase().replace(/\s+/g, " ").match(/^([1-3]?\s?[a-z ]+?)\.?\s*(\d+)?(?:[:.](\d+))?$/);
  if (!m) return null;
  const key = m[1].replace(/\s/g, "");
  const b = BOOKS.findIndex(([n, ab]) => n.toLowerCase().replace(/\s/g, "") === key || ab.split(" ").includes(key) || (key.length >= 3 && n.toLowerCase().replace(/\s/g, "").startsWith(key)));
  if (b < 0) return null;
  return { b, c: m[2] ? +m[2] - 1 : 0, v: m[3] ? +m[3] - 1 : null };
}
$("#searchForm").onsubmit = async (e) => {
  e.preventDefault();
  const q = $("#searchInput").value.trim(); if (!q) return;
  $("#searchInput").blur();
  const bible = await getBible(S.version);
  const r = parseRef(q);
  if (r && r.c < bible.books[r.b].length) { showView("read"); goTo(r.b, r.c, r.v); return; }
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const [b0, b1] = searchScope === "ot" ? [0, NT_START] : searchScope === "nt" ? [NT_START, 66] : [0, 66];
  const hits = []; let total = 0;
  for (let b = b0; b < b1; b++) bible.books[b].forEach((ch, c) => ch.forEach((t, v) => {
    const low = t.toLowerCase(); if (words.every((w) => low.includes(w))) { total++; if (hits.length < 300) hits.push({ b, c, v, t }); }
  }));
  const rx = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");
  $("#searchStatus").textContent = total ? `${total.toLocaleString()} verse${total > 1 ? "s" : ""} in ${S.version}${total > 300 ? " (showing the first 300)" : ""}` : `No verses found in ${S.version}.`;
  $("#searchResults").innerHTML = hits.map((h) => `<li class="clickable" data-ref="${refKey(h.b, h.c, h.v)}" tabindex="0" role="button"><div class="ref">${esc(refLabel(h))}</div><p class="vt">${esc(h.t).replace(rx, (m) => `<mark>${m}</mark>`)}</p></li>`).join("");
};
$("#searchResults").onclick = (e) => { const li = e.target.closest("[data-ref]"); if (!li) return; const [b, c, v] = li.dataset.ref.split(".").map(Number); showView("read"); goTo(b, c, v); };
$("#searchResults").onkeydown = (e) => { if (e.key === "Enter") $("#searchResults").onclick(e); };
$$("#view-search .seg button").forEach((b) => (b.onclick = () => { searchScope = b.dataset.scope; $$("#view-search .seg button").forEach((x) => x.setAttribute("aria-selected", x === b)); if ($("#searchInput").value.trim()) $("#searchForm").requestSubmit(); }));

// ------------------------------------------------------------------ audio
// Two voices: Voxly recordings (made on your computer with tools/voxly_bible_audio.py, one MP3 + timing file per
// chapter) and the iPhone's own speech voice as a fallback that always works offline.
const audio = new Audio(); audio.preload = "auto";
// iOS only lets sound start inside a tap. The first tap that starts listening plays a moment of silence and an
// empty utterance straight away, so later playback (after loading files, or the next chapter) is allowed.
let unlocked = false;
function unlockAudio() {
  if (unlocked) return; unlocked = true;
  try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch {}
  try {
    const n = 4410, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => [...s].forEach((ch, i) => d.setUint8(o + i, ch.charCodeAt(0)));
    w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 44100, true); d.setUint32(28, 88200, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true);
    if (!audio.src) { audio.src = URL.createObjectURL(new Blob([buf], { type: "audio/wav" })); audio.play().catch(() => {}); }
  } catch {}
}
const SPEEDS = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2];
const pad = (n, w) => String(n).padStart(w, "0");
// Voxly recordings, one folder per Kokoro voice: audio/<VERSION>/<voice>/<book>/<chapter>.mp3
const VOXLY_VOICES = { bf_emma: "Emma", bm_george: "George" };
const voxlyUrl = (ver, b, c, ext, voice = S.voxlyVoice) => { let base = S.voxlyBase || "audio/"; if (!base.endsWith("/")) base += "/"; return `${base}${ver}/${voice}/${pad(b + 1, 2)}/${pad(c + 1, 3)}.${ext}`; };
async function voxlyTiming(b, c) {
  if (S.audioSource === "device") return null;
  // the chosen voice first; if that chapter is not recorded in it yet, the other voice
  for (const voice of [S.voxlyVoice, ...Object.keys(VOXLY_VOICES).filter((v) => v !== S.voxlyVoice)]) {
    try {
      const r = await fetch(voxlyUrl(S.version, b, c, "json", voice), { cache: "no-cache" });
      if (!r.ok) continue;
      const t = await r.json(); if (Array.isArray(t.verses)) { t.voiceKey = voice; return t; }
    } catch {}
  }
  return null;
}

const player = {
  active: false, playing: false, engine: null, b: 0, c: 0, verse: 0, timing: null, verses: [], sleepAt: 0,
  stopAt: null, queue: null, qi: 0, qTitle: "", advancing: false, // stopAt: stop after this verse; queue: verses to play in turn
  async load(b, c) {
    this.b = b; this.c = c; this.verse = 0;
    this.verses = (await getBible(S.version)).books[b][c];
    this.timing = await voxlyTiming(b, c);
    this.engine = this.timing ? "voxly" : S.audioSource === "voxly" ? null : "device";
    if (this.timing) { audio.src = voxlyUrl(S.version, b, c, audioExt(this.timing), this.timing.voiceKey); audio.playbackRate = S.rate; }
    $("#playerTitle").textContent = this.queue ? this.qTitle : `${bookName(b)} ${c + 1}`;
    this.status(this.engine ? `${this.engine === "voxly" ? "Voxly" : "iPhone voice"} · ${S.version}` : "No Voxly recording for this chapter");
    this.mediaSession();
  },
  async start(b = pos.b, c = pos.c, v = 0, only = false) { // only: play just verse v, then stop
    unlockAudio();
    this.show();
    this.queue = null; this.stopAt = only ? v : null;
    if (!this.active || b !== this.b || c !== this.c || !this.engine) await this.load(b, c);
    this.active = true;
    this.play(v);
  },
  // A list of verses from anywhere in the Bible, read one after another (a thread, a word's verses, linked verses).
  async playList(refs, title) {
    if (!refs.length) return;
    unlockAudio(); this.show();
    this.queue = refs; this.qi = 0; this.qTitle = title;
    await this.playItem();
  },
  async playItem() {
    const r = this.queue[this.qi];
    if (r.b !== this.b || r.c !== this.c || !this.engine) await this.load(r.b, r.c);
    this.stopAt = r.v;
    $("#playerTitle").textContent = `${this.qTitle} · ${this.qi + 1} of ${this.queue.length}`;
    this.play(r.v);
  },
  verseDone() { // the verse asked for has been read
    if (this.queue && this.qi < this.queue.length - 1) { this.qi++; this.playItem(); return; }
    const r = { b: this.b, c: this.c, v: this.stopAt != null ? this.stopAt : this.verse };
    this.verse = r.v;
    this.queue = null; this.stopAt = null; this.pause();
    if (this.engine === "voxly") audio.currentTime = this.timing.verses[r.v] || 0;   // Play repeats that verse
    markReading(r.v);
    this.status("Finished · " + refLabel(r));
  },
  show() { this.active = true; $("#listenTab").classList.add("active"); this.layout(); },
  layout() { // full player docked above the tabs, or the small floating button
    const min = this.active && S.playerMin;
    $("#player").hidden = !this.active || min; $("#playerBubble").hidden = !min;
    document.body.classList.toggle("playing", this.active && !min);
    if (min) placeBubble();
  },
  minimise(on) { S.playerMin = on; saveSettings(); this.layout(); (on ? $("#bPlay") : $("#pMin")).focus(); },
  play(v = this.verse) {
    if (!this.engine) { toast("No Voxly recording for this chapter. Switch audio source to include the iPhone voice."); return; }
    this.verse = Math.max(0, Math.min(v, this.verses.length - 1));
    this.playing = true; this.updateBtn();
    if (this.engine === "voxly") { audio.currentTime = this.timing.verses[this.verse] || 0; audio.playbackRate = S.rate; audio.play().catch(() => { this.playing = false; this.updateBtn(); }); }
    else this.speak();
    markReading(this.verse);
  },
  pause() {
    this.playing = false; this.updateBtn();
    if (this.engine === "voxly") audio.pause(); else { speechSynthesis.cancel(); }
    this.status("Paused · " + refLabel({ b: this.b, c: this.c, v: this.verse }));
  },
  toggle() { this.playing ? this.pause() : this.play(); },
  speak() {
    speechSynthesis.cancel();
    const i = this.verse, title = ((bibles[S.version].titles || {})[this.b] || {})[this.c];
    const head = this.b === 18 ? `Psalm ${this.c + 1}. ` : `${bookName(this.b)}, chapter ${this.c + 1}. `;
    const intro = this.stopAt != null ? `${refLabel({ b: this.b, c: this.c, v: i }).replace(":", ", verse ")}. ` : i === 0 ? head + (title ? title + " " : "") : "";
    const u = new SpeechSynthesisUtterance(intro + this.verses[i]);
    const voice = currentVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
    u.rate = S.rate; u.pitch = 1; u.volume = 1; u._i = i;
    u.onend = () => { if (!this.playing || this.engine !== "device" || this.verse !== u._i) return; this.next(); };
    u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled") { this.playing = false; this.updateBtn(); this.status("Speech stopped: " + e.error); } };
    speechSynthesis.speak(u);
    this.status(`iPhone voice · verse ${i + 1} of ${this.verses.length}`);
    if (i === 0 && voice && voiceQuality(voice) <= 0 && !this.warned) { this.warned = true; toast("Basic iPhone voice. For a clearer one, see Settings → Listening"); }
    setProgress((i + 1) / this.verses.length);
  },
  next() {
    if (this.sleepCheck()) return;
    if (this.stopAt != null && this.verse >= this.stopAt) { this.verseDone(); return; }
    if (this.verse < this.verses.length - 1) { this.verse++; markReading(this.verse); this.speak(); }
    else this.chapterEnded();
  },
  async chapterEnded() {
    const n = neighbour(1, { b: this.b, c: this.c });
    if (!S.autoNext || !n) { this.playing = false; this.updateBtn(); this.status("Finished " + bookName(this.b) + " " + (this.c + 1)); markReading(-1); return; }
    this.advancing = true;
    if (S.followAudio) goTo(n.b, n.c);
    await this.load(n.b, n.c); this.advancing = false; this.play(0);
  },
  skip(d) {
    if (this.queue) { const q = this.qi + d; if (q >= 0 && q < this.queue.length) { this.qi = q; this.playItem(); } return; }
    const v = this.verse + d;
    if (v < 0) { const p = neighbour(-1, { b: this.b, c: this.c }); if (p) this.start(p.b, p.c); return; }
    if (v >= this.verses.length) { this.chapterEnded(); return; }
    this.playing ? this.play(v) : (this.verse = v, markReading(v));
  },
  close() { this.pause(); this.queue = null; this.stopAt = null; this.active = false; this.layout(); $("#listenTab").classList.remove("active"); markReading(-1); },
  toggleFromTab() {
    if (currentView === "study" && window.Study && Study.listen()) return; // Study plays what is on its page
    if (!this.active) this.start(); else if (this.b === pos.b && this.c === pos.c) this.toggle(); else this.start(); },
  updateBtn() {
    $("#bIcon").innerHTML = this.playing ? '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>' : '<path d="M8 5l11 7-11 7z"/>';
    $("#bPlay").setAttribute("aria-label", this.playing ? "Pause" : "Play");
    $("#playIcon").innerHTML = this.playing ? '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>' : '<path d="M8 5l11 7-11 7z"/>';
    $("#pPlay").setAttribute("aria-label", this.playing ? "Pause" : "Play");
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = this.playing ? "playing" : "paused";
  },
  status(t) { $("#playerSub").textContent = t; },
  sleepCheck() { if (this.sleepAt && Date.now() >= this.sleepAt) { this.sleepAt = 0; this.pause(); this.status("Sleep timer ended"); return true; } return false; },
  mediaSession() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: `${bookName(this.b)} ${this.c + 1}`, artist: verInfo(S.version).name, album: "Scripture",
      artwork: [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => this.play()); ms.setActionHandler("pause", () => this.pause());
    ms.setActionHandler("nexttrack", () => this.chapterEnded());
    ms.setActionHandler("previoustrack", () => { const p = neighbour(-1, { b: this.b, c: this.c }); if (p) { if (S.followAudio) goTo(p.b, p.c); this.start(p.b, p.c); } });
    try { ms.setActionHandler("seekforward", () => this.skip(1)); ms.setActionHandler("seekbackward", () => this.skip(-1)); } catch {}
  },
};
audio.addEventListener("timeupdate", () => {
  if (player.engine !== "voxly" || !player.timing || !player.playing) return; // a stopped player keeps its last words
  const t = audio.currentTime, vs = player.timing.verses;
  let i = 0; while (i + 1 < vs.length && vs[i + 1] <= t + 0.05) i++;
  if (player.stopAt != null && player.playing && (i > player.stopAt || (vs[player.stopAt + 1] != null && t >= vs[player.stopAt + 1] - 0.12))) { player.verseDone(); return; }
  if (i !== player.verse) { player.verse = i; markReading(i); if (player.sleepCheck()) return; }
  const dur = audio.duration || player.timing.duration || 1;
  setProgress(t / dur);
  player.status(`Voxly ${VOXLY_VOICES[player.timing.voiceKey] || ""} · verse ${i + 1} of ${player.verses.length} · ${fmtTime(t)} / ${fmtTime(dur)}`);
});
audio.addEventListener("ended", () => { if (player.engine === "voxly" && player.playing) player.stopAt != null ? player.verseDone() : player.chapterEnded(); });
audio.addEventListener("error", () => { if (player.engine === "voxly" && player.active) { player.status("Could not play the Voxly recording"); player.playing = false; player.updateBtn(); } });
const fmtTime = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60), 2)}`;

function markReading(v) {
  $$(".v.reading").forEach((e) => e.classList.remove("reading"));
  if (v < 0 || !player.active || player.b !== pos.b || player.c !== pos.c) return;
  const el = reader.querySelector(`[data-v="${v}"]`); if (!el) return;
  el.classList.add("reading");
  if (S.followAudio && player.playing && currentView === "read" && !openSheetEl) {
    const r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight - 200) autoScrollAt = Date.now(), el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
}
// iOS gives web pages its small "compact" voices unless better ones have been downloaded in Settings;
// those sound muffled ("in a tunnel"). Rank voices by quality and say which is which.
function voiceQuality(v) {
  const id = (v.voiceURI + " " + v.name).toLowerCase();
  if (/premium/.test(id)) return 3;
  if (/enhanced|natural|neural/.test(id)) return 2;
  if (/eloquence|novelty|speech\.synthesis|bells|bubbles|zarvox|whisper|jester|organ|trinoids|bad news|good news|boing|cellos|hysterical|wobble|albert|fred|junior|kathy|ralph|superstar|grandma|grandpa|rocko|shelley|reed|sandy|flo|eddy/.test(id)) return -5;
  if (/compact/.test(id)) return 0;
  return 1; // unknown: other browsers/devices
}
const QUALITY_LABEL = { 3: "premium", 2: "enhanced", 1: "", 0: "basic", "-5": "novelty" };
function englishVoices() {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const score = (v) => voiceQuality(v) * 10 + (v.lang === "en-GB" ? 3 : v.lang === "en-US" ? 2 : 0) + (/daniel|serena|jamie|malcolm|stephanie|kate|arthur|ava|zoe|evan/i.test(v.name) ? 1 : 0);
  return vs.sort((a, b) => score(b) - score(a));
}
function bestVoice() { return englishVoices()[0] || null; }
function currentVoice() { return speechSynthesis.getVoices().find((x) => x.voiceURI === S.voice) || bestVoice(); }
$("#pPlay").onclick = () => { unlockAudio(); player.toggle(); };
$("#pMin").onclick = () => player.minimise(true);
$("#bOpen").onclick = () => player.minimise(false);
function setProgress(f) {
  f = Math.max(0, Math.min(1, f || 0));
  $("#playerBar").style.width = f * 100 + "%";
  const ring = $("#bubbleRing"), len = 2 * Math.PI * 29;
  ring.style.strokeDasharray = len; ring.style.strokeDashoffset = len * (1 - f);
}
// The floating button: drag it anywhere; it stays where you leave it (kept on screen, clear of the tab bar).
function placeBubble() {
  const el = $("#playerBubble"), p = S.bubblePos || { right: 16, bottom: 86 };
  const w = el.offsetWidth || 64, maxR = innerWidth - w - 8, maxB = innerHeight - w - 8;
  el.style.right = Math.max(8, Math.min(p.right, maxR)) + "px";
  el.style.bottom = Math.max(70, Math.min(p.bottom, maxB)) + "px";
}
(() => {
  const el = $("#playerBubble"); let drag = null;
  el.addEventListener("pointerdown", (e) => {
    const r = el.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, right: innerWidth - r.right, bottom: innerHeight - r.bottom, moved: false, id: e.pointerId };
  });
  addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;          // small movements are taps
    if (!drag.moved) { drag.moved = true; el.classList.add("dragging"); }
    S.bubblePos = { right: drag.right - dx, bottom: drag.bottom - dy }; placeBubble();
    e.preventDefault();
  });
  const end = () => { if (drag && drag.moved) { saveSettings(); el.classList.remove("dragging"); el.dataset.justDragged = "1"; setTimeout(() => delete el.dataset.justDragged, 50); } drag = null; };
  addEventListener("pointerup", end); addEventListener("pointercancel", end);
  el.addEventListener("click", (e) => { if (el.dataset.justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  $("#bPlay").onclick = () => { unlockAudio(); player.toggle(); };
  addEventListener("resize", () => { if (!el.hidden) placeBubble(); });
})();
$("#pBack").onclick = () => player.skip(-1);
$("#pFwd").onclick = () => player.skip(1);
$("#pClose").onclick = () => player.close();
$("#pSpeed").onclick = () => {
  S.rate = SPEEDS[(SPEEDS.indexOf(S.rate) + 1) % SPEEDS.length] || 1; saveSettings();
  $("#pSpeed").textContent = S.rate + "×"; $("#pSpeed").setAttribute("aria-label", `Playback speed ${S.rate} times`);
  if (player.engine === "voxly") audio.playbackRate = S.rate; else if (player.playing) player.speak();
};
// long-press the speed button for a sleep timer
let pressT;
$("#pSpeed").addEventListener("touchstart", () => { pressT = setTimeout(() => { pressT = null; sleepMenu(); }, 600); }, { passive: true });
$("#pSpeed").addEventListener("touchend", (e) => { if (pressT === null) e.preventDefault(); clearTimeout(pressT); });
function sleepMenu() {
  const m = prompt("Sleep timer — stop after how many minutes? (0 to cancel)", "15");
  if (m == null) return; const n = +m;
  player.sleepAt = n > 0 ? Date.now() + n * 60000 : 0; toast(n > 0 ? `Sleep timer: ${n} minutes` : "Sleep timer off");
}

// ------------------------------------------------------------------ settings
async function renderSettings() {
  let h = "";
  for (const v of VERSIONS) {
    const have = await isDownloaded(v.id);
    h += `<li class="ver-item"><span class="ver-badge">${v.id}</span><span class="meta"><b>${esc(v.name)}</b><span>${esc(v.description || "")} · ${esc(v.year || "")}</span></span>
      ${v.builtin ? '<span class="ver-action done">Built in</span>' : have ? `<button class="ver-action done" data-remove="${v.id}" aria-label="Remove ${esc(v.name)} from this phone">On phone ✓</button>` : `<button class="ver-action" data-get="${v.id}" aria-label="Download ${esc(v.name)}">Get · ${Math.round((v.size || 4e6) / 1e6 / 3)} MB</button>`}</li>`;
  }
  $("#versionList").innerHTML = h;
  $("#audioSource").value = S.audioSource; $("#voxlyBase").value = S.voxlyBase; $("#voxlyVoice").value = S.voxlyVoice;
  $("#autoNext").checked = S.autoNext; $("#followAudio").checked = S.followAudio;
  $("#showNums").checked = S.showNums; $("#paraMode").checked = S.paraMode;
  $("#redLetters").checked = S.redLetters; $("#italics").checked = S.italics; $("#showXrefs").checked = S.showXrefs;
  fillVoices(); checkVoxly(); offlineStatus(); renderAudioBooks();
}
async function offlineStatus() {
  const have = (await Promise.all(VERSIONS.map((v) => isDownloaded(v.id)))).filter(Boolean).length;
  let study = false; try { study = !!(await caches.match("data/study/xrefs.json")) && !!(await caches.match("data/study/words.json")); } catch {}
  const all = have === VERSIONS.length && study;
  $("#offlineStatus").textContent = all ? "Everything is saved on this phone ✓ — works in Airplane Mode." : `On this phone: ${have} of ${VERSIONS.length} versions${study ? " and the Study tools" : ""}.`;
  $("#offlineStatus").className = "hint" + (all ? " ok" : "");
  $("#saveAll").hidden = all;
}
// ---- Voxly audio saved on the phone, a book at a time (in the voice chosen under Listening)
const AUDIO_CACHE = "scripture-audio-saved";
let audioIndex = null;
async function loadAudioIndex() {
  try { const r = await fetch((S.voxlyBase || "audio/").replace(/\/?$/, "/") + "index.json", { cache: "no-cache" }); audioIndex = r.ok ? await r.json() : audioIndex; } catch {}
  return audioIndex;
}
const mb = (n) => (n / 1e6 < 10 ? (n / 1e6).toFixed(1) : Math.round(n / 1e6)) + " MB";
// Each chapter's timing file names its recording (001.m4a, or 001.mp3 for older recordings).
const audioExt = (timing) => ((timing && timing.file) || ".mp3").split(".").pop();
async function savedFile(c, book, ch, voice) { // the saved recording for a chapter, or null
  const t = await c.match(voxlyUrl(S.version, book, ch - 1, "json", voice)); if (!t) return null;
  const url = voxlyUrl(S.version, book, ch - 1, audioExt(await t.json()), voice);
  return (await c.match(url)) ? url : null;
}
async function savedChapters(book, chapters, voice) {
  let n = 0;
  try { const c = await caches.open(AUDIO_CACHE); for (const ch of chapters) if (await savedFile(c, book, ch, voice)) n++; } catch {}
  return n;
}
async function renderAudioBooks() {
  const list = $("#audioBooks"), idx = await loadAudioIndex();
  const books = idx && idx[S.version] && idx[S.version][S.voxlyVoice];
  if (!books) { list.innerHTML = `<li class="muted">No ${VOXLY_VOICES[S.voxlyVoice]} recordings of the ${S.version} are on your website yet.</li>`; return; }
  let h = "";
  for (const [bk, info] of Object.entries(books).sort((a, b) => a[0] - b[0])) {
    const b = +bk - 1, total = chapterCount(b), have = info.chapters.length, saved = await savedChapters(b, info.chapters, S.voxlyVoice);
    const state = saved === have ? `<button class="ver-action done" data-unsave="${b}" aria-label="Remove ${esc(bookName(b))} audio from this phone">On phone ✓</button>`
      : `<button class="ver-action" data-save="${b}" aria-label="Save ${esc(bookName(b))} audio to this phone">${saved ? "Finish" : "Save"} · ${mb(info.bytes)}</button>`;
    h += `<li><span class="ab-name"><b>${esc(bookName(b))}</b><small>${VOXLY_VOICES[S.voxlyVoice]} · ${have === total ? (total === 1 ? "1 chapter" : "all " + total + " chapters") : have + " of " + total + " chapters"}${saved && saved < have ? " · " + saved + " saved" : ""}</small></span>${state}</li>`;
  }
  list.innerHTML = h;
  if (navigator.storage && navigator.storage.estimate) { try { const e = await navigator.storage.estimate(); $("#audioStorage").textContent = `Using ${mb(e.usage || 0)} of this phone's storage for the app.`; } catch {} }
}
$("#audioBooks").onclick = async (e) => {
  const sv = e.target.closest("[data-save]"), un = e.target.closest("[data-unsave]");
  const voice = S.voxlyVoice;
  if (sv) {
    const b = +sv.dataset.save, chapters = audioIndex[S.version][voice][b + 1].chapters;
    sv.disabled = true;
    try {
      const c = await caches.open(AUDIO_CACHE);
      for (const [i, ch] of chapters.entries()) {
        sv.textContent = `Saving ${i + 1} of ${chapters.length}…`;
        if (await savedFile(c, b, ch, voice)) continue;
        const turl = voxlyUrl(S.version, b, ch - 1, "json", voice);
        const tr = await fetch(turl, { cache: "no-cache" }); if (!tr.ok) throw new Error(turl);
        const timing = await tr.clone().json();
        const aurl = voxlyUrl(S.version, b, ch - 1, audioExt(timing), voice);
        const ar = await fetch(aurl, { cache: "no-cache" }); if (!ar.ok) throw new Error(aurl);
        await c.put(aurl, ar); await c.put(turl, tr);   // the timing file last: it marks the chapter as saved
      }
      toast(`${bookName(b)} audio is saved on this phone`);
    } catch { toast("Saving stopped — check the connection or free some space, then tap Finish"); }
    renderAudioBooks();
  }
  if (un) {
    const b = +un.dataset.unsave;
    try { const c = await caches.open(AUDIO_CACHE); for (const ch of audioIndex[S.version][voice][b + 1].chapters) for (const ext of ["json", "mp3", "m4a"]) await c.delete(voxlyUrl(S.version, b, ch - 1, ext, voice)); } catch {}
    toast(`${bookName(b)} audio removed from this phone`); renderAudioBooks();
  }
};
$("#saveAll").onclick = async () => {
  const btn = $("#saveAll"); btn.disabled = true;
  try {
    for (const [i, v] of VERSIONS.entries()) { btn.textContent = `Saving ${v.name}… (${i + 1} of ${VERSIONS.length + 1})`; await getBible(v.id); }
    btn.textContent = `Saving the Study tools… (${VERSIONS.length + 1} of ${VERSIONS.length + 1})`;
    const c = await caches.open("scripture-texts");
    for (const f of ["words.json", "lexicon.json", "xrefs.json"]) { const r = await fetch("data/study/" + f); if (!r.ok) throw 0; await c.put("data/study/" + f, r); }
    toast("Everything is saved for offline use");
  } catch { toast("Saving stopped — check the connection and try again"); }
  btn.disabled = false; btn.textContent = "Save everything to this phone";
  renderSettings();
};
$("#versionList").onclick = async (e) => {
  const g = e.target.closest("[data-get]"), r = e.target.closest("[data-remove]");
  if (g) { g.textContent = "Downloading…"; g.disabled = true; try { await getBible(g.dataset.get); toast(`${g.dataset.get} is ready offline`); } catch { toast("Download failed — check your connection"); } renderSettings(); }
  if (r && confirm(`Remove ${r.dataset.remove} from this phone? Your notes are kept.`)) {
    try { await (await caches.open("scripture-texts")).delete(`data/${r.dataset.remove}.json`); } catch {}
    delete bibles[r.dataset.remove];
    if (S.version === r.dataset.remove) S.version = "KJV"; if (S.parallel === r.dataset.remove) S.parallel = ""; saveSettings();
    renderSettings(); render();
  }
};
function fillVoices() {
  const vs = englishVoices().filter((v) => voiceQuality(v) > -5);
  const best = vs[0];
  const label = (v) => { const q = QUALITY_LABEL[voiceQuality(v)]; return `${v.name}${q ? " (" + q + ")" : ""} · ${v.lang.replace("en-", "")}`; };
  $("#voiceSelect").innerHTML = `<option value="">Best available${best ? " — " + esc(label(best)) : ""}</option>` +
    vs.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.voice ? "selected" : ""}>${esc(label(v))}</option>`).join("");
  const cur = currentVoice(), hint = $("#voiceHint");
  if (!cur) { hint.innerHTML = "No English voice found on this device."; hint.className = "hint warn"; return; }
  if (voiceQuality(cur) <= 0) {
    hint.innerHTML = "This is the iPhone's <b>basic</b> voice, which can sound muffled. For a clear, natural voice: iPhone <b>Settings → Accessibility → Spoken Content → Voices → English</b>, download a voice marked <b>Enhanced</b> or <b>Premium</b> (for example Jamie, Serena or Daniel), then close and reopen this app.";
    hint.className = "hint warn";
  } else { hint.textContent = `Using ${cur.name} (${QUALITY_LABEL[voiceQuality(cur)] || "standard"} quality).`; hint.className = "hint ok"; }
}
function testVoice() {
  unlockAudio(); speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance("The LORD is my shepherd; I shall not want.");
  const v = currentVoice(); if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = S.rate; u.pitch = 1; u.volume = 1; speechSynthesis.speak(u);
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => { if (currentView === "more") fillVoices(); };
async function checkVoxly() {
  const el = $("#voxlyStatus");
  try {
    for (const [b, c] of [[pos.b, pos.c], [42, 0], [18, 22]]) { // this chapter, John 1, Psalm 23
      for (const v of [S.voxlyVoice, ...Object.keys(VOXLY_VOICES).filter((x) => x !== S.voxlyVoice)]) {
        const r = await fetch(voxlyUrl("KJV", b, c, "json", v), { cache: "no-cache" });
        if (r.ok) { el.textContent = `Voxly recordings found ✓ (${VOXLY_VOICES[v]}, ${bookName(b)} ${c + 1}). Chapters not recorded in your chosen voice use the other voice, then the iPhone voice.`; el.className = "hint ok"; return; }
      }
    }
  } catch {}
  el.innerHTML = "No Voxly recordings found at this address yet — the iPhone voice is used meanwhile. See <b>VOXLY-AUDIO.md</b> to make them on your computer.";
  el.className = "hint warn";
}
$("#audioSource").onchange = (e) => { S.audioSource = e.target.value; saveSettings(); if (player.active) player.load(player.b, player.c); };
$("#voxlyVoice").onchange = (e) => { S.voxlyVoice = e.target.value; saveSettings(); checkVoxly(); renderAudioBooks(); if (player.active && !player.playing) player.load(player.b, player.c); };
$("#voxlyBase").onchange = (e) => { S.voxlyBase = e.target.value.trim() || "audio/"; saveSettings(); checkVoxly(); };
$("#voiceSelect").onchange = (e) => { S.voice = e.target.value; saveSettings(); fillVoices(); testVoice(); };
$("#testVoice").onclick = testVoice;
[["autoNext"], ["followAudio"], ["showNums", true], ["paraMode", true], ["redLetters", true], ["italics", true], ["showXrefs"]].forEach(([k, rerender]) => ($("#" + k).onchange = (e) => { S[k] = e.target.checked; saveSettings(); if (rerender) render(); }));

// ------------------------------------------------------------------ start
function opening() {
  let seen = false; try { seen = sessionStorage.getItem("scripture.opened") === "1"; sessionStorage.setItem("scripture.opened", "1"); } catch {}
  if (seen || matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver) return;
  const o = $("#opening"); o.hidden = false;
  const end = () => { o.classList.add("fade"); setTimeout(() => (o.hidden = true), 900); };
  o.onclick = end; setTimeout(end, 2600);
}
(async function init() {
  opening();
  applyDisplay();
  $("#pSpeed").textContent = S.rate + "×";
  await loadVersions();
  try { await getBible("KJV"); } catch { reader.innerHTML = `<p class="empty"><span class="big">Could not load the Bible text.</span>Open the app once with an internet connection.</p>`; return; }
  await render();
  const d = store.get("draft", null);
  if (d && (d.body || d.title)) { openNote(d.editing.id, d.editing.ref); $("#noteHeading").value = d.title; $("#noteBody").value = d.body; $("#noteTags").value = d.tags; toast("Your unsaved note was restored"); }
  $("#buildInfo").textContent = "Scripture 1.0 · texts from the scrollmapper/bible_databases collection.";
  // When a new version of the app has been downloaded, offer it straight away instead of on the next launch.
  const hadVersion = "serviceWorker" in navigator && !!navigator.serviceWorker.controller; // false on the very first visit
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").then((reg) => {
    const offer = () => { if (hadVersion) $("#updateBar").hidden = false; };
    if (reg.waiting) offer();
    reg.addEventListener("updatefound", () => { const w = reg.installing; if (w) w.addEventListener("statechange", () => { if (w.state === "installed" || w.state === "activated") offer(); }); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyDisplay);
})();
