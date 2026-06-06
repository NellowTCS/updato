const WORKER_URL = "https://updato.neeljaiswal23.workers.dev";

const THEMES = [
  { name: "Ocean", accent: "#4361ee", light: "#7b9cf8", dark: "#2d3fa8" },
  { name: "Forest", accent: "#2e7d32", light: "#66bb6a", dark: "#1b5e20" },
  { name: "Sunset", accent: "#e65100", light: "#ff8a50", dark: "#bf360c" },
  { name: "Plum", accent: "#7b1fa2", light: "#ab47bc", dark: "#4a148c" },
  { name: "Teal", accent: "#00897b", light: "#4db6ac", dark: "#004d40" },
  { name: "Ruby", accent: "#c62828", light: "#ef5350", dark: "#b71c1c" },
  { name: "Sky", accent: "#0277bd", light: "#42a5f5", dark: "#01579b" },
  { name: "Gold", accent: "#f57f17", light: "#ffb300", dark: "#f9a825" },
];

let currentVersion = 1;
const totalVersions = THEMES.length;

function themeFor(ver) {
  return THEMES[(ver - 1) % totalVersions];
}

function clockSource(ver) {
  const t = themeFor(ver);
  const is24h = ver % 2 === 0;
  const showDate = ver % 3 === 0;
  const showSeconds = ver % 4 !== 0;

  let timeVal = "${h}:${m}";
  if (showSeconds) timeVal += ":${s}";
  if (!is24h) timeVal += " ${ampm}";
  if (showDate) timeVal += " \\u00b7 ${dateStr}";
  timeVal = "`" + timeVal + "`";

  const fmtLabel = (is24h ? "24h" : "12h") + (showDate ? " + date" : "");

  return `
const display = document.getElementById("clock-display");
const formatEl = document.getElementById("clock-format");
const card = document.getElementById("clock-card");

window.__timers = window.__timers || {};
if (window.__timers.clock) clearInterval(window.__timers.clock);

card.style.borderColor = "${t.accent}44";

function update() {
  const now = new Date();
  ${is24h ? `const h = String(now.getHours()).padStart(2, "0");` : `const h = now.getHours() % 12 || 12;\n  const ampm = now.getHours() >= 12 ? "PM" : "AM";`}
  const m = String(now.getMinutes()).padStart(2, "0");
  ${showSeconds ? "const s = String(now.getSeconds()).padStart(2, \"0\");" : ""}
  ${showDate ? 'const dateStr = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });' : ""}
  display.innerHTML = ${timeVal};
  formatEl.textContent = "${fmtLabel}";
  display.style.color = "${t.accent}";
}
update();
window.__timers.clock = setInterval(update, 1000);
`.trim();
}

function counterSource(ver) {
  const t = themeFor(ver);
  const step = ver % 2 === 0 ? 1 : ver % 4 === 0 ? 5 : 2;

  return `
const valueEl = document.getElementById("counter-value");
const incBtn = document.getElementById("counter-inc");
const decBtn = document.getElementById("counter-dec");

let count = typeof window.__counterCount !== "undefined" ? window.__counterCount : 0;
const STEP = ${step};

function render() {
  valueEl.textContent = count;
  valueEl.style.color = "${t.accent}";
  valueEl.style.transform = "scale(1.1)";
  setTimeout(() => { valueEl.style.transform = "scale(1)"; }, 150);
  window.__counterCount = count;
}

incBtn.onclick = () => { count += STEP; render(); };
decBtn.onclick = () => { count -= STEP; render(); };

render();
`.trim();
}

function cssSource(ver) {
  const t = themeFor(ver);
  let baseCSS = "";
  try {
    for (const sheet of document.styleSheets) {
      if (!sheet.href || !sheet.href.includes("styles.css")) continue;
      baseCSS = [...sheet.cssRules].map((r) => r.cssText).join("\n");
      break;
    }
  } catch {}
  const overrides = `
:root {
  --accent: ${t.accent};
  --accent-light: ${t.light};
  --accent-dark: ${t.dark};
  --bg: ${ver < 4 ? "#0f0f1a" : "#1a1a1f"};
  --card-bg: ${ver < 4 ? "#1a1a2e" : "#222233"};
  --text: #e0e0e0;
  --text-muted: #888;
  --border: #2a2a40;
  --radius: ${ver % 3 === 0 ? 16 : 12}px;
}
`.trim();
  return baseCSS ? `${baseCSS}\n${overrides}` : overrides;
}

export function getPatches() {
  return Array.from({ length: totalVersions }, (_, i) => ({
    version: `v${i + 1}`,
    theme: THEMES[i % totalVersions].name,
    files: {
      "src/clock.js": clockSource(i + 1),
      "src/counter.js": counterSource(i + 1),
      "styles/styles.css": cssSource(i + 1),
    },
  }));
}

export function publish() {
  const next = currentVersion + 1;
  if (next > totalVersions) return null;
  currentVersion = next;
  const patch = getPatches()[next - 1];
  updateStatus(`v${next} published`);
  console.log(`[demo] Published ${patch.version} (${patch.theme})`);
  return patch;
}

export function current() {
  return currentVersion;
}

export function total() {
  return totalVersions;
}

export function setCurrent(ver) {
  currentVersion = ver;
}

export function reset() {
  currentVersion = 1;
}

const ogFetch = window.fetch;

export function installInterceptor(repo, branch) {
  const patches = getPatches();

  window.fetch = async (url, options) => {
    const urlStr = typeof url === "string" ? url : url instanceof Request ? url.url : "";

    if (urlStr.startsWith(`${WORKER_URL}/check`)) {
      const u = new URL(urlStr);
      const cur = u.searchParams.get("current") || "v1";
      const curNum = parseInt(cur.replace("v", "") || "1", 10);
      const nextNum = curNum + 1;

      if (nextNum > totalVersions) {
        return new Response(
          JSON.stringify({ mode: "version", update: false, latest: cur, current: cur, files: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const patch = patches[nextNum - 1];
      return new Response(
        JSON.stringify({
          mode: "version",
          update: true,
          latest: patch.version,
          current: cur,
          files: Object.keys(patch.files),
          modules: ["src/clock.js", "src/counter.js"],
          branch: branch || "cdn",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (urlStr.includes("raw.githubusercontent.com") && urlStr.includes("/versions/")) {
      const parts = urlStr.split("/versions/");
      if (parts.length < 2) return ogFetch(url, options);
      const after = parts[1];
      const slashIdx = after.indexOf("/");
      if (slashIdx === -1) return ogFetch(url, options);
      const version = after.slice(0, slashIdx);
      const filePath = after.slice(slashIdx + 1);
      const patch = patches.find((p) => p.version === version);
      if (patch && patch.files[filePath]) {
        console.log(`[demo] Serving ${filePath} @ ${version}`);
        return new Response(patch.files[filePath], {
          status: 200,
          headers: { "Content-Type": filePath.endsWith(".css") ? "text/css" : "application/javascript" },
        });
      }
    }

    return ogFetch(url, options);
  };
}

function updateStatus(msg) {
  const el = document.getElementById("updato-status");
  if (el) el.textContent = msg;
}
