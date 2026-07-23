# Page to Markdown — Firefox Extension

One-click Firefox extension that extracts web page content and downloads it as a clean Markdown document with YAML frontmatter.

## How it works

1. Click the toolbar icon on any page
2. Mozilla's [Readability.js](https://github.com/mozilla/readability) extracts the main article content (same engine as Firefox Reader View)
3. [Turndown.js](https://github.com/mixmark-io/turndown) converts the HTML to clean Markdown
4. A `.md` file downloads automatically with YAML frontmatter

## Output format

```markdown
---
title: "Article Title"
source: "https://example.com/article"
date: "2026-07-22"
excerpt: "First 200 chars of the article..."
site_name: "Example Blog"
extracted_by: "Page to Markdown (Firefox)"
---

# Article Title

Content in clean Markdown...
```

## Install (temporary / development)

1. Clone this repo
2. Open Firefox → `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the cloned directory

## Install (permanent / signed)

Submit to [Firefox Add-ons (AMO)](https://addons.mozilla.org/) for signing, or use `web-ext sign`.

## Permissions

- **activeTab** — only accesses the current tab when you click the button
- **scripting** — injects extraction scripts into the current tab
- **storage** — saves your preferences (include images on/off)

No data leaves your machine. No telemetry. No network requests.

## Dependencies

This extension is **fully self-contained** — all third-party libraries are vendored (copied directly into `lib/`). No CDN calls, no `npm install`, no runtime network dependencies.

| Library | License | Vendored at |
|---|---|---|
| [Readability.js](https://github.com/mozilla/readability) | Apache 2.0 | `lib/Readability.js` |
| [Turndown.js](https://github.com/mixmark-io/turndown) | MIT | `lib/turndown.js` |

## Privacy

See [PRIVACY.md](PRIVACY.md). This extension does not collect, transmit, or store any user data. All processing happens locally in your browser.

## Options

Right-click the extension icon → **Manage Extension** → **Preferences** to toggle image inclusion on or off.

## License

MIT — see [LICENSE](LICENSE) for full text and third-party attributions.