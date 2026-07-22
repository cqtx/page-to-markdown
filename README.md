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
- **downloads** — saves the .md file to your downloads folder

No data leaves your machine. No telemetry. No network requests.

## License

MIT