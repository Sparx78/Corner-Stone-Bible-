# Scripture — a King James Bible app for iPhone

Read, listen and take notes. The King James Version is the main text, and five more public-domain versions
can be added from Settings. No App Store, no Apple developer account, no sign-in: it is a web app that you
add to your Home Screen. Once added, it opens full-screen like any other app and works with no connection.

| | |
|---|---|
| **Read** | KJV built in (with "LORD" in capitals and the Psalm titles as printed). Swipe left/right between chapters. Book and chapter picker, search by words or by reference ("jn 3:16", "ps 23", "1 cor 13"). |
| **More versions** | Berean Standard Bible (modern English), American Standard (1901), Young's Literal, Bible in Basic English, Webster. Download once in Settings → they work offline. Show any one **side by side** with the KJV, or **Compare** one verse across all of them. |
| **Listen** | Voxly recordings (Kokoro voice, made on your computer, see [VOXLY-AUDIO.md](VOXLY-AUDIO.md)) — or the iPhone's own voice whenever there is no recording. The verse being read is highlighted and the page follows along. Speed 0.75×–2×, next/previous verse, carries on to the next chapter, lock-screen controls for Voxly audio. Long-press the speed button for a sleep timer. |
| **Notes** | Tap any verse: highlight (5 colours), bookmark, write a note, copy, share, listen from here. Journal entries not tied to a verse. Titles and tags, search across your notes, dictation with the keyboard microphone. Unsaved notes survive the app being closed. **Export backup** / **Restore backup** as a file. |
| **Comfortable** | Ivory, Parchment, Night or Auto theme; text size 15–34 pt; line spacing; serif, sans or extra-readable typeface; paragraph or verse-per-line layout. VoiceOver labels on every control, honours Reduce Motion and Increase Contrast. |

## Put it on your iPhone

The app has to be served from an **https** web address once; after that it lives on the phone.
The simplest free option that needs no account set-up beyond an email address:

1. **Netlify Drop** — go to <https://app.netlify.com/drop> on a computer and drag the whole `bible-app` folder onto the page.
   You get an address like `https://something.netlify.app`. (Cloudflare Pages works the same way and is better
   for the whole-Bible audio; see VOXLY-AUDIO.md.)
2. On the iPhone, open that address in **Safari**.
3. Tap **Share** (the square with an arrow) → **Add to Home Screen** → **Add**.
4. Open **Scripture** from the Home Screen. It downloads the KJV the first time; from then on it works in flight mode.

Keep your notes safe: they live only on the phone. Use **Notes → Export backup** now and then (saves to Files,
iCloud Drive, Mail…). **Restore backup** brings them back on a new phone.

> Always open it from the Home Screen icon. Safari tabs and the Home Screen app keep separate storage on iOS,
> so notes made in a Safari tab will not appear in the app.

## Updating the app

Upload the folder again to the same site. When you change any app file, also change the version name at the top of
`sw.js` (`scripture-shell-v1` → `v2`) so phones fetch the new files; they pick it up the next time the app is opened twice.

## Files

```
index.html  styles.css  app.js     the app (plain HTML/CSS/JavaScript, no build step)
sw.js  manifest.webmanifest        offline support and Home Screen icon
data/<ID>.json  data/versions.json Bible texts (one file per version) and the list shown in Settings
icons/                             app icon
audio/<VERSION>/<book>/<ch>.mp3    Voxly recordings, made with tools/voxly_bible_audio.py (not included)
tools/build_data.py                rebuilds data/ from the public-domain sources
tools/voxly_bible_audio.py         records chapters with Voxly on your computer
tools/make_icons.py                redraws the icon
```

## Texts and rights

All Bible texts are from public, open collections:
[scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) for every version, and
[aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) for the KJV words (it keeps the small-capital "LORD").
BSB, ASV, YLT, BBE and Webster are public domain. The KJV is public domain everywhere except the United Kingdom,
where the Crown's rights in it are administered by Cambridge University Press; using it for your own reading is fine,
but ask before publishing the app to others in the UK.

To add another version: put it in `VERSIONS` in `tools/build_data.py`, rerun it, and the app lists it in Settings.
