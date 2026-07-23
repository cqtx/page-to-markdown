/**
 * Page to Markdown — Firefox Extension
 * content/extract.js — Injected alongside Readability.js + Turndown.js.
 * Extracts page content, converts to Markdown, triggers download in-page.
 */

(async function () {
  try {
    // ── 0. Read preferences ─────────────────────────────────────────────
    var prefs = await browser.storage.local.get("includeImages");
    var includeImages = prefs.includeImages !== false; // default true

    // ── 1. Resolve lazy-loaded images ────────────────────────────────────
    // News sites (CNN, NYT, etc.) defer loading with data-src / srcset.
    // Readability clones the DOM as-is, so we must resolve sources first.
    document.querySelectorAll("img").forEach(function (img) {
      var src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:") || src.indexOf("placeholder") !== -1) {
        var lazy =
          img.getAttribute("data-src") ||
          img.getAttribute("data-lazy-src") ||
          img.getAttribute("data-original");
        if (lazy) img.setAttribute("src", lazy);
      }
      if (!img.getAttribute("src") || img.getAttribute("src").startsWith("data:")) {
        var srcset = img.getAttribute("srcset");
        if (srcset) {
          var first = srcset.split(",")[0].trim().split(" ")[0];
          if (first) img.setAttribute("src", first);
        }
      }
    });
    // <picture> elements — pull src from <source> into inner <img>
    document.querySelectorAll("picture").forEach(function (picture) {
      var img = picture.querySelector("img");
      if (!img || img.getAttribute("src")) return;
      var sources = picture.querySelectorAll("source");
      for (var i = 0; i < sources.length; i++) {
        var s = sources[i].getAttribute("srcset") || sources[i].getAttribute("data-srcset");
        if (s) {
          var first = s.split(",")[0].trim().split(" ")[0];
          if (first) { img.setAttribute("src", first); break; }
        }
      }
    });

    // ── 1. Extract readable content ──────────────────────────────────────

    // DEBUG: count images in live DOM before cloning
    var liveImgs = document.querySelectorAll("img");
    var liveSrcs = [];
    liveImgs.forEach(function (img) {
      var s = img.getAttribute("src") || "";
      var cls = img.getAttribute("class") || "";
      if (s && s.indexOf("media.cnn.com") !== -1) {
        liveSrcs.push(s.slice(0, 80) + " [" + cls.slice(0, 30) + "]");
      }
    });
    console.log("[Page→MD] Live DOM CNN images (" + liveSrcs.length + "):",
      liveSrcs);

    // ── Capture content images before Readability strips them ──────────
    var capturedImages = [];
    if (includeImages) {
      document.querySelectorAll("img").forEach(function (img) {
        var src = img.getAttribute("src") || "";
        var alt = img.getAttribute("alt") || "";
        var cls = img.getAttribute("class") || "";
        var w = parseInt(img.getAttribute("width") || "0", 10);
        var h = parseInt(img.getAttribute("height") || "0", 10);
        // Skip: data URIs, tiny icons, byline/avatar images, QR codes
        if (!src || src.startsWith("data:")) return;
        if (w > 0 && w <= 50 && h > 0 && h <= 50) return;
        if (cls.indexOf("byline") !== -1 || cls.indexOf("qr-code") !== -1) return;
        if (src.indexOf("1x1") !== -1 || src.indexOf("pixel") !== -1) return;
        capturedImages.push({ src: src, alt: alt || "Image" });
      });
      console.log("[Page→MD] Captured " + capturedImages.length + " content images before Readability");
    }

    var documentClone = document.cloneNode(true);
    var reader = new Readability(documentClone);
    var article = reader.parse();

    if (!article || !article.content) {
      console.warn("[Page→MD] Readability could not extract content from this page.");
      return;
    }

    // DEBUG: log what images Readability kept
    var debugDiv = document.createElement("div");
    debugDiv.innerHTML = article.content;
    var keptImgs = debugDiv.querySelectorAll("img");
    console.log("[Page→MD] Readability kept " + keptImgs.length + " images:");
    keptImgs.forEach(function (img, i) {
      console.log("[Page→MD]   [" + i + "] src=" + (img.getAttribute("src") || "(none)").slice(0, 100));
      console.log("[Page→MD]   [" + i + "] class=" + (img.getAttribute("class") || "(none)"));
    });

    // ── Recover images that Readability dropped ────────────────────────
    if (includeImages && capturedImages.length > keptImgs.length) {
      var existingSrcs = [];
      keptImgs.forEach(function (img) {
        existingSrcs.push(img.getAttribute("src") || "");
      });

      var recovered = 0;
      capturedImages.forEach(function (img) {
        if (existingSrcs.indexOf(img.src) === -1) {
          article.content += '<img src="' + img.src + '" alt="' + img.alt.replace(/"/g, "&quot;") + '">';
          recovered++;
        }
      });

      if (recovered > 0) {
        console.log("[Page→MD] Recovered " + recovered + " dropped images");
      }
    }

    // ── 2. Configure Turndown ────────────────────────────────────────────
    var turndownService = new TurndownService({
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
      replacement: function () { return ""; }
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
        var code = node.firstChild.textContent;
        var lang = (node.firstChild.className || "").replace("language-", "");
        return "\n\n```" + lang + "\n" + code.trim() + "\n```\n\n";
      }
    });

    // Image rule — preserve content images, skip icons/trackers/pixels (only if enabled)
    if (includeImages) {
      turndownService.addRule("content-images", {
        filter: function (node) {
          if (node.nodeName === "IMG") {
            var src = node.getAttribute("src") || "";
            if (!src) return false;
            if (src.indexOf("1x1") !== -1 || src.indexOf("pixel") !== -1 || src.indexOf("spacer") !== -1) return false;
            var w = parseInt(node.getAttribute("width") || "0", 10);
            var h = parseInt(node.getAttribute("height") || "0", 10);
            if (w > 0 && w <= 25 && h > 0 && h <= 25) return false;
            return true;
          }
          if (node.nodeName === "PICTURE") return true;
          if (node.nodeName === "FIGURE") return true;
          return false;
        },
        replacement: function (content, node) {
          if (node.nodeName === "IMG") {
            var src = node.getAttribute("src") || "";
            var alt = node.getAttribute("alt") || "Image";
            return src ? "![" + alt + "](" + src + ")" : "";
          }
          if (node.nodeName === "PICTURE") {
            var img = node.querySelector("img");
            if (!img) return "";
            var src = img.getAttribute("src") || "";
            var alt = img.getAttribute("alt") || "Image";
            return src ? "![" + alt + "](" + src + ")" : "";
          }
          if (node.nodeName === "FIGURE") {
            var img = node.querySelector("img");
            var cap = node.querySelector("figcaption");
            if (!img) return content;
            var src = img.getAttribute("src") || "";
            var alt = cap ? cap.textContent.trim() : (img.getAttribute("alt") || "Image");
            return src ? "![" + alt + "](" + src + ")" : content;
          }
          return content;
        }
      });
    }

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