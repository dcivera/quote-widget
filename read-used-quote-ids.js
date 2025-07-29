// ── Read Used Quote IDs Script ────────────────────────────────────
// This script displays the list of used quote IDs and provides useful statistics

const fm = FileManager.local();
const quotesPath = fm.joinPath(fm.documentsDirectory(), 'quotes.json');
const usedIdsPath = fm.joinPath(fm.documentsDirectory(), 'used_quote_ids.json');

// ── Load quotes and used IDs ───────────────────────────────────────
let quotes = [];
let usedIds = [];

try {
  if (fm.fileExists(quotesPath)) {
    quotes = JSON.parse(fm.readString(quotesPath));
  } else {
    console.log("❌ quotes.json not found");
  }
} catch (e) {
  console.log("❌ Error reading quotes.json:", e);
}

try {
  if (fm.fileExists(usedIdsPath)) {
    usedIds = JSON.parse(fm.readString(usedIdsPath));
  } else {
    console.log("📝 used_quote_ids.json not found (no quotes used yet)");
  }
} catch (e) {
  console.log("❌ Error reading used_quote_ids.json:", e);
}

// ── Analysis ───────────────────────────────────────────────────────
const allIds = quotes.map(quote => quote.id).filter(id => id !== undefined);
const totalQuotes = allIds.length;
const usedCount = usedIds.length;
const remainingCount = totalQuotes - usedCount;

// ── Display Results ────────────────────────────────────────────────
console.log("📊 QUOTE USAGE STATISTICS");
console.log("═".repeat(50));
console.log(`Total quotes available: ${totalQuotes}`);
console.log(`Quotes used: ${usedCount}`);
console.log(`Quotes remaining: ${remainingCount}`);

if (totalQuotes > 0) {
  const percentageUsed = ((usedCount / totalQuotes) * 100).toFixed(1);
  console.log(`Progress: ${percentageUsed}%`);
}

console.log("\n📝 USED QUOTE IDs:");
console.log("─".repeat(30));

if (usedIds.length === 0) {
  console.log("(No quotes used yet)");
} else {
  // Sort IDs for better readability
  const sortedUsedIds = [...usedIds].sort((a, b) => a - b);
  console.log(`[${sortedUsedIds.join(', ')}]`);
  
  // Show actual quotes for the used IDs
  console.log("\n💬 USED QUOTES:");
  console.log("─".repeat(30));
  
  sortedUsedIds.forEach(id => {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      // Truncate long quotes for display
      const displayQuote = quote.quote.length > 80 
        ? quote.quote.substring(0, 77) + "..." 
        : quote.quote;
      console.log(`ID ${id}: "${displayQuote}" — ${quote.attribution}`);
    } else {
      console.log(`ID ${id}: (Quote not found in current quotes.json)`);
    }
  });
}

// ── Show remaining quotes ──────────────────────────────────────────
const unusedIds = allIds.filter(id => !usedIds.includes(id));

if (unusedIds.length > 0) {
  console.log("\n🔄 REMAINING QUOTE IDs:");
  console.log("─".repeat(30));
  const sortedUnusedIds = [...unusedIds].sort((a, b) => a - b);
  console.log(`[${sortedUnusedIds.join(', ')}]`);
}

// ── Actions ────────────────────────────────────────────────────────
console.log("\n🛠️ ACTIONS:");
console.log("─".repeat(30));

if (usedIds.length > 0) {
  // Create alert for reset option
  const alert = new Alert();
  alert.title = "Quote Usage Info";
  alert.message = `Used: ${usedCount}/${totalQuotes} quotes (${((usedCount / totalQuotes) * 100).toFixed(1)}%)`;
  alert.addAction("Reset Used List");
  alert.addCancelAction("Close");
  
  const response = await alert.presentAlert();
  
  if (response === 0) { // Reset was chosen
    const confirmAlert = new Alert();
    confirmAlert.title = "Confirm Reset";
    confirmAlert.message = "Are you sure you want to reset the used quotes list? This will allow all quotes to be shown again.";
    confirmAlert.addDestructiveAction("Reset");
    confirmAlert.addCancelAction("Cancel");
    
    const confirmResponse = await confirmAlert.presentAlert();
    
    if (confirmResponse === 0) { // Confirmed reset
      try {
        fm.writeString(usedIdsPath, JSON.stringify([]));
        console.log("✅ Used quotes list has been reset!");
        
        // Show success alert
        const successAlert = new Alert();
        successAlert.title = "Reset Complete";
        successAlert.message = "The used quotes list has been cleared. All quotes are now available for selection again.";
        successAlert.addAction("OK");
        await successAlert.presentAlert();
      } catch (e) {
        console.log("❌ Error resetting used quotes list:", e);
      }
    }
  }
} else {
  console.log("No actions available (no quotes used yet)");
}

Script.complete();