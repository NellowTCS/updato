const STORAGE_KEY = "updato:metrics";

export interface MetricsEntry {
  filename: string;
  startTime: number;
  endTime: number;
  duration: number;
  fileSize: number;
  url: string;
}

export class DownloadMetrics {
  private entries: MetricsEntry[] = [];
  private loaded = false;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw) as MetricsEntry[];
      }
    } catch {
      this.entries = [];
    }
    this.loaded = true;
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // localStorage may be full or unavailable
    }
  }

  addEntry(entry: MetricsEntry): void {
    this.entries.push(entry);
    this.save();
  }

  export(): MetricsEntry[] {
    return [...this.entries];
  }

  exportJson(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  clear(): void {
    this.entries = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }
  }
}
