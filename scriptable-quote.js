// To run on Scriptable for iOS

// ── Config ─────────────────────────────────────────────────────────
const QUOTES_URL = 'https://raw.githubusercontent.com/dcivera/quotes/main/quotes.json';
const CACHE_TTL_H = 24;
const FONT_QUOTE = new Font('Avenir-Medium', 25);
const FONT_ATTR  = new Font('Avenir-Medium', 18);

// ── Force-refresh (widget parameter) ──────────────────────────────
const force = args.widgetParameter?.toLowerCase() === 'refresh';

// ── File paths ─────────────────────────────────────────────────────
const fm = FileManager.local();
const quotesPath = fm.joinPath(fm.documentsDirectory(), 'quotes.json');
const usedIdsPath = fm.joinPath(fm.documentsDirectory(), 'used_quote_ids.json');
const TTL_MS = CACHE_TTL_H * 60 * 60 * 1_000;

// ── Fetch quotes (with simple 24 h cache) ─────────────────────────
let quotes;
try {
  const useCache = !force &&
                   fm.fileExists(quotesPath) &&
                   (Date.now() - fm.modificationDate(quotesPath).getTime() < TTL_MS);

  if (useCache) {
    quotes = JSON.parse(fm.readString(quotesPath));
  } else {
    quotes = await new Request(QUOTES_URL).loadJSON();
    fm.writeString(quotesPath, JSON.stringify(quotes));
  }
} catch (e) {
  quotes = [{ id: 1, quote: 'Stay hungry, stay foolish.', attribution: 'Steve Jobs' }];
}

// ── Load or initialize used IDs tracking ──────────────────────────
let usedIds = [];
if (fm.fileExists(usedIdsPath)) {
  try {
    usedIds = JSON.parse(fm.readString(usedIdsPath));
  } catch (e) {
    usedIds = [];
  }
}

// ── Get all available quote IDs ───────────────────────────────────
const allIds = quotes.map(quote => quote.id).filter(id => id !== undefined);

// ── Filter out IDs that no longer exist in quotes.json ───────────
usedIds = usedIds.filter(id => allIds.includes(id));

// ── Reset cycle if all quotes have been used ──────────────────────
if (usedIds.length >= allIds.length) {
  usedIds = [];
}

// ── Get unused quote IDs ──────────────────────────────────────────
const unusedIds = allIds.filter(id => !usedIds.includes(id));

// ── Select a random unused quote ──────────────────────────────────
let selectedQuote;
if (unusedIds.length > 0) {
  // Pick random from unused IDs
  const randomIndex = Math.floor(Math.random() * unusedIds.length);
  const selectedId = unusedIds[randomIndex];
  selectedQuote = quotes.find(quote => quote.id === selectedId);
  
  // Add to used IDs
  usedIds.push(selectedId);
} else {
  // Fallback to first quote if something goes wrong
  selectedQuote = quotes[0];
  usedIds = [selectedQuote.id];
}

// ── Save updated used IDs ─────────────────────────────────────────
try {
  fm.writeString(usedIdsPath, JSON.stringify(usedIds));
} catch (e) {
  console.log('Failed to save used IDs:', e);
}

// ── Build widget ──────────────────────────────────────────────────
const widget = new ListWidget();

// Fixed background (no light-mode variant)
widget.backgroundColor = new Color('#242424');

// Quote
const quoteTxt = widget.addText(selectedQuote.quote);
quoteTxt.font = FONT_QUOTE;
quoteTxt.textColor = Color.white();
quoteTxt.centerAlignText();

widget.addSpacer(6);                 // vertical gap

const attrTxt = widget.addText(`— ${selectedQuote.attribution}`);
attrTxt.font = FONT_ATTR;
attrTxt.textColor = Color.gray();
attrTxt.centerAlignText();

// Refresh
const refreshDate = new Date();
refreshDate.setHours(24, 0, 5, 0);   // tomorrow at 00:00:05 local time
widget.refreshAfterDate = refreshDate;

// ── Present / set widget ──────────────────────────────────────────
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();