import { Updato } from "updato";

const updater = Updato.init(
  {
    repo: "user/my-app",
    mode: "commit",
    current: "development",
    workerUrl: "https://updato.neeljaiswal23.workers.dev",
  },
  {
    onUpdate(info) {
      console.log("Update available:", info.latest);
    },
    onProgress(percent, file) {
      console.log(`Downloading ${file}: ${percent}%`);
    },
    onError(error) {
      console.error("Update error:", error.message);
    },
  }
);

async function checkAndUpdate() {
  const result = await updater.checkForUpdate();
  if (result && result.update) {
    const downloaded = await updater.downloadUpdate(result);
    if (downloaded) {
      const confirmed = confirm(
        `Version ${result.latest} is available. Update now?`
      );
      if (confirmed) {
        updater.applyUpdate(result.files);
      }
    }
  }
}

checkAndUpdate();
