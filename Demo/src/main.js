import { Updato } from "../../Build/src/updato.ts";
import { UpdateNotification } from "../../Build/src/update-ui.ts";
import { installInterceptor, publish, current, total, reset, setCurrent } from "./patches.js";

const REPO = "NellowTCS/updato";
const BRANCH = "cdn";

let updater = null;
let notification = null;

function addLogEntry(version, files, status) {
  const body = document.getElementById("log-body");
  const empty = document.getElementById("log-empty");
  if (empty) empty.style.display = "none";

  const row = document.createElement("tr");
  row.id = `log-${version.replace(".", "-")}`;
  row.innerHTML = `
    <td>${version}</td>
    <td>${files.join(", ")}</td>
    <td><span class="status-badge ${status}">${status}</span></td>
  `;
  body.appendChild(row);
}

function updateLogEntry(version, status) {
  const row = document.getElementById(`log-${version.replace(".", "-")}`);
  if (!row) return;
  const badge = row.querySelector(".status-badge");
  if (badge) {
    badge.className = `status-badge ${status}`;
    badge.textContent = status;
  }
}

function readStoredVersion() {
  try {
    const v = localStorage.getItem("updato_current");
    if (v && /^v\d+$/.test(v)) return v;
  } catch {}
  return "v1";
}

function initUpdato() {
  const storedVersion = readStoredVersion();
  const storedNum = parseInt(storedVersion.replace("v", ""), 10);
  reset();
  setCurrent(storedNum);
  document.getElementById("version-badge").textContent = storedVersion;

  updater = Updato.init(
    {
      repo: REPO,
      mode: "version",
      current: storedVersion,
      branch: BRANCH,
    },
    {
      onUpdate: (info) => {
        console.log(`[updato] Update available: ${info.latest}`);
        if (notification) notification.destroy();
        notification = new UpdateNotification(updater, {
          heading: `Update ${info.latest} available`,
          buttonText: "Apply Update",
          onApply: () => {
            document.getElementById("updato-status").textContent = "applied";
            updateLogEntry(info.latest, "applied");
          },
        });
        notification.show(info);
        addLogEntry(info.latest, info.files, "pending");
      },
      onReady: () => {
        console.log("[updato] Ready");
        document.getElementById("updato-status").textContent = "ready";
      },
      onError: (err) => {
        console.warn("[updato]", err.message);
      },
      onProgress: (pct, file) => {
        document.getElementById("updato-status").textContent =
          `downloading ${pct}%`;
      },
    },
  );
}

async function handlePublish() {
  const btn = document.getElementById("publish-btn");
  btn.disabled = true;

  const patch = publish();
  if (!patch) {
    document.getElementById("updato-status").textContent = "no more versions";
    btn.textContent = "All published";
    return;
  }

  document.getElementById("updato-status").textContent = "checking...";
  document.getElementById("version-badge").textContent = patch.version;

  setTimeout(async () => {
    const check = await updater.checkForUpdate();
    if (check && check.update) {
      document.getElementById("updato-status").textContent = "available";
    } else {
      document.getElementById("updato-status").textContent = "up-to-date";
    }
    btn.disabled = false;
  }, 500);
}

function handleReset() {
  if (!updater) return;
  updater.clearCache();
  updater.metrics?.clear();
  window.location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  installInterceptor(REPO, BRANCH);
  initUpdato();

  const stored = readStoredVersion();
  if (stored !== "v1" && updater?.getCachedFile("styles/styles.css")) {
    updater.applyUpdate(["styles/styles.css"]);
  }

  document.getElementById("publish-btn").addEventListener("click", handlePublish);
  document.getElementById("reset-btn")?.addEventListener("click", handleReset);
});
