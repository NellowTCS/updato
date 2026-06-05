export type AssetType = "script" | "stylesheet" | "image" | "unknown";

export interface HotSwapResult {
  swapped: boolean;
  type: AssetType;
  file: string;
}

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".bmp",
  ".avif",
]);

function ext(file: string): string {
  const i = file.lastIndexOf(".");
  return i === -1 ? "" : file.slice(i).toLowerCase();
}

function base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function basename(path: string): string {
  return path.split("/").pop() || path;
}

function matchAttr(
  selector: string,
  attr: string,
  file: string,
): Element | null {
  const name = basename(file);
  for (const el of document.querySelectorAll(selector)) {
    const val = el.getAttribute(attr);
    if (val && basename(val) === name) return el;
  }
  return null;
}

function swapScript(
  file: string,
  content: string,
  isModule?: boolean,
): HotSwapResult {
  const sel = isModule ? "script[type=module][src]" : "script[src]";
  const attr = "src";
  const name = basename(file);
  let el: Element | null = null;
  for (const candidate of document.querySelectorAll(sel)) {
    const val = candidate.getAttribute(attr);
    if (val && basename(val) === name) {
      el = candidate;
      break;
    }
  }
  if (!el) return { swapped: false, type: "script", file };

  const old = el as HTMLScriptElement;
  const news = document.createElement("script");
  news.textContent = content;
  if (isModule) news.type = "module";
  if (old.integrity) news.integrity = old.integrity;
  if (old.crossOrigin) news.crossOrigin = old.crossOrigin;
  old.parentNode?.replaceChild(news, old);
  return { swapped: true, type: "script", file };
}

function swapStylesheet(file: string, content: string): HotSwapResult {
  const el = matchAttr('link[rel="stylesheet"]', "href", file);
  if (!el) return { swapped: false, type: "stylesheet", file };

  const old = el as HTMLLinkElement;
  const news = document.createElement("link");
  news.rel = "stylesheet";
  news.type = "text/css";
  news.href = "data:text/css," + encodeURIComponent(content);
  old.parentNode?.replaceChild(news, old);
  return { swapped: true, type: "stylesheet", file };
}

function swapImage(file: string, content: string): HotSwapResult {
  const name = basename(file);
  const selector = `img[src*="${name}"], source[src*="${name}"], link[rel="icon"][href*="${name}"]`;
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return { swapped: false, type: "image", file };

  const dataUri = `data:image/${ext(file).slice(1)};base64,${base64(content)}`;
  for (const el of elements) {
    if (el instanceof HTMLLinkElement) {
      el.href = dataUri;
    } else {
      (el as HTMLImageElement | HTMLSourceElement).src = dataUri;
    }
  }
  return { swapped: true, type: "image", file };
}

export function hotSwap(
  file: string,
  content: string,
  isModule?: boolean,
): HotSwapResult {
  switch (ext(file)) {
    case ".js":
      return swapScript(file, content, isModule);
    case ".css":
      return swapStylesheet(file, content);
    default:
      if (IMAGE_EXTS.has(ext(file))) {
        return swapImage(file, content);
      }
      return { swapped: false, type: "unknown", file };
  }
}
