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

// ── Check if we need a new quote (daily rotation or forced refresh) ─
const lastQuotePath = fm.joinPath(fm.documentsDirectory(), 'last_quote.json');
let needNewQuote = force; // Start with force value
let selectedQuote;

// Check if we have a quote from today (unless forcing refresh)
if (!force && fm.fileExists(lastQuotePath)) {
  try {
    const lastQuoteData = JSON.parse(fm.readString(lastQuotePath));
    const lastDate = new Date(lastQuoteData.date);
    const today = new Date();
    
    // If last quote is from today, reuse it
    if (lastDate.toDateString() === today.toDateString()) {
      selectedQuote = lastQuoteData.quote;
      needNewQuote = false;
    } else {
      // Quote is from a previous day, need a new one
      needNewQuote = true;
    }
  } catch (e) {
    console.log('Failed to read last quote:', e);
    needNewQuote = true;
  }
} else {
  // Either forcing refresh or no saved quote exists, need a new one
  needNewQuote = true;
}

// ── Select a new random unused quote only if needed ───────────────
if (needNewQuote) {
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

  // Save the new quote with today's date
  try {
    const quoteData = {
      quote: selectedQuote,
      date: new Date().toISOString()
    };
    fm.writeString(lastQuotePath, JSON.stringify(quoteData));
    fm.writeString(usedIdsPath, JSON.stringify(usedIds));
  } catch (e) {
    console.log('Failed to save quote data:', e);
  }
}

// ── TEST CASE - Comment out this entire block after testing ──────
/*
// Override selectedQuote with test data containing \n characters
selectedQuote = {
  id: 999,
  quote: "The best time to plant a tree was 20 years ago.\\nThe second best time is now.",
  attribution: "Chinese Proverb"
};
console.log("TEST: Original quote text:", selectedQuote.quote);
console.log("TEST: After \\n replacement:", selectedQuote.quote.replace(/\\n/g, '\n'));
*/
// ── END TEST CASE ─────────────────────────────────────────────────

// ── Build widget ──────────────────────────────────────────────────
const widget = new ListWidget();

// Fixed background (no light-mode variant)
let startColor = new Color('#EE9C4D');
let endColor = new Color('#E68438')
let gradient = new LinearGradient();
gradient.colors = [startColor, endColor];
gradient.locations = [0, 1];
widget.backgroundGradient = gradient;
//widget.backgroundColor = new Color('#F77A30');

// Quote - convert \n to actual line breaks
const quoteText = selectedQuote.quote.replace(/\\n/g, '\n');
const quoteTxt = widget.addText(quoteText);
quoteTxt.font = FONT_QUOTE;
quoteTxt.textColor = new Color('#E4E4E4');
quoteTxt.centerAlignText();

widget.addSpacer(6);                 // vertical gap

const attrTxt = widget.addText(`— ${selectedQuote.attribution}`);
attrTxt.font = FONT_ATTR;
attrTxt.textColor = new Color('#E4E4E4');
attrTxt.centerAlignText();

// Refresh - set to tomorrow at 00:00:05 local time
const refreshDate = new Date();
refreshDate.setDate(refreshDate.getDate() + 1);  // Move to tomorrow
refreshDate.setHours(0, 0, 5, 0);                // Set to 00:00:05
widget.refreshAfterDate = refreshDate;

// ── Present / set widget ──────────────────────────────────────────
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
