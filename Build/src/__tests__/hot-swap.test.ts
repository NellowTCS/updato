/**
 * @jest-environment jsdom
 */

import { hotSwap } from "../hot-swap";
import { beforeEach, describe, expect, it } from "@jest/globals";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("hotSwap", () => {
  describe("scripts", () => {
    it("swaps a regular script tag", () => {
      document.body.innerHTML = '<script src="app.js"></script>';
      const result = hotSwap("app.js", "console.log('updated')");
      expect(result.swapped).toBe(true);
      expect(result.type).toBe("script");
      const script = document.querySelector("script");
      expect(script?.textContent).toBe("console.log('updated')");
    });

    it("swaps a module script when isModule is true", () => {
      document.body.innerHTML = '<script type="module" src="mod.js"></script>';
      const result = hotSwap("mod.js", "export const x = 1", true);
      expect(result.swapped).toBe(true);
      const script = document.querySelector("script[type=module]");
      expect(script?.textContent).toBe("export const x = 1");
    });

    it("returns swapped=false when script not found", () => {
      const result = hotSwap("nonexistent.js", "content");
      expect(result.swapped).toBe(false);
    });

    it("re-swaps an already-swapped script by updating textContent", () => {
      document.body.innerHTML = '<script src="app.js"></script>';
      hotSwap("app.js", "console.log('v1')");
      const result = hotSwap("app.js", "console.log('v2')");
      expect(result.swapped).toBe(true);
      const scripts = document.querySelectorAll("script");
      expect(scripts.length).toBe(1);
      expect(scripts[0].textContent).toBe("console.log('v2')");
    });

    it("re-swaps an already-swapped module script", () => {
      document.body.innerHTML = '<script type="module" src="mod.js"></script>';
      hotSwap("mod.js", "export const x = 1", true);
      const result = hotSwap("mod.js", "export const y = 2", true);
      expect(result.swapped).toBe(true);
      const scripts = document.querySelectorAll("script[type=module]");
      expect(scripts.length).toBe(1);
      expect(scripts[0].textContent).toBe("export const y = 2");
    });
  });

  describe("stylesheets", () => {
    it("swaps a stylesheet via CSSStyleSheet", () => {
      document.body.innerHTML = '<link rel="stylesheet" href="style.css">';
      const result = hotSwap("style.css", "body { color: red }");
      expect(result.swapped).toBe(true);
      expect(result.type).toBe("stylesheet");
      const link = document.querySelector("link");
      expect(link?.disabled).toBe(true);
      expect(document.adoptedStyleSheets.length).toBeGreaterThanOrEqual(1);
      const sheet = document.adoptedStyleSheets.find((s) =>
        s.cssRules[0]?.cssText?.includes("color: red"),
      );
      expect(sheet).toBeTruthy();
    });

    it("re-swaps the same sheet by updating its content", () => {
      document.body.innerHTML = '<link rel="stylesheet" href="style.css">';
      hotSwap("style.css", "body { color: red }");
      const before = document.adoptedStyleSheets.length;
      const result = hotSwap("style.css", "body { color: blue }");
      expect(result.swapped).toBe(true);
      expect(document.adoptedStyleSheets.length).toBe(before);
      const sheet = document.adoptedStyleSheets.find((s) =>
        s.cssRules[0]?.cssText?.includes("color: blue"),
      );
      expect(sheet).toBeTruthy();
    });
  });

  describe("images", () => {
    it("swaps an img src", () => {
      document.body.innerHTML = '<img src="photo.png">';
      const result = hotSwap("photo.png", "fake-image-data");
      expect(result.swapped).toBe(true);
      expect(result.type).toBe("image");
      const img = document.querySelector("img");
      expect(img?.src).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("unknown files", () => {
    it("returns swapped=false for unknown extension", () => {
      document.body.innerHTML = '<script src="app.js"></script>';
      const result = hotSwap("data.json", "{}");
      expect(result.swapped).toBe(false);
      expect(result.type).toBe("unknown");
    });
  });
});
