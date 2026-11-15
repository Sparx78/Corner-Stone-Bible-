/* The books of the Bible, introduced in scripture's own words.
   Each entry only points to verses: where a book (or a later book) says who wrote it, when and where,
   and why. Where scripture does not name a writer, the introduction says so and adds nothing.
   writer: verses that name the writer or the one who wrote it down
   setting: verses that give the time and place
   purpose: verses that say why it was written, or what it is for
   later: verses elsewhere in scripture that speak of this book or its writer as scripture */
"use strict";

const BOOK_NOTES = {
  "Genesis": { setting: ["Genesis 2:4", "Genesis 5:1"], later: ["Luke 24:27", "John 5:46-47", "John 1:45"], unnamed: true },
  "Exodus": { writer: ["Exodus 17:14", "Exodus 24:4", "Exodus 34:27"], setting: ["Exodus 1:1", "Exodus 19:1"], later: ["Mark 12:26", "Luke 20:37"] },
  "Leviticus": { writer: ["Leviticus 1:1"], setting: ["Leviticus 27:34"], purpose: ["Leviticus 11:44-45", "Leviticus 20:26"] },
  "Numbers": { writer: ["Numbers 33:2"], setting: ["Numbers 1:1", "Numbers 36:13"], purpose: ["1 Corinthians 10:11"] },
  "Deuteronomy": { writer: ["Deuteronomy 31:9", "Deuteronomy 31:24"], setting: ["Deuteronomy 1:1-5"], purpose: ["Deuteronomy 31:26", "Deuteronomy 6:6-7", "Deuteronomy 17:18-19"], later: ["Joshua 8:31", "Matthew 4:4"] },
  "Joshua": { writer: ["Joshua 24:26"], setting: ["Joshua 1:1-2"], purpose: ["Joshua 1:8", "Joshua 4:24"] },
  "Judges": { setting: ["Judges 2:10", "Judges 21:25"], purpose: ["Judges 2:20-22"], unnamed: true },
  "Ruth": { setting: ["Ruth 1:1"], purpose: ["Ruth 4:17", "Matthew 1:5"], unnamed: true },
  "1 Samuel": { writer: ["1 Samuel 10:25", "1 Chronicles 29:29"], setting: ["1 Samuel 1:1"], unnamed: true },
  "2 Samuel": { writer: ["1 Chronicles 29:29"], setting: ["2 Samuel 1:1"], unnamed: true },
  "1 Kings": { writer: ["1 Kings 11:41", "1 Kings 14:19", "1 Kings 14:29"], setting: ["1 Kings 1:1"], unnamed: true },
  "2 Kings": { writer: ["2 Kings 1:18"], setting: ["2 Kings 25:27"], purpose: ["2 Kings 17:7", "2 Kings 17:13"], unnamed: true },
  "1 Chronicles": { writer: ["1 Chronicles 9:1", "1 Chronicles 29:29"], setting: ["1 Chronicles 1:1"], unnamed: true },
  "2 Chronicles": { writer: ["2 Chronicles 9:29", "2 Chronicles 32:32"], setting: ["2 Chronicles 36:20-23"], purpose: ["2 Chronicles 7:14", "2 Chronicles 36:21"], unnamed: true },
  "Ezra": { writer: ["Ezra 7:6", "Ezra 7:10"], setting: ["Ezra 1:1"], purpose: ["Ezra 7:10"] },
  "Nehemiah": { writer: ["Nehemiah 1:1"], setting: ["Nehemiah 1:1", "Nehemiah 2:1"], purpose: ["Nehemiah 8:8"] },
  "Esther": { writer: ["Esther 9:20", "Esther 9:32"], setting: ["Esther 1:1-3"], purpose: ["Esther 4:14", "Esther 9:28"], unnamed: true },
  "Job": { setting: ["Job 1:1"], purpose: ["James 5:11"], later: ["Ezekiel 14:14"], unnamed: true },
  "Psalms": { writer: ["2 Samuel 23:1-2", "Acts 4:25", "Psalms 72:20"], purpose: ["Luke 24:44", "Colossians 3:16"], later: ["Luke 20:42", "Acts 1:20"] },
  "Proverbs": { writer: ["Proverbs 1:1", "Proverbs 25:1", "Proverbs 30:1", "Proverbs 31:1", "1 Kings 4:32"], purpose: ["Proverbs 1:2-6"] },
  "Ecclesiastes": { writer: ["Ecclesiastes 1:1", "Ecclesiastes 1:12", "Ecclesiastes 12:9-10"], purpose: ["Ecclesiastes 12:13-14"] },
  "Song of Solomon": { writer: ["Song of Solomon 1:1"] },
  "Isaiah": { writer: ["Isaiah 1:1"], setting: ["Isaiah 6:1"], later: ["Luke 4:17", "John 12:38-41", "Acts 8:28"] },
  "Jeremiah": { writer: ["Jeremiah 1:1-3", "Jeremiah 36:2", "Jeremiah 36:4", "Jeremiah 36:32"], setting: ["Jeremiah 1:2-3"], later: ["Daniel 9:2", "Matthew 2:17"] },
  "Lamentations": { setting: ["Lamentations 1:1"], unnamed: true },
  "Ezekiel": { writer: ["Ezekiel 1:3"], setting: ["Ezekiel 1:1-2"], purpose: ["Ezekiel 2:5", "Ezekiel 3:17"] },
  "Daniel": { writer: ["Daniel 7:1", "Daniel 12:4"], setting: ["Daniel 1:1-2"], later: ["Matthew 24:15"] },
  "Hosea": { writer: ["Hosea 1:1"], setting: ["Hosea 1:1"] },
  "Joel": { writer: ["Joel 1:1"], later: ["Acts 2:16"] },
  "Amos": { writer: ["Amos 1:1", "Amos 7:14-15"], setting: ["Amos 1:1"] },
  "Obadiah": { writer: ["Obadiah 1:1"] },
  "Jonah": { writer: ["Jonah 1:1"], setting: ["2 Kings 14:25"], later: ["Matthew 12:39-41"] },
  "Micah": { writer: ["Micah 1:1"], setting: ["Micah 1:1"], later: ["Jeremiah 26:18", "Matthew 2:5-6"] },
  "Nahum": { writer: ["Nahum 1:1"] },
  "Habakkuk": { writer: ["Habakkuk 1:1"], purpose: ["Habakkuk 2:2-3"] },
  "Zephaniah": { writer: ["Zephaniah 1:1"], setting: ["Zephaniah 1:1"] },
  "Haggai": { writer: ["Haggai 1:1"], setting: ["Haggai 1:1"] },
  "Zechariah": { writer: ["Zechariah 1:1"], setting: ["Zechariah 1:1"] },
  "Malachi": { writer: ["Malachi 1:1"], purpose: ["Malachi 4:4-6"] },
  "Matthew": { setting: ["Matthew 1:1"], unnamed: true },
  "Mark": { setting: ["Mark 1:1"], unnamed: true },
  "Luke": { writer: ["Luke 1:3", "Acts 1:1"], purpose: ["Luke 1:1-4"], unnamed: true },
  "John": { writer: ["John 21:24", "John 19:35"], purpose: ["John 20:30-31"], unnamed: true },
  "Acts": { writer: ["Acts 1:1-2"], purpose: ["Acts 1:8"], unnamed: true },
  "Romans": { writer: ["Romans 1:1", "Romans 16:22"], setting: ["Romans 1:7", "Romans 15:25"], purpose: ["Romans 1:11", "Romans 15:15"] },
  "1 Corinthians": { writer: ["1 Corinthians 1:1", "1 Corinthians 16:21"], setting: ["1 Corinthians 1:2", "1 Corinthians 16:8"], purpose: ["1 Corinthians 4:14", "1 Corinthians 7:1"] },
  "2 Corinthians": { writer: ["2 Corinthians 1:1"], setting: ["2 Corinthians 1:1"], purpose: ["2 Corinthians 13:10"] },
  "Galatians": { writer: ["Galatians 1:1-2", "Galatians 6:11"], setting: ["Galatians 1:2"], purpose: ["Galatians 1:6-7"] },
  "Ephesians": { writer: ["Ephesians 1:1", "Ephesians 3:1"], setting: ["Ephesians 1:1", "Ephesians 6:20"], purpose: ["Ephesians 3:3-4"] },
  "Philippians": { writer: ["Philippians 1:1"], setting: ["Philippians 1:1", "Philippians 1:13"], purpose: ["Philippians 3:1"] },
  "Colossians": { writer: ["Colossians 1:1", "Colossians 4:18"], setting: ["Colossians 1:2"], purpose: ["Colossians 2:4"] },
  "1 Thessalonians": { writer: ["1 Thessalonians 1:1"], setting: ["1 Thessalonians 1:1"], purpose: ["1 Thessalonians 4:13"] },
  "2 Thessalonians": { writer: ["2 Thessalonians 1:1", "2 Thessalonians 3:17"], purpose: ["2 Thessalonians 2:1-2"] },
  "1 Timothy": { writer: ["1 Timothy 1:1-2"], purpose: ["1 Timothy 3:14-15"] },
  "2 Timothy": { writer: ["2 Timothy 1:1-2"], setting: ["2 Timothy 1:8", "2 Timothy 4:6"], purpose: ["2 Timothy 3:16-17"] },
  "Titus": { writer: ["Titus 1:1", "Titus 1:4"], setting: ["Titus 1:5"], purpose: ["Titus 1:5"] },
  "Philemon": { writer: ["Philemon 1:1", "Philemon 1:19"], purpose: ["Philemon 1:10"] },
  "Hebrews": { setting: ["Hebrews 13:23-24"], purpose: ["Hebrews 13:22"], unnamed: true },
  "James": { writer: ["James 1:1"], setting: ["James 1:1"] },
  "1 Peter": { writer: ["1 Peter 1:1", "1 Peter 5:12"], setting: ["1 Peter 1:1"], purpose: ["1 Peter 5:12"] },
  "2 Peter": { writer: ["2 Peter 1:1", "2 Peter 1:16-18"], setting: ["2 Peter 1:14"], purpose: ["2 Peter 3:1-2"] },
  "1 John": { writer: ["1 John 1:1-3"], purpose: ["1 John 1:4", "1 John 2:1", "1 John 5:13"], unnamed: true },
  "2 John": { writer: ["2 John 1:1"], purpose: ["2 John 1:12"] },
  "3 John": { writer: ["3 John 1:1"], purpose: ["3 John 1:13"] },
  "Jude": { writer: ["Jude 1:1"], purpose: ["Jude 1:3"] },
  "Revelation": { writer: ["Revelation 1:1", "Revelation 1:9", "Revelation 1:11"], setting: ["Revelation 1:9-10"], purpose: ["Revelation 1:3", "Revelation 22:18-19"] },
};

// Parts of scripture as scripture names them: "the law of Moses, and … the prophets, and … the psalms" (Luke 24:44),
// "the gospel", "the acts of the apostles", and the epistles, named by their writers.
function bookPart(b) {
  if (b <= 4) return "The law of Moses";
  if (b <= 16) return "The histories of Israel";
  if (b <= 21) return "The psalms and the books of wisdom";
  if (b <= 38) return "The prophets";
  if (b <= 42) return "The gospel";
  if (b === 43) return "The acts of the apostles";
  if (b <= 56) return "The epistles of Paul";
  if (b <= 64) return "The general epistles";
  return "The revelation";
}


// Paths: readings through scripture in the order the Bible gives them. A path chooses where to read;
// every word on it is scripture. Named with the Bible's own words.
const PATHS = [
  { id: "heart", title: "The LORD, The LORD God, merciful and gracious", from: "Exodus 34:6", about: "God's heart: what He says of Himself",
    steps: ["Exodus 3:14", "Exodus 34:6-7", "Deuteronomy 7:7-9", "Psalms 103:8-14", "Psalms 145:8-9", "Isaiah 49:15-16", "Jeremiah 9:23-24", "Jeremiah 31:3", "Lamentations 3:22-23", "Ezekiel 33:11", "Hosea 11:1-4", "Hosea 11:8-9", "Micah 7:18-19", "Zephaniah 3:17", "Matthew 9:36", "Luke 15:20", "John 3:16-17", "Romans 5:8", "1 John 4:8-10", "1 John 4:16"] },
  { id: "plan", title: "The mystery of his will", from: "Ephesians 1:9", about: "His plan for all humanity, from the beginning to the end",
    steps: ["Genesis 1:26-28", "Genesis 1:31", "Genesis 3:15", "Genesis 12:1-3", "Genesis 22:18", "Exodus 19:5-6", "Isaiah 9:6-7", "Isaiah 49:6", "Isaiah 53:4-6", "Jeremiah 31:31-34", "Ezekiel 36:26-27", "Daniel 2:44", "Joel 2:28", "Luke 24:44-47", "John 1:12-14", "Acts 17:26-27", "Galatians 3:8", "Galatians 4:4-5", "Ephesians 1:9-10", "Ephesians 3:9-11", "1 Timothy 2:3-6", "2 Peter 3:9", "Revelation 21:1-5", "Revelation 22:17"] },
  { id: "desire", title: "What doth the LORD require of thee?", from: "Micah 6:8", about: "His desire for you",
    steps: ["Deuteronomy 6:4-5", "Deuteronomy 10:12-13", "Deuteronomy 30:19-20", "1 Samuel 15:22", "Psalms 51:16-17", "Isaiah 1:18", "Jeremiah 29:11-13", "Hosea 6:6", "Micah 6:8", "Matthew 11:28-30", "Matthew 22:37-40", "John 10:10", "John 15:9-15", "John 17:3", "Romans 8:28-29", "Romans 12:1-2", "2 Corinthians 5:17-21", "Ephesians 2:4-10", "Philippians 1:6", "1 Thessalonians 5:16-18"] },
  { id: "mind", title: "My thoughts are not your thoughts", from: "Isaiah 55:8", about: "His mind, and how He makes it known",
    steps: ["Deuteronomy 29:29", "Psalms 139:1-6", "Psalms 139:17-18", "Proverbs 3:5-6", "Proverbs 25:2", "Isaiah 46:9-10", "Isaiah 55:8-11", "Jeremiah 33:3", "Amos 3:7", "Matthew 11:25-27", "John 14:9", "John 16:13-15", "Romans 11:33-36", "1 Corinthians 2:9-16", "Ephesians 1:17-18", "Philippians 2:5-8", "Colossians 1:15-17", "Hebrews 1:1-3"] },
  { id: "why", title: "That ye may know that I am the LORD", from: "Exodus 6:7", about: "Why He does what He does, in His own words",
    steps: ["Exodus 6:6-7", "Exodus 9:16", "Deuteronomy 8:2-3", "Psalms 106:8", "Isaiah 43:7", "Isaiah 43:25", "Isaiah 48:9-11", "Ezekiel 36:22-23", "John 9:2-3", "John 11:4", "John 20:31", "Romans 8:28", "Romans 9:17", "Romans 15:4", "1 Corinthians 10:11", "Ephesians 2:7", "Hebrews 12:10-11", "James 1:2-4", "1 Peter 1:6-7"] },
];
