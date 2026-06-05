import { Updato } from "updato";
import { UpdateNotification } from "updato/update-ui";

const updater = Updato.init(
  {
    repo: "user/my-app",
    mode: "version",
    branch: "cdn-staging",
    current: "1.0.0",
    workerUrl: "https://updato.neeljaiswal23.workers.dev",
  },
  {
    onUpdate(info) {
      console.log("Update available:", info.latest, "on branch", info.branch);
    },
    onProgress(percent, file) {
      console.log(`Downloading ${file}: ${percent}%`);
    },
    onError(error) {
      console.error("Update error:", error.message);
    },
  }
);

const notification = new UpdateNotification(updater, {
  position: "top",
  dismissable: true,
});

async function checkAndUpdate() {
  const result = await updater.checkForUpdate();
  if (result && result.update) {
    notification.show(result);
  }
}

checkAndUpdate();
