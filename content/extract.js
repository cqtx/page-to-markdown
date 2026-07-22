/**
 * Page to Markdown — Firefox Extension
 * content/extract.js — Injected alongside Readability.js + Turndown.js.
 * Extracts page content, converts to Markdown, triggers download in-page.
 */

(function () {
  try {
    // ── 1. Extract readable content ──────────────────────────────────────
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article || !article.content) {
      console.warn("[Page→MD] Readability could not extract content from this page.");
      return;
    }

    // ── 2. Configure Turndown ────────────────────────────────────────────
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      emDelimiter: "*",
      strongDelimiter: "**",
      linkStyle: "inlined"
    });

    // Strip nav, footer, script, style, hidden elements
    turndownService.addRule("strip-chrome", {
      filter: ["nav", "footer", "script", "style", "noscript", "iframe"],
      replacement: () => ""
    });

    // Preserve code blocks with language hints
    turndownService.addRule("compact-code", {
      filter: function (node) {
        return (
          node.nodeName === "PRE" &&
          node.firstChild &&
          node.firstChild.nodeName === "CODE"
        );
      },
      replacement: function (content, node) {
        const code = node.firstChild.textContent;
        const lang = (node.firstChild.className || "").replace("language-", "");
        return "\n\n```" + lang + "\n" + code.trim() + "\n```\n\n";
      }
    });

    // ── 3. Convert to Markdown ──────────────────────────────────────────
    let bodyMarkdown = turndownService.turndown(article.content);
    bodyMarkdown = bodyMarkdown.replace(/\n{3,}/g, "\n\n");
    bodyMarkdown = bodyMarkdown.replace(/[ \t]+$/gm, "");

    // ── 4. Build frontmatter ────────────────────────────────────────────
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const excerpt = (article.excerpt || "")
      .replace(/\n/g, " ")
      .trim()
      .slice(0, 200);
    const byline = article.byline
      ? `\nbyline: "${article.byline.replace(/"/g, '\\"')}"`
      : "";
    const siteName = article.siteName
      ? `\nsite_name: "${article.siteName.replace(/"/g, '\\"')}"`
      : "";

    const frontmatter = [
      "---",
      `title: "${article.title.replace(/"/g, '\\"')}"`,
      `source: "${window.location.href}"`,
      `date: "${dateStr}"`,
      `excerpt: "${excerpt}"${byline}${siteName}`,
      `extracted_by: "Page to Markdown (Firefox)"`,
      "---",
      "",
      `# ${article.title}`,
      ""
    ].join("\n");

    const fullMarkdown = frontmatter + bodyMarkdown;

    // ── 5. Generate safe filename ───────────────────────────────────────
    const filename = article.title
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 120) + ".md";

    // ── 6. Trigger download in-page (avoids Firefox data:-URL restriction)
    const blob = new Blob([fullMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log(`[Page→MD] Downloaded: ${filename} (${fullMarkdown.length} chars)`);

  } catch (err) {
    console.error("[Page→MD] Extraction failed:", err.message);
  }
})();