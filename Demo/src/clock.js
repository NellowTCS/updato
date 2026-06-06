const display = document.getElementById("clock-display");
const formatEl = document.getElementById("clock-format");

window.__timers = window.__timers || {};
if (window.__timers.clock) clearInterval(window.__timers.clock);

function update() {
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  display.textContent = `${h}:${m}:${s} ${ampm}`;
  formatEl.textContent = "12h format";
}

update();
window.__timers.clock = setInterval(update, 1000);
