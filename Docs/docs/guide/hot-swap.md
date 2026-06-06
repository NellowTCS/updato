---
title: "Hot-Swap Internals"
description: "How scripts, stylesheets, and images are replaced live"
---

The `hotSwap()` function handles three asset types. Each uses a different strategy for in-place replacement.

## Scripts

Regular scripts (`<script src="...">`) are replaced by creating a new `<script>` element with the same content but without a `src` attribute. The old element is swapped out.

Module scripts (`<script type="module" src="...">`) get `type="module"` on the replacement. If the original had `integrity` or `crossorigin`, those are copied.

Each replacement is tagged with a `data-hot-file` attribute set to the filename. On subsequent updates (same file, new content), the library finds the tagged element and updates its `textContent` in place instead of creating a new element. This keeps the script active and avoids re-execution in some cases.

```typescript
// First update: creates a new script element
<script data-hot-file="main.js">/* new code */</script>

// Second update: finds the tagged element, updates textContent
```

## Stylesheets

CSS hot-swap uses `CSSStyleSheet.replaceSync` with `adoptedStyleSheets`. This approach is synchronous, CSP-safe (no inline `<style>` or `data:` URIs), and avoids relative `url()` breakage.

On the first update for a given file:

1. The original `<link rel="stylesheet">` is disabled (`link.disabled = true`)
2. A new `CSSStyleSheet` is created and added to `document.adoptedStyleSheets`
3. The sheet is tracked in a `Map<string, CSSStyleSheet>` by filename

On subsequent updates, the same sheet is found in the map and `replaceSync()` is called with the new content. No DOM manipulation.

```typescript
const hotSheets = new Map<string, CSSStyleSheet>();

function swapStylesheet(file, content) {
  let sheet = hotSheets.get(file);
  if (!sheet) {
    const link = matchAttr('link[rel="stylesheet"]', "href", file);
    if (link) link.disabled = true;
    sheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    hotSheets.set(file, sheet);
  }
  sheet.replaceSync(content);
}
```

## Images

Images are replaced by converting the file content to a base64 data URI and setting it on matching `<img>`, `<source>`, and `<link rel="icon">` elements.

Matching uses `querySelectorAll` with a partial `src` / `href` match on the filename. Every matching element on the page gets the new data URI.

## Unknown types

Files with unrecognized extensions return `{ swapped: false, type: "unknown" }`. The caller can handle them or fall through to a page reload.

## Fallback

If every file in an `applyUpdate` call returns `swapped: false`, the page reloads as a safety net.

## Next Steps

- [Client Library](./client-library): Full API reference
- [Manifest](./manifest): How files and modules are declared
