/**
 * @jest-environment jsdom
 */

import { DownloadMetrics, MetricsEntry } from "../metrics";
import { beforeEach, describe, expect, it } from "@jest/globals";

beforeEach(() => {
  localStorage.clear();
});

describe("DownloadMetrics", () => {
  it("starts with empty entries", () => {
    const m = new DownloadMetrics();
    expect(m.export()).toEqual([]);
  });

  it("adds and retrieves an entry", () => {
    const m = new DownloadMetrics();
    const entry: MetricsEntry = {
      filename: "app.js",
      startTime: 100,
      endTime: 200,
      duration: 100,
      fileSize: 500,
      url: "https://example.com/app.js",
    };
    m.addEntry(entry);
    expect(m.export()).toHaveLength(1);
    expect(m.export()[0].filename).toBe("app.js");
  });

  it("persists entries in localStorage", () => {
    const m1 = new DownloadMetrics();
    m1.addEntry({
      filename: "x.css",
      startTime: 0,
      endTime: 50,
      duration: 50,
      fileSize: 100,
      url: "https://example.com/x.css",
    });

    const m2 = new DownloadMetrics();
    expect(m2.export()).toHaveLength(1);
    expect(m2.export()[0].filename).toBe("x.css");
  });

  it("clears all entries", () => {
    const m = new DownloadMetrics();
    m.addEntry({
      filename: "a.js",
      startTime: 0,
      endTime: 1,
      duration: 1,
      fileSize: 10,
      url: "https://example.com/a.js",
    });
    m.clear();
    expect(m.export()).toHaveLength(0);
  });

  it("exportJson returns formatted JSON", () => {
    const m = new DownloadMetrics();
    m.addEntry({
      filename: "f.js",
      startTime: 0,
      endTime: 10,
      duration: 10,
      fileSize: 50,
      url: "https://example.com/f.js",
    });
    const json = m.exportJson();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].filename).toBe("f.js");
  });
});
