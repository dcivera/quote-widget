// ── Config ─────────────────────────────────────────────────────────
const QUOTES_URL = 'https://raw.githubusercontent.com/dcivera/quotes/main/quotes.json';
const CACHE_TTL_H = 24;
const FONT_QUOTE = new Font('Avenir-Medium', 25);
const FONT_ATTR  = new Font('Avenir-Medium', 18);

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

// ── Pick today's quote ─────────────────────────────────────────────
// Calculate days since epoch for consistent rotation
const today = new Date();
const epochStart = new Date('2000-01-01');
const daysSinceEpoch = Math.floor((today - epochStart) / (1000 * 60 * 60 * 24));

// Use modulo to cycle through quotes
// Add a prime number multiplier to improve distribution
const prime = 31;
const index = (daysSinceEpoch * prime) % quotes.length;
const choice = quotes[index];

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