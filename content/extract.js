/**
 * Page to Markdown — Firefox Extension
 * content/extract.js — Injected into the page to extract and convert content.
 * Returns {markdown, filename, title} or {error} via executeScript result.
 */

(function () {
  try {
    // ── 1. Extract readable content ──────────────────────────────────────
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article || !article.content) {
      return {
        error: "Readability could not extract content from this page. "
             + "The page may be a web app, have no article content, "
             + "or block reader mode."
      };
    }

    // ── 2. Configure Turndown ────────────────────────────────────────────
    const turndownService = new TurndownService({
      headingStyle: "atx",        // # headings, not underlined
      codeBlockStyle: "fenced",   // ``` fences
      bulletListMarker: "-",      // dashes for lists
      emDelimiter: "*",           // *italic*
      strongDelimiter: "**",      // **bold**
      linkStyle: "inlined"        // [text](url)
    });

    // Strip nav, footer, script, style, and hidden elements
    turndownService.addRule("strip-chrome", {
      filter: ["nav", "footer", "script", "style", "noscript", "iframe"],
      replacement: () => ""
    });

    // Clean up code blocks: remove extra blank lines
    turndownService.addRule("compact-code", {
      filter: function (node, options) {
        return (
          node.nodeName === "PRE" &&
          node.firstChild &&
          node.firstChild.nodeName === "CODE"
        );
      },
      replacement: function (content, node) {
        const code = node.firstChild.textContent;
        const lang = node.firstChild.className.replace("language-", "") || "";
        return "\n\n```" + lang + "\n" + code.trim() + "\n```\n\n";
      }
    });

    // ── 3. Convert to Markdown ──────────────────────────────────────────
    let bodyMarkdown = turndownService.turndown(article.content);

    // Clean up: collapse 3+ blank lines into 2
    bodyMarkdown = bodyMarkdown.replace(/\n{3,}/g, "\n\n");

    // Clean up: remove trailing whitespace on lines
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
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")  // strip illegal fs chars
      .replace(/\s+/g, "_")                     // spaces → underscores
      .replace(/_+/g, "_")                      // collapse repeats
      .replace(/^_|_$/g, "")                    // trim underscores
      .slice(0, 120)                            // reasonable max length
      + ".md";

    // ── 6. Return result ────────────────────────────────────────────────
    return {
      markdown: fullMarkdown,
      filename: filename,
      title: article.title
    };

  } catch (err) {
    return {
      error: err.message || "Unknown extraction error"
    };
  }
})();