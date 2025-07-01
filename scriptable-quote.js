// ── Config ─────────────────────────────────────────────────────────
const QUOTES_URL = 'https://raw.githubusercontent.com/dcivera/quotes/main/quotes.json';
const CACHE_TTL_H = 24;
const FONT_QUOTE = new Font('Avenir-Medium', 25);
const FONT_ATTR  = new Font('Avenir-Medium', 18);

// ── Helper: deterministic PRNG (Mulberry32) ────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Force-refresh (widget parameter) ──────────────────────────────
const force = args.widgetParameter?.toLowerCase() === 'refresh';

// ── Fetch (with simple 24 h cache) ─────────────────────────────────
const fm     = FileManager.local();
const fPath  = fm.joinPath(fm.documentsDirectory(), 'quotes.json');
const TTL_MS = CACHE_TTL_H * 60 * 60 * 1_000;

let quotes;
try {
  const useCache = !force &&
                   fm.fileExists(fPath) &&
                   (Date.now() - fm.modificationDate(fPath).getTime() < TTL_MS);

  if (useCache) {
    quotes = JSON.parse(fm.readString(fPath));
  } else {
    quotes = await new Request(QUOTES_URL).loadJSON();
    fm.writeString(fPath, JSON.stringify(quotes));
  }
} catch (e) {
  quotes = [{ quote: 'Stay hungry, stay foolish.', attribution: 'Steve Jobs' }];
}

// ── Pick today’s quote ─────────────────────────────────────────────
const seedStr = new Date().toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD
const rng     = mulberry32(Number(seedStr));
const choice  = quotes[Math.floor(rng() * quotes.length)];

// ── Build widget ───────────────────────────────────────────────
const widget = new ListWidget();

// Fixed background (no light-mode variant)
widget.backgroundColor = new Color('#242424');

// Quote
const quoteTxt = widget.addText(choice.quote);
quoteTxt.font = FONT_QUOTE;
quoteTxt.textColor = Color.white();
quoteTxt.centerAlignText();

widget.addSpacer(6);                 // vertical gap

const attrTxt = widget.addText(`— ${choice.attribution}`);
attrTxt.font = FONT_ATTR;
attrTxt.textColor = Color.gray();
attrTxt.centerAlignText();

// Refresh
const refreshDate = new Date();
refreshDate.setHours(24, 0, 5, 0);   // tomorrow at 00:00:05 local time
widget.refreshAfterDate = refreshDate;

// ── Present / set widget ───────────────────────────────────────────
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();