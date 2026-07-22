/**
 * Page to Markdown — Firefox Extension
 * background.js — Toolbar click handler
 *
 * Injects all scripts in ONE call so Firefox shares the execution context,
 * giving extract.js access to Readability and TurndownService globals.
 * The download is triggered by extract.js directly in-page (avoids
 * Firefox's data:-URL restriction on downloads.download).
 */

browser.action.onClicked.addListener(async (tab) => {
  try {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "lib/Readability.js",
        "lib/turndown.js",
        "content/extract.js"
      ]
    });
  } catch (err) {
    console.error("[Page→MD] Injection failed:", err.message);
  }
});