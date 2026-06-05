export type UpdatoMode = "commit" | "version";

export interface UpdatoConfig {
  repo: string;
  workerUrl?: string;
  mode: UpdatoMode;
  current: string;
  branch?: string;
}

export interface Manifest {
  app: string;
  mode: UpdatoMode;
  latest: string;
  files: string[];
  timestamp: number;
}

export interface CheckResponse {
  mode: UpdatoMode;
  update: boolean;
  latest: string;
  current: string;
  files: string[];
}

export interface UpdatoEvents {
  onUpdate?: (info: CheckResponse) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (percent: number, file: string) => void;
}

interface CachedFile {
  data: string;
  version: string;
  timestamp: number;
}

const STORAGE_KEY_CURRENT = "updato_current";
const STORAGE_KEY_CACHE_PREFIX = "updato_cache_";
const DEFAULT_WORKER_URL = "https://updato.neeljaiswal23.workers.dev";

function getStorageKey(filename: string): string {
  return `${STORAGE_KEY_CACHE_PREFIX}${filename}`;
}

export class Updato {
  private config: UpdatoConfig;
  private events: UpdatoEvents;
  private workerUrl: string;
  private manifest: Manifest | null = null;
  private initialized = false;

  constructor(config: UpdatoConfig, events: UpdatoEvents = {}) {
    this.config = config;
    this.events = events;
    this.workerUrl = config.workerUrl || DEFAULT_WORKER_URL;
  }

  static init(config: UpdatoConfig, events?: UpdatoEvents): Updato {
    const instance = new Updato(config, events);
    void instance.initialize();
    return instance;
  }

  private async initialize(): Promise<void> {
    this.initialized = true;
    try {
      this.events.onReady?.();
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async checkForUpdate(): Promise<CheckResponse | null> {
    if (!this.initialized) {
      throw new Error("Updato not initialized. Create an instance first.");
    }

    const current = this.getCurrentVersion();
    const url = `${this.workerUrl}/check?repo=${encodeURIComponent(this.config.repo)}&current=${encodeURIComponent(current)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)));
      return null;
    }

    if (!response.ok) {
      let errorText = `Server returned ${response.status}`;
      try {
        const body = await response.json();
        errorText = body.error || errorText;
      } catch {
        // ignore parse errors
      }
      this.emitError(new Error(errorText));
      return null;
    }

    let checkResponse: CheckResponse;
    try {
      checkResponse = (await response.json()) as CheckResponse;
    } catch {
      this.emitError(new Error("Failed to parse update check response."));
      return null;
    }

    if (checkResponse.update) {
      this.events.onUpdate?.(checkResponse);
    }

    return checkResponse;
  }

  async downloadUpdate(checkResponse: CheckResponse): Promise<boolean> {
    if (!checkResponse.update) return false;

    const baseUrl = `https://raw.githubusercontent.com/${this.config.repo}/cdn/versions/${checkResponse.latest}`;
    const total = checkResponse.files.length;
    let completed = 0;

    for (const file of checkResponse.files) {
      try {
        const url = `${baseUrl}/${file}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download ${file}: ${response.status}`);
        }
        const text = await response.text();
        this.cacheFile(file, text, checkResponse.latest);
      } catch (error) {
        this.emitError(
          error instanceof Error
            ? error
            : new Error(`Failed to download ${file}`),
        );
        return false;
      }

      completed++;
      this.events.onProgress?.(Math.round((completed / total) * 100), file);
    }

    this.setCurrentVersion(checkResponse.latest);
    return true;
  }

  getCurrentVersion(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (stored) return stored;
    } catch {
      // localStorage may be unavailable
    }
    return this.config.current;
  }

  private setCurrentVersion(version: string): void {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, version);
    } catch {
      // localStorage may be unavailable
    }
  }

  private cacheFile(filename: string, data: string, version: string): void {
    const cached: CachedFile = { data, version, timestamp: Date.now() };
    try {
      localStorage.setItem(getStorageKey(filename), JSON.stringify(cached));
    } catch {
      // localStorage may be full or unavailable
    }
  }

  getCachedFile(filename: string): string | null {
    try {
      const raw = localStorage.getItem(getStorageKey(filename));
      if (!raw) return null;
      const cached: CachedFile = JSON.parse(raw);
      if (cached.version !== this.getCurrentVersion()) {
        localStorage.removeItem(getStorageKey(filename));
        return null;
      }
      return cached.data;
    } catch {
      return null;
    }
  }

  clearCache(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_CACHE_PREFIX)) {
          keys.push(key);
        }
      }
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      localStorage.removeItem(STORAGE_KEY_CURRENT);
    } catch {
      // localStorage may be unavailable
    }
  }

  applyUpdate(files: string[]): void {
    const swapped = files.some((file) => {
      const content = this.getCachedFile(file);
      if (content === null) {
        this.emitError(new Error(`File "${file}" not found in cache.`));
        return false;
      }
      return this.hotSwap(file, content);
    });
    if (!swapped) {
      window.location.reload();
    }
  }

  private hotSwap(file: string, content: string): boolean {
    const ext = file.slice(file.lastIndexOf("."));
    if (ext === ".js") {
      const scripts = document.querySelectorAll(`script[src*="${file}"]`);
      if (scripts.length) {
        const script = scripts[0] as HTMLScriptElement;
        const newScript = document.createElement("script");
        newScript.textContent = content;
        script.parentNode?.replaceChild(newScript, script);
        return true;
      }
    } else if (ext === ".css") {
      const links = document.querySelectorAll(
        `link[rel="stylesheet"][href*="${file}"]`,
      );
      if (links.length) {
        const link = links[0] as HTMLLinkElement;
        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.type = "text/css";
        newLink.href = "data:text/css;base64," + btoa(content);
        link.parentNode?.replaceChild(newLink, link);
        return true;
      }
    }
    return false;
  }

  private emitError(error: Error): void {
    this.events.onError?.(error);
  }
}

declare global {
  interface Window {
    Updato: typeof Updato;
  }
}

if (typeof window !== "undefined") {
  window.Updato = Updato;
}
