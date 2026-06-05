import type { Updato } from "./updato";
import type { CheckResponse } from "./updato";

export interface NotificationOptions {
  container?: HTMLElement;
  position?: "top" | "bottom";
  dismissable?: boolean;
  buttonText?: string;
  heading?: string;
}

const defaults: Required<NotificationOptions> = {
  container:
    typeof document !== "undefined"
      ? document.body
      : (null as unknown as HTMLElement),
  position: "top",
  dismissable: true,
  buttonText: "Update",
  heading: "Update available",
};

function styles(position: "top" | "bottom"): string {
  return [
    "position:fixed",
    `${position}:0`,
    "left:0",
    "right:0",
    "z-index:2147483647",
    "background:#1a1a2e",
    "color:#eee",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    "font-size:14px",
    "padding:12px 16px",
    "display:none",
    "align-items:center",
    "justify-content:space-between",
    "box-shadow:0 2px 8px rgba(0,0,0,0.2)",
    "transition:transform 0.3s ease",
  ].join(";");
}

export class UpdateNotification {
  private updater: Updato;
  private opts: Required<NotificationOptions>;
  private el: HTMLDivElement | null = null;
  private messageEl: HTMLSpanElement | null = null;
  private buttonEl: HTMLButtonElement | null = null;
  private response: CheckResponse | null = null;

  constructor(updater: Updato, options: NotificationOptions = {}) {
    this.updater = updater;
    this.opts = { ...defaults, ...options };
  }

  show(response: CheckResponse): void {
    this.response = response;
    this.render();
    if (!this.el) return;
    this.el.style.display = "flex";
    requestAnimationFrame(() => {
      this.el!.style.transform = "translateY(0)";
    });
  }

  hide(): void {
    if (!this.el) return;
    const y =
      this.opts.position === "top" ? "translateY(-100%)" : "translateY(100%)";
    this.el.style.transform = y;
    setTimeout(() => {
      if (this.el) this.el.style.display = "none";
    }, 300);
  }

  destroy(): void {
    this.el?.remove();
    this.el = null;
    this.messageEl = null;
    this.buttonEl = null;
  }

  private render(): void {
    if (this.el) return;

    const el = document.createElement("div");
    el.style.cssText = styles(this.opts.position);

    const msg = document.createElement("span");
    msg.textContent = this.opts.heading;
    this.messageEl = msg;

    const btn = document.createElement("button");
    btn.textContent = this.opts.buttonText;
    btn.style.cssText =
      "margin-left:12px;padding:6px 16px;border:none;border-radius:4px;background:#4361ee;color:#fff;cursor:pointer;font-size:13px";
    btn.addEventListener("click", () => this.handleUpdate());
    this.buttonEl = btn;

    const right = document.createElement("div");
    right.style.cssText = "display:flex;align-items:center;gap:8px";
    right.appendChild(btn);

    if (this.opts.dismissable) {
      const dim = document.createElement("button");
      dim.innerHTML = "&times;";
      dim.style.cssText =
        "background:none;border:none;color:#888;cursor:pointer;font-size:18px;padding:0 4px";
      dim.addEventListener("click", () => this.hide());
      right.appendChild(dim);
    }

    el.appendChild(msg);
    el.appendChild(right);
    this.opts.container.appendChild(el);
    this.el = el;
  }

  private async handleUpdate(): Promise<void> {
    if (!this.response || !this.buttonEl || !this.messageEl) return;

    this.buttonEl.disabled = true;
    this.buttonEl.textContent = "Downloading...";

    const ok = await this.updater.downloadUpdate(this.response);
    if (ok) {
      this.messageEl.textContent = "Applying...";
      this.buttonEl.textContent = "Applying...";
      this.updater.applyUpdate(this.response.files);
    } else {
      this.buttonEl.disabled = false;
      this.buttonEl.textContent = this.opts.buttonText;
      this.messageEl.textContent = "Update failed";
    }
  }
}
