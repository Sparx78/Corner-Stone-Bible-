/* Study — scripture beside scripture. "Comparing spiritual things with spiritual" (1 Corinthians 2:13).
   Only the words of the Bible are shown. The study data adds no explanation: it records which Hebrew or Greek
   word stands behind each English word, and which verses readers have linked to which. */
"use strict";

const ST = { words: null, lex: null, xrefs: null, index: null, loading: null };
const studyPage = $("#studyPage");
let stack = [{ type: "home" }];
A.threads = A.threads || [];

// ------------------------------------------------------------------ data
async function loadStudy(withXrefs = true) {
  if (!ST.loading) {
    ST.loading = (async () => {
      const get = async (f) => (await fetch("data/study/" + f)).json();
      const [w, l] = await Promise.all([get("words.json"), get("lexicon.json")]);
      ST.words = w.books; ST.lex = l;
      try { (await caches.open("scripture-texts")).addAll(["data/study/words.json", "data/study/lexicon.json"]); } catch {}
    })();
  }
  await ST.loading;
  if (withXrefs && !ST.xrefs) {
    ST.xrefs = (await (await fetch("data/study/xrefs.json")).json()).books;
    try { (await caches.open("scripture-texts")).add("data/study/xrefs.json"); } catch {}
  }
}
const SEG = /\[([^\]|]*)\|([^\]]*)\]/g;
function segments(raw) { // -> [{t, nums, added, christ}]
  const out = []; let christ = false;
  const re = /\[([^\]|]*)\|([^\]]*)\]|\{([^}]*)\}|«|»|([^[{«»]+)/g; let m;
  while ((m = re.exec(raw))) {
    if (m[0] === "«") { christ = true; continue; }
    if (m[0] === "»") { christ = false; continue; }
    if (m[1] != null) out.push({ t: m[1], nums: m[2].split(" "), christ });
    else if (m[3] != null) out.push({ t: m[3], added: true, christ });
    else out.push({ t: m[4], christ });
  }
  return out;
}
const plain = (raw) => raw.replace(SEG, "$1").replace(/[{}«»]/g, "");
function buildIndex() { // Strong's number -> [[b,c,v], ...] in canonical order, and English rendering counts
  if (ST.index) return ST.index;
  const idx = {}, render = {};
  ST.words.forEach((book, b) => book.forEach((ch, c) => ch.forEach((raw, v) => {
    let m; SEG.lastIndex = 0;
    while ((m = SEG.exec(raw))) for (const n of m[2].split(" ")) {
      const list = idx[n] || (idx[n] = []);
      const last = list[list.length - 1];
      if (!last || last[0] !== b || last[1] !== c || last[2] !== v) list.push([b, c, v]);
      const r = render[n] || (render[n] = {}); const w = renderingOf(m[1]);
      if (w && !LEADING.test(w + " ")) r[w] = (r[w] || 0) + 1;
    }
  })));
  return (ST.index = { idx, render });
}
// "and the love" -> "love": the small English words around a rendering are not part of it
const LEADING = /^(?:and|but|for|or|nor|the|a|an|of|his|her|its|my|thy|thine|your|our|their|in|to|unto|upon|by|with|that|this|these|those|which|who|o|be|is|was|shall|will|not|it|him|them|me|thee|you|us|he|she|they|we|i|ye|so|then|also|from|at|on|as)\s+/;
function renderingOf(t) {
  let w = t.toLowerCase().replace(/[^a-z’' -]/g, "").replace(/\s+/g, " ").trim(), p;
  do { p = w; const n = w.replace(LEADING, ""); if (n) w = n; } while (w !== p);
  return w;
}
const lexWord = (n) => ST.lex[n] || ["", ""];
const isHeb = (n) => n[0] === "H";
const kjvText = (r) => (bibles.KJV.books[r.b][r.c] || [])[r.v] || "";
const parseKey = (k) => { const [b, c, v] = k.split(".").map(Number); return { b, c, v }; };

// ------------------------------------------------------------------ navigation
function go(entry) { stack.push(entry); draw(); }
function back() { if (stack.length > 1) stack.pop(); draw(); }
function openStudy(entry) {
  if (entry) stack = entry.type === "home" ? [entry] : [{ type: "home" }, entry];
  showView("study");
}
// What the Listen tab and "Listen to these verses" play, for the page on show.
function pageList() {
  const top = stack[stack.length - 1];
  if (top.type === "word") return { refs: (top.list || []).slice(0, 200).map(([b, c, v]) => ({ b, c, v })), title: lexWord(top.num)[1] || "Word study" };
  if (top.type === "thread") { const t = A.threads.find((x) => x.id === top.id); return t && { refs: t.items.map((i) => i.ref), title: t.title }; }
  if (top.type === "verse" && S.showXrefs !== false && ST.xrefs) {
    const r = top.ref, xr = (ST.xrefs[r.b][r.c][r.v] || "").split(" ").filter(Boolean).map((x) => parseKey(x.split("-")[0]));
    return { refs: [r, ...xr], title: refLabel(r) + " and linked verses" };
  }
  return null;
}
function listenAll() { const l = pageList(); if (l && l.refs.length) player.playList(l.refs, l.title); }
window.Study = {
  listen() { // Listen tab while in Study: play this page's verses; false = nothing here to play
    const top = stack[stack.length - 1];
    if (top.type === "verse") { player.start(top.ref.b, top.ref.c, top.ref.v); return true; }
    const l = pageList(); if (l && l.refs.length) { player.playList(l.refs, l.title); return true; }
    return false;
  },
  show: () => draw(), open: openStudy, threadSheet: openThreadSheet,
  async rich() { // returns (b, c, v) -> verse HTML with the words of Christ in red and added words in italics
    await loadStudy(false);
    return (b, c, v) => segments(ST.words[b][c][v]).map((s) => {
      let t = esc(s.t);
      if (s.added && S.italics) t = `<i class="added">${t}</i>`;
      return s.christ && S.redLetters ? `<span class="christ">${t}</span>` : t;
    }).join("").replace(/<\/span><span class="christ">/g, "");
  },
};

async function draw() {
  const top = stack[stack.length - 1];
  window.scrollTo(0, 0);
  if (!ST.words) studyPage.innerHTML = `<p class="empty"><span class="big">Opening the scriptures…</span>The first time, the study texts download (about 2 MB). After that they work offline.</p>`;
  try { await loadStudy(S.showXrefs !== false); await getBible("KJV"); }
  catch { studyPage.innerHTML = `<p class="empty"><span class="big">Could not load the study texts.</span>Connect to the internet once, then try again.</p>`; return; }
  const crumbs = stack.length > 2 ? `<nav class="crumbs" aria-label="Your path">${stack.slice(1).map((e, i) => `<button data-crumb="${i + 1}">${esc(crumbLabel(e))}</button>`).join("<span aria-hidden='true'>›</span>")}</nav>` : "";
  const head = stack.length > 1 ? `<div class="study-top"><button class="text-btn" id="studyBack">‹ Back</button>${crumbs}</div>` : "";
  let body = "";
  if (top.type === "home") body = homeHTML();
  else if (top.type === "word") body = wordHTML(top);
  else if (top.type === "verse") body = verseHTML(top);
  else if (top.type === "search") body = searchHTML(top);
  else if (top.type === "thread") body = threadHTML(top);
  studyPage.innerHTML = head + body;
  const b = $("#studyBack"); if (b) b.onclick = back;
}
function crumbLabel(e) {
  if (e.type === "word") { const [l, x] = lexWord(e.num); return x || e.num; }
  if (e.type === "verse") return refLabel(e.ref);
  if (e.type === "search") return `“${e.q}”`;
  if (e.type === "thread") return (A.threads.find((t) => t.id === e.id) || {}).title || "Thread";
  return "Study";
}
studyPage.addEventListener("click", (e) => {
  const t = e.target.closest("[data-listen],[data-listenfrom],[data-listenall],[data-crumb],[data-word],[data-verse],[data-read],[data-thread],[data-q],[data-more],[data-filter-book],[data-filter-r],[data-ctx],[data-tact]");
  if (!t) return;
  const d = t.dataset;
  if (d.crumb) { stack = stack.slice(0, +d.crumb + 1); draw(); }
  else if (d.word) go({ type: "word", num: d.word, page: 1 });
  else if (d.verse) go({ type: "verse", ref: parseKey(d.verse) });
  else if (d.read) { const r = parseKey(d.read); showView("read"); goTo(r.b, r.c, r.v); }
  else if (d.thread) go({ type: "thread", id: d.thread });
  else if (d.q) go({ type: "search", q: d.q });
  else if ("more" in d) { stack[stack.length - 1].page++; draw(); }
  else if (d.filterBook != null) { const top = stack[stack.length - 1]; top.book = top.book === +d.filterBook ? null : +d.filterBook; top.page = 1; draw(); }
  else if (d.filterR != null) { const top = stack[stack.length - 1]; top.r = top.r === d.filterR ? null : d.filterR; top.page = 1; draw(); }
  else if (d.ctx) { const box = t.closest("li").querySelector(".ctx"); box.hidden = !box.hidden; t.textContent = box.hidden ? "Context" : "Hide context"; }
  else if (d.tact) threadAction(d.tact, t);
  else if (d.listen) { const r = parseKey(d.listen); player.start(r.b, r.c, r.v, true); }        // just this verse
  else if (d.listenfrom) { const r = parseKey(d.listenfrom); player.start(r.b, r.c, r.v); }      // from here on
  else if ("listenall" in d) listenAll();
});

// ------------------------------------------------------------------ home
const GUIDES = [ // scripture's own words about how to read scripture
  ["22.27.9", "Precept upon precept; line upon line"], ["45.1.12", "Comparing spiritual things with spiritual"],
  ["43.16.10", "They searched the scriptures daily"], ["54.1.14", "Rightly dividing the word of truth"],
  ["18.118.17", "Open thou mine eyes"], ["42.15.12", "He will guide you into all truth"], ["60.0.19", "No prophecy is of any private interpretation"],
];
const FOUNDATION_WORDS = ["light", "covenant", "faith", "grace", "word", "spirit", "blood", "righteousness", "lamb", "seed", "rest", "truth"];
function homeHTML() {
  const day = Math.floor(Date.now() / 864e5) % GUIDES.length;
  const [gk] = GUIDES[day]; const g = parseKey(gk);
  return `<h1 class="page-title">Study</h1>
  <figure class="guide-verse"><blockquote>${esc(kjvText(g))}</blockquote><figcaption>${esc(refLabel(g))}</figcaption></figure>
  <form id="studySearch" role="search"><input id="studyQ" class="field" type="search" placeholder="A word to trace, or a verse (John 1:1)" aria-label="Word or verse to study" autocomplete="off" autocapitalize="off"></form>
  <h2 class="group-title">Begin at the foundation</h2>
  <p class="hint">Choose a word: see the Hebrew or Greek word behind it, where scripture first uses it, and every place it is used after.</p>
  <div class="chips">${FOUNDATION_WORDS.map((w) => `<button class="chip" data-q="${w}">${w}</button>`).join("")}</div>
  <h2 class="group-title">Your threads</h2>
  <ul class="card-list">${A.threads.length ? A.threads.map((t) => `<li class="clickable thread-card" data-thread="${t.id}" role="button" tabindex="0"><div class="ref"><span>${esc(t.title)}</span><time>${t.items.length} verse${t.items.length === 1 ? "" : "s"}</time></div>${t.items[0] ? `<p class="vt">${esc(kjvText(t.items[0].ref))}</p>` : ""}</li>`).join("")
    : `<li class="empty-card">No threads yet. While reading, tap a verse and choose <b>Add to thread</b> to link verses on one subject.</li>`}</ul>
  <h2 class="group-title">How scripture asks to be read</h2>
  <ul class="card-list">${GUIDES.map(([k]) => { const r = parseKey(k); return `<li class="clickable" data-verse="${k}" role="button" tabindex="0"><div class="ref">${esc(refLabel(r))}</div><p class="vt">${esc(kjvText(r))}</p></li>`; }).join("")}</ul>
  <p class="hint sources">What is shown here is scripture only. Behind the scenes: the Hebrew and Greek word for each English word (Strong's numbering), and verse-to-verse links agreed by many readers at OpenBible.info. Nothing explains or interprets the text.</p>`;
}
document.addEventListener("submit", (e) => {
  if (e.target.id !== "studySearch") return;
  e.preventDefault();
  const q = $("#studyQ").value.trim(); if (!q) return;
  const r = parseRef(q);
  if (r && /\d/.test(q)) go({ type: "verse", ref: { b: r.b, c: r.c, v: r.v == null ? 0 : r.v } });
  else go({ type: "search", q: q.toLowerCase() });
});

// ------------------------------------------------------------------ English word -> original words
function searchHTML(top) {
  const { idx, render } = buildIndex();
  const q = top.q.replace(/[^a-z’' -]/g, "");
  const words = q.split(" ").filter(Boolean);
  const hits = [];
  for (const n in render) {
    let count = 0;
    for (const [w, k] of Object.entries(render[n])) if (words.every((x) => new RegExp(`\\b${x}`).test(w))) count += k;
    if (count) hits.push([n, count]);
  }
  hits.sort((a, b) => b[1] - a[1]);
  if (!hits.length) return `<h1 class="page-title">“${esc(top.q)}”</h1><p class="empty">This word is not found in the King James Bible. Try another form, e.g. “believe” for “believing”.</p>`;
  const heb = hits.filter((h) => isHeb(h[0])), grk = hits.filter((h) => !isHeb(h[0]));
  const row = ([n, c]) => { const [l, x] = lexWord(n); const first = idx[n][0];
    return `<li class="clickable orig-row" data-word="${n}" role="button" tabindex="0"><span class="orig ${isHeb(n) ? "heb" : "grk"}" lang="${isHeb(n) ? "he" : "grc"}">${esc(l)}</span><span class="meta"><b>${esc(x)}</b><span>“${esc(top.q)}” ${c}× · in ${idx[n].length} verse${idx[n].length > 1 ? "s" : ""} · first: ${esc(refLabel({ b: first[0], c: first[1], v: first[2] }))}</span></span><span class="go">›</span></li>`; };
  return `<h1 class="page-title">“${esc(top.q)}”</h1>
    <p class="hint">In the King James Bible, “${esc(top.q)}” translates ${hits.length} different word${hits.length > 1 ? "s" : ""} in the original. Each one is traced separately, so you can see how scripture itself uses it.</p>
    ${heb.length ? `<h2 class="group-title">Old Testament · Hebrew</h2><ul class="card-list">${heb.slice(0, 25).map(row).join("")}</ul>` : ""}
    ${grk.length ? `<h2 class="group-title">New Testament · Greek</h2><ul class="card-list">${grk.slice(0, 25).map(row).join("")}</ul>` : ""}`;
}

// ------------------------------------------------------------------ one original word through all scripture
function wordHTML(top) {
  const { idx, render } = buildIndex();
  const n = top.num, [lemma, xlit] = lexWord(n), refs = idx[n] || [];
  const r = Object.entries(render[n] || {}).sort((a, b) => b[1] - a[1]);
  const total = r.reduce((s, x) => s + x[1], 0);
  const perBook = {}; refs.forEach(([b]) => (perBook[b] = (perBook[b] || 0) + 1));
  const maxB = Math.max(1, ...Object.values(perBook));
  const first = refs[0];
  const firstRef = first && { b: first[0], c: first[1], v: first[2] };
  let list = refs;
  if (top.book != null) list = list.filter((x) => x[0] === top.book);
  if (top.r) list = list.filter(([b, c, v]) => { let m; SEG.lastIndex = 0; const raw = ST.words[b][c][v]; while ((m = SEG.exec(raw))) if (m[2].split(" ").includes(n) && renderingOf(m[1]) === top.r) return true; return false; });
  top.list = list;
  const shown = list.slice(0, top.page * 40);
  const lastRef = refs[refs.length - 1];
  return `<header class="word-head">
      <div class="orig big ${isHeb(n) ? "heb" : "grk"}" lang="${isHeb(n) ? "he" : "grc"}">${esc(lemma)}</div>
      <div class="xlit">${esc(xlit)}</div>
      <div class="strongs">${isHeb(n) ? "Hebrew" : "Greek"} · Strong's ${n.slice(1)}</div>
    </header>
    <div class="stat-row" role="list">
      <div role="listitem"><b>${refs.length}</b><span>verses</span></div>
      <div role="listitem"><b>${Object.keys(perBook).length}</b><span>books</span></div>
      <div role="listitem"><b>${r.length}</b><span>English renderings</span></div>
    </div>
    ${firstRef ? `<h2 class="group-title">First mention — the foundation</h2>
    <ul class="card-list">${occurrence(firstRef, n, true)}</ul>` : ""}
    ${lastRef && refs.length > 1 ? `<h2 class="group-title">Last mention</h2><ul class="card-list">${occurrence({ b: lastRef[0], c: lastRef[1], v: lastRef[2] }, n)}</ul>` : ""}
    <h2 class="group-title">Rendered in the KJV as</h2>
    <div class="chips">${r.map(([w, c]) => `<button class="chip ${top.r === w ? "on" : ""}" data-filter-r="${esc(w)}" aria-pressed="${top.r === w}">${esc(w)} <small>${c}</small></button>`).join("")}</div>
    <h2 class="group-title">Where it is found</h2>
    <div class="dist" role="list" aria-label="Verses per book">${Object.entries(perBook).map(([b, c]) => `<button role="listitem" class="dist-row ${top.book === +b ? "on" : ""}" data-filter-book="${b}" aria-pressed="${top.book === +b}" aria-label="${esc(bookName(+b))}: ${c} verses"><span class="bn">${esc(shortName(+b))}</span><span class="bar"><i style="width:${(c / maxB) * 100}%"></i></span><span class="bc">${c}</span></button>`).join("")}</div>
    <button class="ghost-btn full listen" data-listenall>▶ Listen to ${list.length > 1 ? "these " + Math.min(list.length, 200) + " verses" : "this verse"} in order</button>
    <h2 class="group-title">Every verse, in order${top.book != null ? " · " + esc(bookName(top.book)) : ""}${top.r ? " · “" + esc(top.r) + "”" : ""} <small>(${list.length})</small></h2>
    <ul class="card-list">${shown.map(([b, c, v]) => occurrence({ b, c, v }, n)).join("")}</ul>
    ${list.length > shown.length ? `<button class="wide-btn ghost" data-more>Show more (${list.length - shown.length} left)</button>` : ""}`;
}
function markedVerse(ref, num) { // the KJV verse with the phrases for this word marked
  return segments(ST.words[ref.b][ref.c][ref.v]).map((s) => {
    const t = esc(s.t);
    if (s.nums && s.nums.includes(num)) return `<mark>${t}</mark>`;
    return s.added ? `<i class="added">${t}</i>` : t;
  }).join("");
}
function occurrence(ref, num, open) {
  const k = refKey(ref.b, ref.c, ref.v);
  return `<li><div class="ref"><button class="link" data-verse="${k}">${esc(refLabel(ref))}</button><span class="row-acts"><button class="mini play" data-listen="${k}" aria-label="Listen to ${esc(refLabel(ref))}">▶</button><button class="mini" data-ctx="1" aria-expanded="false">${open ? "Hide context" : "Context"}</button><button class="mini" data-tact="add" data-k="${k}" aria-label="Add ${esc(refLabel(ref))} to a thread">＋ Thread</button></span></div>
    <p class="vt">${markedVerse(ref, num)}</p><div class="ctx" ${open ? "" : "hidden"}>${contextHTML(ref)}</div></li>`;
}
function contextHTML(ref, before = 3, after = 3) {
  const ch = bibles.KJV.books[ref.b][ref.c]; let h = "";
  for (let v = Math.max(0, ref.v - before); v <= Math.min(ch.length - 1, ref.v + after); v++)
    h += `<p class="${v === ref.v ? "here" : ""}"><sup>${v + 1}</sup>${esc(ch[v])}</p>`;
  return h + `<button class="mini" data-read="${refKey(ref.b, ref.c, ref.v)}">Read the whole chapter ›</button>`;
}

// ------------------------------------------------------------------ one verse: its words and the scriptures it touches
function verseHTML(top) {
  const ref = top.ref;
  if (!ST.words[ref.b] || !ST.words[ref.b][ref.c] || ST.words[ref.b][ref.c][ref.v] == null) return `<p class="empty">That verse is not in the KJV.</p>`;
  const segs = segments(ST.words[ref.b][ref.c][ref.v]);
  const k = refKey(ref.b, ref.c, ref.v);
  const wordsLine = segs.map((s) => s.nums ? `<button class="w" data-word="${s.nums[s.nums.length - 1]}" ${s.nums.length > 1 ? `data-all="${s.nums.join(" ")}"` : ""}>${esc(s.t)}</button>` : s.added ? `<i class="added">${esc(s.t)}</i>` : esc(s.t)).join("");
  const uniq = [...new Set(segs.filter((s) => s.nums).flatMap((s) => s.nums))].filter((n) => !["H853"].includes(n));
  const xr = S.showXrefs !== false && ST.xrefs ? (ST.xrefs[ref.b][ref.c][ref.v] || "").split(" ").filter(Boolean) : [];
  return `<h1 class="page-title">${esc(refLabel(ref))}</h1>
    <p class="study-verse">${wordsLine}</p>
    <p class="hint">Tap any word to follow it through scripture. <i class="added">Words like this</i> were added by the translators to make the English read; they are not in the Hebrew or Greek.</p>
    <div class="row-btns tight"><button class="ghost-btn listen" data-listen="${k}">▶ Listen to this verse</button><button class="ghost-btn" data-listenfrom="${k}">▶ Read on from here</button><button class="ghost-btn" data-read="${k}">Read in chapter</button><button class="ghost-btn" data-tact="add" data-k="${k}">＋ Add to thread</button></div>
    <h2 class="group-title">In its place</h2>
    <div class="card ctx-card">${contextHTML(ref, 4, 4)}</div>
    <h2 class="group-title">The words of this verse</h2>
    <ul class="card-list words-list">${uniq.map((n) => { const [l, x] = lexWord(n); const seg = segs.find((s) => s.nums && s.nums.includes(n)); const c = (buildIndex().idx[n] || []).length;
      return `<li class="clickable orig-row" data-word="${n}" role="button" tabindex="0"><span class="orig ${isHeb(n) ? "heb" : "grk"}" lang="${isHeb(n) ? "he" : "grc"}">${esc(l)}</span><span class="meta"><b>“${esc(seg.t)}”</b><span>${esc(x)} · in ${c} verse${c > 1 ? "s" : ""}</span></span><span class="go">›</span></li>`; }).join("")}</ul>
    ${S.showXrefs !== false ? `<h2 class="group-title">Scripture that speaks to this verse <small>(${xr.length})</small></h2>
    ${xr.length ? `<button class="ghost-btn full listen" data-listenall>▶ Listen to this verse and the ${xr.length} linked verses</button>` : ""}
    <ul class="card-list">${xr.length ? xr.map(xrefItem).join("") : `<li class="empty-card">No linked verses for this one.</li>`}</ul>` : ""}`;
}
function xrefItem(t) {
  const [a, z] = t.split("-").map(parseKey);
  let text = "", label = refLabel(a);
  if (z && (z.b !== a.b || z.c !== a.c)) { text = kjvText(a) + " …"; label += "–" + refLabel(z); }
  else if (z) { const ch = bibles.KJV.books[a.b][a.c]; text = ch.slice(a.v, z.v + 1).map((t, i) => `${a.v + i + 1} ${t}`).join(" "); label += "–" + (z.v + 1); }
  else text = kjvText(a);
  const k = refKey(a.b, a.c, a.v);
  return `<li class="clickable" data-verse="${k}" role="button" tabindex="0"><div class="ref"><span>${esc(label)}</span><span class="row-acts"><button class="mini play" data-listen="${k}" aria-label="Listen to ${esc(label)}">▶</button><span class="go">›</span></span></div><p class="vt">${esc(text)}</p></li>`;
}

// ------------------------------------------------------------------ threads: verses you link on one subject
function threadHTML(top) {
  const t = A.threads.find((x) => x.id === top.id);
  if (!t) return `<p class="empty">This thread was deleted.</p>`;
  return `<h1 class="page-title">${esc(t.title)}</h1>
    <div class="row-btns tight"><button class="ghost-btn" data-tact="listen" data-id="${t.id}">▶ Listen</button><button class="ghost-btn" data-tact="share" data-id="${t.id}">Share</button><button class="ghost-btn" data-tact="rename" data-id="${t.id}">Rename</button><button class="ghost-btn danger" data-tact="delete" data-id="${t.id}">Delete</button></div>
    <ol class="card-list thread-list">${t.items.map((it, i) => `<li><div class="ref"><button class="link" data-verse="${refKey(it.ref.b, it.ref.c, it.ref.v)}">${i + 1}. ${esc(refLabel(it.ref))}</button>
      <span class="row-acts"><button class="mini" data-tact="up" data-i="${i}" data-id="${t.id}" aria-label="Move up" ${i ? "" : "disabled"}>↑</button><button class="mini" data-tact="down" data-i="${i}" data-id="${t.id}" aria-label="Move down" ${i < t.items.length - 1 ? "" : "disabled"}>↓</button><button class="mini" data-tact="note" data-i="${i}" data-id="${t.id}">Note</button><button class="mini" data-tact="remove" data-i="${i}" data-id="${t.id}" aria-label="Remove from thread">✕</button></span></div>
      <p class="vt">${esc(kjvText(it.ref))}</p>${it.note ? `<p class="nt">${esc(it.note)}</p>` : ""}</li>`).join("") || `<li class="empty-card">Empty. Add verses from the reader or from any study page.</li>`}</ol>`;
}
let threadTarget = null;
function openThreadSheet(ref) {
  threadTarget = ref;
  $("#threadPickTitle").textContent = "Add " + refLabel(ref) + " to…";
  $("#threadPick").innerHTML = A.threads.map((t) => { const has = t.items.some((i) => refKey(i.ref.b, i.ref.c, i.ref.v) === refKey(ref.b, ref.c, ref.v));
    return `<li><button data-th="${t.id}" ${has ? "disabled" : ""}><span class="nm">${esc(t.title)}</span><span class="muted">${has ? "already in" : t.items.length + " verses"}</span></button></li>`; }).join("");
  $("#newThreadName").value = "";
  openSheet("sheet-thread");
}
$("#threadPick").onclick = (e) => { const b = e.target.closest("[data-th]"); if (!b) return; addToThread(b.dataset.th); };
$("#newThreadForm").onsubmit = (e) => {
  e.preventDefault(); const title = $("#newThreadName").value.trim(); if (!title) return;
  const t = { id: "t" + Date.now().toString(36), title, items: [], created: Date.now(), updated: Date.now() };
  A.threads.unshift(t); addToThread(t.id);
};
function addToThread(id) {
  const t = A.threads.find((x) => x.id === id); t.items.push({ ref: { ...threadTarget }, note: "" }); t.updated = Date.now();
  saveA(); closeSheet(); toast(`Added to “${t.title}”`);
  if (currentView === "study") draw();
}
function threadAction(act, el) {
  const d = el.dataset;
  if (act === "add") return openThreadSheet(parseKey(d.k));
  const t = A.threads.find((x) => x.id === d.id); if (!t) return;
  const i = +d.i;
  if (act === "up" || act === "down") { const j = act === "up" ? i - 1 : i + 1; [t.items[i], t.items[j]] = [t.items[j], t.items[i]]; }
  else if (act === "remove") t.items.splice(i, 1);
  else if (act === "note") { const n = prompt("Your note on " + refLabel(t.items[i].ref), t.items[i].note || ""); if (n == null) return; t.items[i].note = n.trim(); }
  else if (act === "rename") { const n = prompt("Thread name", t.title); if (!n || !n.trim()) return; t.title = n.trim(); }
  else if (act === "delete") { if (!confirm(`Delete the thread “${t.title}”? The verses themselves are not affected.`)) return; A.threads = A.threads.filter((x) => x !== t); saveA(); back(); return; }
  else if (act === "share") {
    const text = t.title + "\n\n" + t.items.map((it) => `${refLabel(it.ref)} — ${kjvText(it.ref)}${it.note ? "\n   (" + it.note + ")" : ""}`).join("\n\n");
    if (navigator.share) navigator.share({ title: t.title, text }).catch(() => {}); else navigator.clipboard.writeText(text).then(() => toast("Copied"));
    return;
  }
  else if (act === "listen") { player.playList(t.items.map((i) => i.ref), t.title); return; }
  t.updated = Date.now(); saveA(); draw();
}

// ------------------------------------------------------------------ reader hooks
$("#actStudy").onclick = () => { const r = { ...selected }; closeSheet(true); openStudy({ type: "verse", ref: r }); };
$("#actThread").onclick = () => { const r = { ...selected }; closeSheet(true); openThreadSheet(r); };
studyPage.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("li[role=button]")) e.target.click(); });
