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
  const idx = {}, render = {}, cap = {};
  ST.words.forEach((book, b) => book.forEach((ch, c) => ch.forEach((raw, v) => {
    let m; SEG.lastIndex = 0;
    while ((m = SEG.exec(raw))) for (const n of m[2].split(" ")) {
      const list = idx[n] || (idx[n] = []);
      const last = list[list.length - 1];
      if (!last || last[0] !== b || last[1] !== c || last[2] !== v) list.push([b, c, v]);
      const r = render[n] || (render[n] = {}); const w = renderingOf(m[1]);
      if (w && !LEADING.test(w + " ")) {
        r[w] = (r[w] || 0) + 1;
        if (m[1].includes(w[0].toUpperCase() + w.slice(1))) cap[n] = (cap[n] || 0) + 1;   // written with a capital: a name
      }
    }
  })));
  return (ST.index = { idx, render, cap });
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
  if (top.type === "path") { const refs = []; top.steps.forEach((t) => { const r = refFrom(t); for (let v = r.v; v <= r.v2; v++) refs.push({ b: r.b, c: r.c, v }); }); return { refs, title: (PATHS.find((x) => x.id === top.id) || {}).about }; }
  if (top.type === "person") return { refs: (top.list || []).slice(0, 200).map(([b, c, v]) => ({ b, c, v })), title: top.name };
  if (top.type === "passage") return { refs: (top.back || []).slice(0, 200), title: (top.title || passageLabel(top)) + ": scripture looks back" };
  if (top.type === "home") return { refs: GUIDES.map(([k]) => parseKey(k)), title: "How scripture asks to be read" };
  if (top.type === "book") { const n = BOOK_NOTES[bookName(top.b)] || {}, refs = [];
    [...(n.writer || []), ...(n.setting || []), ...(n.purpose || []), ...(n.later || [])].forEach((t) => { const r = refFrom(t); for (let v = r.v; v <= r.v2; v++) refs.push({ b: r.b, c: r.c, v }); });
    return { refs, title: "The book of " + bookName(top.b) }; }
  if (top.type === "search") { const { idx } = buildIndex(); const firsts = Object.keys(ST.index.render).filter((n) => (ST.index.render[n][top.q] || 0) > 0)
      .map((n) => idx[n][0]).filter(Boolean).sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]).slice(0, 30).map(([b, c, v]) => ({ b, c, v }));
    return { refs: firsts, title: "First mentions of “" + top.q + "”" }; }
  if (top.type === "verse" && !(S.showXrefs !== false && ST.xrefs)) return { refs: [top.ref], title: refLabel(top.ref) };
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
    // In Study the voice reads this page's scripture, never the chapter left open in the reader.
    const l = pageList(); if (l && l.refs.length) { player.playList(l.refs, l.title); return true; }
    toast("Nothing to read aloud on this page: open a verse, word, life, event, book or path");
    return true;
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
  try { await loadStudy(S.showXrefs !== false || top.type === "passage" || top.type === "book"); await getBible("KJV"); }
  catch { studyPage.innerHTML = `<p class="empty"><span class="big">Could not load the study texts.</span>Connect to the internet once, then try again.</p>`; return; }
  const crumbs = stack.length > 2 ? `<nav class="crumbs" aria-label="Your path">${stack.slice(1).map((e, i) => `<button data-crumb="${i + 1}">${esc(crumbLabel(e))}</button>`).join("<span aria-hidden='true'>›</span>")}</nav>` : "";
  const head = stack.length > 1 ? `<div class="study-top"><button class="text-btn" id="studyBack">‹ Back</button>${crumbs}</div>` : "";
  let body = "";
  if (top.type === "home") body = homeHTML();
  else if (top.type === "word") body = wordHTML(top);
  else if (top.type === "verse") body = verseHTML(top);
  else if (top.type === "search") body = searchHTML(top);
  else if (top.type === "thread") body = threadHTML(top);
  else if (top.type === "person") body = personHTML(top);
  else if (top.type === "passage") body = passageHTML(top);
  else if (top.type === "book") body = bookHTML(top);
  else if (top.type === "path") body = pathHTML(top);
  studyPage.innerHTML = head + body;
  const b = $("#studyBack"); if (b) b.onclick = back;
}
function crumbLabel(e) {
  if (e.type === "word") { const [l, x] = lexWord(e.num); return x || e.num; }
  if (e.type === "verse") return refLabel(e.ref);
  if (e.type === "search") return `“${e.q}”`;
  if (e.type === "person") return e.name;
  if (e.type === "book") return bookName(e.b);
  if (e.type === "path") return (PATHS.find((x) => x.id === e.id) || {}).about || "Path";
  if (e.type === "passage") return e.title || passageLabel(e);
  if (e.type === "thread") return (A.threads.find((t) => t.id === e.id) || {}).title || "Thread";
  return "Study";
}
studyPage.addEventListener("click", (e) => {
  const t = e.target.closest("[data-path],[data-stepread],[data-steplisten],[data-pathcopy],[data-pathnext],[data-book],[data-person],[data-passage],[data-listen],[data-listenfrom],[data-listenall],[data-crumb],[data-word],[data-verse],[data-read],[data-thread],[data-q],[data-more],[data-filter-book],[data-filter-r],[data-ctx],[data-tact]");
  if (!t) return;
  const d = t.dataset;
  if (d.crumb) { stack = stack.slice(0, +d.crumb + 1); draw(); }
  else if (d.word) go({ type: "word", num: d.word, page: 1 });
  else if (d.verse) go({ type: "verse", ref: parseKey(d.verse) });
  else if (d.read) { const r = parseKey(d.read); showView("read"); goTo(r.b, r.c, r.v); }
  else if (d.thread) go({ type: "thread", id: d.thread });
  else if (d.person) go({ type: "person", name: d.person, page: 1 });
  else if (d.book != null) go({ type: "book", b: +d.book });
  else if (d.path) go({ type: "path", id: d.path });
  else if (d.stepread != null) markStep(d.stepread);
  else if (d.steplisten != null) { const r = refFrom(stack[stack.length - 1].steps[+d.steplisten]); const refs = []; for (let v = r.v; v <= r.v2; v++) refs.push({ b: r.b, c: r.c, v }); player.playList(refs, stack[stack.length - 1].steps[+d.steplisten]); }
  else if ("pathcopy" in d) copyPathToThread();
  else if ("pathnext" in d) { const el = studyPage.querySelector(".path-step:not(.done)"); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }); }
  else if (d.passage) { const [b, c1, c2] = d.passage.split(".").map(Number); go({ type: "passage", b, c1, c2, title: d.title || "", page: 1 }); }
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
  <h2 class="group-title">Paths into the heart of God</h2>
  <p class="hint">Readings through the whole Bible, in the order scripture gives them. Every word on a path is scripture.</p>
  <ul class="card-list path-list">${PATHS.map((x) => { const done = (A.pathRead && A.pathRead[x.id] || []).length;
    return `<li class="clickable" data-path="${x.id}" role="button" tabindex="0"><p class="path-quote">“${esc(x.title)}”</p><div class="ref"><span>${esc(x.about)}</span><span class="go">›</span></div><small class="muted">${x.steps.length} readings${done ? ` · ${done} read` : ""} · ${esc(x.from)}</small>${done ? `<span class="path-bar"><i style="width:${(done / x.steps.length) * 100}%"></i></span>` : ""}</li>`; }).join("")}</ul>
  <h2 class="group-title">The books</h2>
  <p class="hint">Each book introduced in scripture's own words: who wrote it, when and where, and why, as the Bible itself records.</p>
  <div class="book-mini">${BOOKS.map((x, i) => `<button data-book="${i}" class="${i === NT_START ? "nt-start" : ""}">${esc(shortName(i))}</button>`).join("")}</div>
  <h2 class="group-title">Lives &amp; events</h2>
  <p class="hint">Follow a life or an event through the whole Bible: where scripture foretells it, tells it, remembers it, and explains it. Type any name in the box above, or choose:</p>
  <div class="chips">${PEOPLE.map((n) => `<button class="chip" data-person="${n}">${n}</button>`).join("")}</div>
  <ul class="card-list event-list">${EVENTS.map(([t, b, c1, c2]) => `<li class="clickable" data-passage="${b}.${c1}.${c2}" data-title="${esc(t)}" role="button" tabindex="0"><div class="ref"><span>${esc(t)}</span><span class="go">›</span></div><small class="muted">${esc(passageLabel({ b, c1, c2 }))}</small></li>`).join("")}</ul>
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
  const person = personNums(top.q).length ? `<ul class="card-list"><li class="clickable person-card" data-person="${esc(cap1(top.q))}" role="button" tabindex="0"><div class="ref"><span>Follow the life of ${esc(cap1(top.q))}</span><span class="go">›</span></div><small class="muted">Their story, and every place scripture speaks of them again</small></li></ul>` : "";
  return `<h1 class="page-title">“${esc(top.q)}”</h1>${person}
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
function markedVerse(ref, num) { // the KJV verse with the phrases for this word (or these words) marked
  const want = [].concat(num);
  return segments(ST.words[ref.b][ref.c][ref.v]).map((s) => {
    const t = esc(s.t);
    if (s.nums && s.nums.some((n) => want.includes(n))) return `<mark>${t}</mark>`;
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
    <div class="row-btns tight"><button class="ghost-btn listen" data-listen="${k}">▶ Listen to this verse</button><button class="ghost-btn" data-listenfrom="${k}">▶ Read on from here</button><button class="ghost-btn" data-read="${k}">Read in chapter</button><button class="ghost-btn" data-tact="add" data-k="${k}">＋ Add to thread</button><button class="ghost-btn full" data-book="${ref.b}">About the book of ${esc(bookName(ref.b))} ›</button><button class="ghost-btn full" data-passage="${ref.b}.${ref.c}.${ref.c}" data-title="${esc(bookName(ref.b) + " " + (ref.c + 1))}">What scripture says of ${esc(bookName(ref.b))} ${ref.c + 1}, before and after ›</button></div>
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

// ------------------------------------------------------------------ lives and events
// Starting points only: the names are the Bible's own, the passages are whole chapters as printed.
const PEOPLE = ["Adam", "Noah", "Abraham", "Sarah", "Isaac", "Jacob", "Joseph", "Moses", "Aaron", "Joshua", "Ruth", "Samuel",
  "David", "Solomon", "Elijah", "Elisha", "Isaiah", "Jeremiah", "Daniel", "Jonah", "Jesus", "Peter", "Paul"];
const EVENTS = [ // [title, book, first chapter, last chapter] (0-based)
  ["The creation", 0, 0, 1], ["The fall", 0, 2, 2], ["The flood", 0, 5, 8], ["The call of Abram", 0, 11, 11],
  ["God's covenant with Abraham", 0, 14, 16], ["The offering of Isaac", 0, 21, 21], ["Joseph in Egypt", 0, 36, 49],
  ["Moses: birth and calling", 1, 0, 3], ["The plagues of Egypt", 1, 6, 10], ["The passover", 1, 11, 11], ["Through the Red sea", 1, 13, 14],
  ["Bread from heaven", 1, 15, 15], ["Sinai and the law", 1, 18, 19], ["The tabernacle", 1, 24, 30], ["The golden calf", 1, 31, 31],
  ["The day of atonement", 2, 15, 15], ["The serpent of brass", 3, 20, 20], ["Jericho", 5, 5, 5], ["David and Goliath", 8, 16, 16],
  ["God's covenant with David", 9, 6, 6], ["The temple of Solomon", 10, 5, 7], ["Elijah on mount Carmel", 10, 17, 17],
  ["The fall of Jerusalem", 11, 24, 24], ["The return from captivity", 14, 0, 0], ["The suffering servant", 22, 52, 52],
  ["Daniel in Babylon", 26, 0, 5], ["Jonah and Nineveh", 31, 0, 3], ["The birth of Jesus", 41, 0, 1], ["The sermon on the mount", 39, 4, 6],
  ["The crucifixion", 42, 18, 18], ["The resurrection", 42, 19, 19], ["The day of Pentecost", 43, 1, 1], ["The conversion of Saul", 43, 8, 8],
  ["A new heaven and a new earth", 65, 20, 21],
];
// The same person under another name: an earlier name, or the New Testament's Greek spelling of the name.
const ALIASES = { abraham: ["abram"], sarah: ["sarai", "sara@G"], paul: ["saul@G"], elijah: ["elias@G"], elisha: ["eliseus@G"],
  isaiah: ["esaias@G"], jeremiah: ["jeremy@G", "jeremias@G"], noah: ["noe@G"], jonah: ["jonas@G"], hosea: ["osee@G"],
  joshua: [], korah: ["core@G"], rahab: ["rachab@G"], judah: ["juda@G"] };
const cap1 = (w) => w.trim().replace(/\b\w/g, (c) => c.toUpperCase());
const passageLabel = (p) => `${bookName(p.b)} ${p.c1 + 1}${p.c2 > p.c1 ? "–" + (p.c2 + 1) : ""}`;
function personNums(name) { // the Hebrew and Greek words the KJV renders as this name (written with a capital)
  const { render, cap } = buildIndex(), want = [name.toLowerCase().trim()];
  for (const a of ALIASES[want[0]] || []) want.push(a);
  const out = [];
  for (const n in render) {
    for (const w of want) {
      const [word, only] = w.split("@");
      if (only && n[0] !== only) continue;
      const c = render[n][word] || 0, total = Object.values(render[n]).reduce((x, y) => x + y, 0);
      if (c >= 2 && c / total >= 0.6 && (cap[n] || 0) >= c * 0.8) out.push(n);
    }
  }
  return [...new Set(out)];
}
function chapterBlocks(refs) { // where a life is told: runs of chapters that speak of them again and again
  const per = new Map();
  refs.forEach(([b, c]) => per.set(b * 1000 + c, (per.get(b * 1000 + c) || 0) + 1));
  const keys = [...per.keys()].sort((x, y) => x - y), blocks = [];
  for (const k of keys) {
    if (per.get(k) < 2) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.b === Math.floor(k / 1000) && k % 1000 - last.c2 <= 2) { last.c2 = k % 1000; last.n += per.get(k); }
    else blocks.push({ b: Math.floor(k / 1000), c1: k % 1000, c2: k % 1000, n: per.get(k) });
  }
  return blocks.filter((x) => x.n >= 4);
}
function personHTML(top) {
  const nums = personNums(top.name), { idx } = buildIndex();
  if (!nums.length) return `<h1 class="page-title">${esc(top.name)}</h1><p class="empty">This name is not found in the King James Bible. Check the spelling (for example “Elijah”, or “Elias” in the New Testament).</p>`;
  const seen = new Set(), refs = [];
  nums.forEach((n) => idx[n].forEach((r) => { const k = r.join("."); if (!seen.has(k)) { seen.add(k); refs.push(r); } }));
  refs.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
  top.list = refs;
  // The story is told in the books where they are first named and named most; everywhere else scripture speaks of them again.
  const firstNT = refs[0][0] >= NT_START;
  const blocks = chapterBlocks(refs).filter((x) => (x.b >= NT_START) === firstNT);
  const storyBooks = new Set(blocks.length ? blocks.map((x) => x.b) : [refs[0][0]]);
  const elsewhere = refs.filter(([b]) => !storyBooks.has(b));
  const nt = elsewhere.filter(([b]) => b >= NT_START), otLater = elsewhere.filter(([b]) => b < NT_START);
  const books = new Set(refs.map((r) => r[0])).size;
  const first = { b: refs[0][0], c: refs[0][1], v: refs[0][2] };
  const shown = (list, n) => list.slice(0, n).map(([b, c, v]) => occurrence({ b, c, v }, nums)).join("");
  return `<header class="word-head">
      <div class="orig-names">${nums.map((n) => `<button class="orig ${isHeb(n) ? "heb" : "grk"}" lang="${isHeb(n) ? "he" : "grc"}" data-word="${n}" title="${esc(lexWord(n)[1])}">${esc(lexWord(n)[0])}</button>`).join("")}</div>
      <h1 class="page-title center">${esc(top.name)}</h1>
      <div class="strongs">Named in ${refs.length} verses · ${books} books</div>
    </header>
    <p class="hint">Every verse where this name is written. Where scripture gives the same name to more than one person, all are shown; each verse's context makes plain who is meant.</p>
    <button class="ghost-btn full listen" data-listenall>▶ Listen to every verse that names ${esc(top.name)} (${Math.min(refs.length, 200)})</button>
    <h2 class="group-title">First mention — the foundation</h2>
    <ul class="card-list">${occurrence(first, nums, true)}</ul>
    <h2 class="group-title">Where the story is told</h2>
    <ul class="card-list">${blocks.map((x) => `<li class="clickable" data-passage="${x.b}.${x.c1}.${x.c2}" data-title="${esc(top.name)}: ${esc(passageLabel(x))}" role="button" tabindex="0"><div class="ref"><span>${esc(passageLabel(x))}</span><span class="go">›</span></div><small class="muted">named ${x.n} times · what scripture says of it before and after</small></li>`).join("") || `<li class="empty-card">Named only here and there; see every verse below.</li>`}</ul>
    ${otLater.length ? `<h2 class="group-title">${firstNT ? "Foretold or named in the Old Testament" : "Spoken of elsewhere in the Old Testament"} <small>(${otLater.length})</small></h2><ul class="card-list">${shown(otLater, 30)}</ul>` : ""}
    ${nt.length ? `<h2 class="group-title">${firstNT ? "Spoken of elsewhere in the New Testament" : "Spoken of in the New Testament"} <small>(${nt.length})</small></h2><ul class="card-list">${shown(nt, 60)}</ul>` : ""}
    <h2 class="group-title">Where the name is found</h2>
    ${distHTML(refs, top)}
    <h2 class="group-title">Every verse, in order${top.book != null ? " · " + esc(bookName(top.book)) : ""} <small>(${(top.book != null ? refs.filter((r) => r[0] === top.book) : refs).length})</small></h2>
    <ul class="card-list">${(top.book != null ? refs.filter((r) => r[0] === top.book) : refs).slice(0, top.page * 40).map(([b, c, v]) => occurrence({ b, c, v }, nums)).join("")}</ul>
    ${(top.book != null ? refs.filter((r) => r[0] === top.book) : refs).length > top.page * 40 ? `<button class="wide-btn ghost" data-more>Show more</button>` : ""}`;
}
function distHTML(refs, top) {
  const per = {}; refs.forEach(([b]) => (per[b] = (per[b] || 0) + 1));
  const max = Math.max(1, ...Object.values(per));
  return `<div class="dist" role="list" aria-label="Verses per book">${Object.entries(per).map(([b, c]) => `<button role="listitem" class="dist-row ${top.book === +b ? "on" : ""}" data-filter-book="${b}" aria-pressed="${top.book === +b}" aria-label="${esc(bookName(+b))}: ${c} verses"><span class="bn">${esc(shortName(+b))}</span><span class="bar"><i style="width:${(c / max) * 100}%"></i></span><span class="bc">${c}</span></button>`).join("")}</div>`;
}

// Verses elsewhere that point to a passage: scripture's own foretelling, remembering and explaining of it.
let reverseLinks = null;
function buildReverse() {
  if (reverseLinks) return reverseLinks;
  reverseLinks = new Map();
  ST.xrefs.forEach((book, b) => book.forEach((ch, c) => ch.forEach((line, v) => {
    if (!line) return;
    for (const t of line.split(" ")) {
      const [tb, tc, tv] = t.split("-")[0].split(".").map(Number);
      const key = tb * 1000 + tc;
      let list = reverseLinks.get(key); if (!list) reverseLinks.set(key, (list = []));
      list.push([b, c, v, tv]);
    }
  })));
  return reverseLinks;
}
// Phrases with which scripture gives a reason or purpose. The verses are shown as written, with the phrase marked.
const REASONS = /\b(that (?:ye|they|thou|he|she|it|we|all|men|the \w+|my people|this people) (?:may|might|shall|should) (?:know|learn|fear|believe|understand|serve|see|remember|live|hear|keep|walk|be)|(?:for|because of) (?:my|his|thy|thine|mine|thine own|mine own|his own) (?:name'?s'?|names'?|holy name's|own) sake|for (?:mine|his|thine) own sake|to the (?:intent|end) that|that i (?:might|may) (?:shew|show|be glorified|bring|make|dwell|know|prove|humble)|that the scripture(?:s)? might be fulfilled|that it might be fulfilled|to prove thee|to humble thee|that my name may|for this cause|to this end)\b/i;
function reasonVerses(p) {
  const out = [];
  for (let c = p.c1; c <= p.c2; c++) bibles.KJV.books[p.b][c].forEach((t, v) => { const m = t.match(REASONS); if (m) out.push({ b: p.b, c, v, m: m[0] }); });
  return out;
}
function passageHTML(top) {
  const p = top, rev = buildReverse(), inside = (b, c) => b === p.b && c >= p.c1 && c <= p.c2;
  const back = [];
  for (let c = p.c1; c <= p.c2; c++) (rev.get(p.b * 1000 + c) || []).forEach(([b, sc, v, tv]) => { if (!inside(b, sc)) back.push({ b, c: sc, v, to: { b: p.b, c, v: tv } }); });
  const seen = new Set(), uniq = back.filter((x) => { const k = refKey(x.b, x.c, x.v); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((x, y) => x.b - y.b || x.c - y.c || x.v - y.v);
  top.back = uniq;
  const before = uniq.filter((x) => x.b < p.b || (x.b === p.b && x.c < p.c1));
  const sameAfter = uniq.filter((x) => x.b === p.b && x.c > p.c2);
  const laterOT = uniq.filter((x) => x.b > p.b && x.b < NT_START);
  const nt = uniq.filter((x) => x.b >= NT_START && (p.b < NT_START || x.b !== p.b));
  const reasons = reasonVerses(p);
  const item = (x) => { const k = refKey(x.b, x.c, x.v);
    return `<li><div class="ref"><button class="link" data-verse="${k}">${esc(refLabel(x))}</button><span class="row-acts"><button class="mini play" data-listen="${k}" aria-label="Listen to ${esc(refLabel(x))}">▶</button><button class="mini" data-ctx="1">Context</button><button class="mini" data-tact="add" data-k="${k}" aria-label="Add to a thread">＋ Thread</button></span></div>
      <p class="vt">${esc(kjvText(x))}</p><small class="points">points to <button class="link" data-verse="${refKey(x.to.b, x.to.c, x.to.v)}">${esc(refLabel(x.to))}</button></small><div class="ctx" hidden>${contextHTML(x)}</div></li>`; };
  const group = (title, list, n = 40) => list.length ? `<h2 class="group-title">${title} <small>(${list.length})</small></h2><ul class="card-list">${list.slice(0, n * top.page).map(item).join("")}</ul>${list.length > n * top.page ? `<button class="wide-btn ghost" data-more>Show more</button>` : ""}` : "";
  const ntPassage = p.b >= NT_START;
  return `<h1 class="page-title">${esc(top.title || passageLabel(p))}</h1>
    <p class="hint">${esc(passageLabel(p))}. What scripture says of this, before and after, in its own words.</p>
    <div class="row-btns tight"><button class="ghost-btn" data-read="${refKey(p.b, p.c1, 0)}">Read ${esc(passageLabel(p))}</button><button class="ghost-btn listen" data-listenfrom="${refKey(p.b, p.c1, 0)}">▶ Listen to it</button>${uniq.length ? `<button class="ghost-btn listen" data-listenall>▶ Listen to what scripture says of it</button>` : ""}</div>
    ${reasons.length ? `<h2 class="group-title">Reasons given in the text <small>(${reasons.length})</small></h2>
      <p class="hint">Verses in ${esc(passageLabel(p))} that state a reason or purpose (“that ye may know…”, “for my name's sake”, “to the intent that…”), as written.</p>
      <ul class="card-list">${reasons.map((x) => { const k = refKey(x.b, x.c, x.v); const t = esc(kjvText(x)).replace(esc(x.m), `<mark>${esc(x.m)}</mark>`);
        return `<li><div class="ref"><button class="link" data-verse="${k}">${esc(refLabel(x))}</button><span class="row-acts"><button class="mini play" data-listen="${k}" aria-label="Listen">▶</button></span></div><p class="vt">${t}</p></li>`; }).join("")}</ul>` : ""}
    ${group(ntPassage ? "Foretold in the Old Testament" : "Foretold beforehand", before)}
    ${group("Later in the same book", sameAfter, 20)}
    ${group("Remembered later in the Old Testament", laterOT)}
    ${group(ntPassage ? "Elsewhere in the New Testament" : "Explained in the New Testament", nt, 60)}
    ${!uniq.length ? `<p class="empty">No other verses are linked to this passage.</p>` : ""}
    <p class="hint sources">Linked by the verse-to-verse cross-references; each verse shows the place it points to.</p>`;
}

// ------------------------------------------------------------------ the books, in their own words
const DIVINE = new Set(["H430", "H3068", "H136", "H3069", "H410", "H433", "H3050", "G2316", "G2962"]); // God and LORD: not counted as people
function refFrom(text) { // "1 Samuel 10:25" or "Luke 1:1-4" -> {b, c, v, v2}
  const m = text.match(/^(.+) (\d+):(\d+)(?:-(\d+))?$/); const b = BOOKS.findIndex((x) => x[0] === m[1]);
  return { b, c: +m[2] - 1, v: +m[3] - 1, v2: m[4] ? +m[4] - 1 : +m[3] - 1 };
}
function quoteList(refs) {
  return `<ul class="card-list">${refs.map((t) => { const r = refFrom(t); const k = refKey(r.b, r.c, r.v);
    const text = bibles.KJV.books[r.b][r.c].slice(r.v, r.v2 + 1).map((x, i) => (r.v2 > r.v ? `<sup>${r.v + i + 1}</sup>` : "") + esc(x)).join(" ");
    return `<li><div class="ref"><button class="link" data-verse="${k}">${esc(t)}</button><span class="row-acts"><button class="mini play" data-listen="${k}" aria-label="Listen to ${esc(t)}">▶</button><button class="mini" data-ctx="1">Context</button></span></div><p class="vt">${text}</p><div class="ctx" hidden>${contextHTML(r)}</div></li>`; }).join("")}</ul>`;
}
function bookHTML(top) {
  const b = top.b, name = bookName(b), notes = BOOK_NOTES[name] || {}, book = bibles.KJV.books[b];
  const verses = book.reduce((n, ch) => n + ch.length, 0), words = book.reduce((n, ch) => n + ch.reduce((m, t) => m + t.split(/\s+/).length, 0), 0);
  // the people named most in this book (names are the Hebrew/Greek words the KJV writes with a capital)
  const { render, cap } = buildIndex(), count = {};
  ST.words[b].forEach((ch) => ch.forEach((raw) => { let m; SEG.lastIndex = 0; while ((m = SEG.exec(raw))) for (const n of m[2].split(" ")) {
    if (DIVINE.has(n) || !cap[n]) continue;
    const total = Object.values(render[n] || {}).reduce((x, y) => x + y, 0);
    if (cap[n] / total < 0.8) continue;
    const w = Object.entries(render[n]).sort((x, y) => y[1] - x[1])[0][0];
    count[w] = (count[w] || 0) + 1;
  } }));
  const people = Object.entries(count).filter(([w]) => w.length > 2 && !["red", "most", "high"].includes(w)).sort((x, y) => y[1] - x[1]).slice(0, 14);
  // the rest of scripture and this book: which books point to it, and which it points to
  const rev = buildReverse(), from = {}, to = {};
  book.forEach((ch, c) => (rev.get(b * 1000 + c) || []).forEach(([sb]) => { if (sb !== b) from[sb] = (from[sb] || 0) + 1; }));
  ST.xrefs[b].forEach((ch) => ch.forEach((line) => line && line.split(" ").forEach((t) => { const tb = +t.split(".")[0]; if (tb !== b) to[tb] = (to[tb] || 0) + 1; })));
  const top8 = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, 8);
  const bars = (list) => { const max = Math.max(1, ...list.map((x) => x[1]));
    return `<div class="dist">${list.map(([bk, n]) => `<button class="dist-row" data-book="${bk}"><span class="bn">${esc(shortName(+bk))}</span><span class="bar"><i style="width:${(n / max) * 100}%"></i></span><span class="bc">${n}</span></button>`).join("")}</div>`; };
  const last = book.length - 1;
  const writerTitle = notes.unnamed ? (notes.writer ? "Who wrote it — the writer speaks, but scripture does not give the name" : "Who wrote it — scripture does not name the writer") : "Who wrote it, in scripture's own words";
  return `<header class="word-head">
      <p class="book-title">${esc(bookPart(b))}</p>
      <h1 class="page-title center">${esc(name)}</h1>
      ${KJV_TITLES[b] ? `<p class="book-sub">${esc(KJV_TITLES[b])}</p>` : ""}
    </header>
    <div class="stat-row" role="list"><div role="listitem"><b>${book.length}</b><span>chapter${book.length > 1 ? "s" : ""}</span></div><div role="listitem"><b>${verses.toLocaleString()}</b><span>verses</span></div><div role="listitem"><b>${words.toLocaleString()}</b><span>words</span></div></div>
    <div class="row-btns tight"><button class="ghost-btn" data-read="${refKey(b, 0, 0)}">Read ${esc(name)}</button><button class="ghost-btn listen" data-listenfrom="${refKey(b, 0, 0)}">▶ Listen from the beginning</button></div>
    <h2 class="group-title">${writerTitle}</h2>
    ${notes.writer ? quoteList(notes.writer) : `<p class="hint">The book does not say who wrote it, and no other book of scripture names its writer. Read it as the Bible gives it.</p>`}
    ${notes.setting ? `<h2 class="group-title">When and where</h2>${quoteList(notes.setting)}` : ""}
    ${notes.purpose ? `<h2 class="group-title">Why it was written, or what it is for</h2>${quoteList(notes.purpose)}` : ""}
    ${notes.later ? `<h2 class="group-title">How the rest of scripture speaks of it</h2>${quoteList(notes.later)}` : ""}
    <h2 class="group-title">How it begins</h2>${quoteList([`${name} 1:1`])}
    <h2 class="group-title">How it ends</h2>${quoteList([`${name} ${last + 1}:${book[last].length}`])}
    ${people.length ? `<h2 class="group-title">Names written most: people and places</h2><div class="chips">${people.map(([w, n]) => `<button class="chip" data-person="${esc(cap1(w))}">${esc(cap1(w))} <small>${n}</small></button>`).join("")}</div>` : ""}
    <h2 class="group-title">Books that point to ${esc(name)} most</h2>${bars(top8(from))}
    <h2 class="group-title">Books ${esc(name)} points to most</h2>${bars(top8(to))}
    <h2 class="group-title">Each chapter, before and after</h2>
    <p class="hint">Open a chapter to see what the rest of scripture says of it.</p>
    <div class="chapter-grid book-chapters">${book.map((_, c) => `<button data-passage="${b}.${c}.${c}" data-title="${esc(name)} ${c + 1}" aria-label="${esc(name)} chapter ${c + 1}">${c + 1}</button>`).join("")}</div>
    <p class="hint sources">Every line above is scripture or is counted from it. Nothing is added about dates, places or writers that the Bible does not itself say.</p>`;
}

// ------------------------------------------------------------------ paths
function pathHTML(top) {
  const path = PATHS.find((x) => x.id === top.id); if (!path) return `<p class="empty">This path was not found.</p>`;
  top.steps = path.steps;
  A.pathRead = A.pathRead || {};
  const read = new Set(A.pathRead[path.id] || []);
  const from = refFrom(path.from);
  return `<figure class="guide-verse"><blockquote>“${esc(path.title)}”</blockquote><figcaption>${esc(path.from)}</figcaption></figure>
    <h1 class="page-title">${esc(path.about)}</h1>
    <p class="hint">${path.steps.length} readings, in the order they come in the Bible, from ${esc(path.steps[0])} to ${esc(path.steps[path.steps.length - 1])}. Read slowly; open any reading to study its words and the scriptures linked to it.</p>
    <div class="path-progress"><span class="path-bar"><i style="width:${(read.size / path.steps.length) * 100}%"></i></span><small>${read.size} of ${path.steps.length} read</small></div>
    <div class="row-btns tight"><button class="ghost-btn listen" data-listenall>▶ Listen to the whole path</button>${read.size && read.size < path.steps.length ? `<button class="ghost-btn" data-pathnext>Continue where I left off</button>` : ""}<button class="ghost-btn" data-pathcopy>Copy to my threads</button></div>
    <ol class="card-list path-steps">${path.steps.map((t, i) => { const r = refFrom(t), k = refKey(r.b, r.c, r.v);
      const text = bibles.KJV.books[r.b][r.c].slice(r.v, r.v2 + 1).map((x, j) => `${r.v2 > r.v ? `<sup>${r.v + j + 1}</sup>` : ""}${esc(x)}`).join(" ");
      return `<li class="path-step ${read.has(i) ? "done" : ""}" id="step-${i}">
        <div class="ref"><button class="link" data-verse="${k}">${i + 1}. ${esc(t)}</button><span class="row-acts"><button class="mini play" data-steplisten="${i}" aria-label="Listen to ${esc(t)}">▶</button><button class="mini" data-ctx="1">Context</button><button class="mini ${read.has(i) ? "on" : ""}" data-stepread="${i}" aria-pressed="${read.has(i)}">${read.has(i) ? "✓ Read" : "Mark read"}</button></span></div>
        <p class="vt">${text}</p><div class="ctx" hidden>${contextHTML(r, 4, 4)}</div>
        <div class="step-more"><button class="link" data-verse="${k}">Study the words of ${esc(t.split("-")[0])} ›</button><button class="link" data-passage="${r.b}.${r.c}.${r.c}" data-title="${esc(bookName(r.b))} ${r.c + 1}">What scripture says of ${esc(bookName(r.b))} ${r.c + 1} ›</button></div></li>`; }).join("")}</ol>
    <p class="hint sources">A path only sets a reading order. Make your own with threads: tap any verse while reading and choose Add to thread.</p>`;
}
function markStep(i) {
  const top = stack[stack.length - 1]; i = +i;
  A.pathRead = A.pathRead || {}; const list = new Set(A.pathRead[top.id] || []);
  list.has(i) ? list.delete(i) : list.add(i);
  A.pathRead[top.id] = [...list].sort((x, y) => x - y); saveA();
  const y = window.scrollY; draw().then(() => window.scrollTo(0, y));
}
function copyPathToThread() {
  const top = stack[stack.length - 1], path = PATHS.find((x) => x.id === top.id);
  const t = { id: "t" + Date.now().toString(36), title: path.about, items: path.steps.map((s) => { const r = refFrom(s); return { ref: { b: r.b, c: r.c, v: r.v }, note: "" }; }), created: Date.now(), updated: Date.now() };
  A.threads.unshift(t); saveA(); toast(`Copied to your threads as “${t.title}”: add, remove and reorder it there`);
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
