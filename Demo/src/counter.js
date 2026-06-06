const valueEl = document.getElementById("counter-value");
const incBtn = document.getElementById("counter-inc");
const decBtn = document.getElementById("counter-dec");

window.__timers = window.__timers || {};
if (window.__timers._counterReRender) clearInterval(window.__timers._counterReRender);

let count = typeof window.__counterCount !== "undefined" ? window.__counterCount : 0;

function render() {
  valueEl.textContent = count;
  valueEl.style.color = "var(--accent)";
  window.__counterCount = count;
}

incBtn.onclick = () => { count++; render(); };
decBtn.onclick = () => { count--; render(); };

render();
