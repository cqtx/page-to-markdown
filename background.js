/**
 * Page to Markdown — Firefox Extension
 * background.js — Toolbar click handler and download orchestrator
 */

browser.action.onClicked.addListener(async (tab) => {
  try {
    // Step 1: Inject Readability.js library
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/Readability.js"]
    });

    // Step 2: Inject Turndown.js library
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/turndown.js"]
    });

    // Step 3: Inject extractor (returns {markdown, filename, title})
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/extract.js"]
    });

    const result = results[0]?.result;

    if (!result || !result.markdown) {
      throw new Error(result?.error || "No content extracted from page");
    }

    // Step 4: Convert markdown to a safe data URL and trigger download
    const bytes = new TextEncoder().encode(result.markdown);
    const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
    const base64 = btoa(binary);
    const dataUrl = `data:text/markdown;charset=utf-8;base64,${base64}`;

    await browser.downloads.download({
      url: dataUrl,
      filename: result.filename || "page.md",
      saveAs: false
    });

    console.log(`[Page→MD] Downloaded: ${result.filename} (${result.markdown.length} chars)`);

  } catch (err) {
    console.error("[Page→MD] Extraction failed:", err.message);
    // Could show a notification, but for now just log — user sees nothing
    // which is better than a disruptive popup on failure
  }
});