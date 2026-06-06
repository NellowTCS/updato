const { TextEncoder, TextDecoder } = require("util");
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

// jsdom doesn't provide CSSStyleSheet/adoptedStyleSheets
const adoptedSheets = [];
Object.defineProperty(document, "adoptedStyleSheets", {
  get() {
    return adoptedSheets;
  },
  set(val) {
    adoptedSheets.length = 0;
    adoptedSheets.push(...val);
  },
  configurable: true,
});

class MockCSSStyleSheet {
  constructor() {
    this.cssRules = [];
  }
  replaceSync(css) {
    this.cssRules = [{ cssText: css }];
  }
}

globalThis.CSSStyleSheet = MockCSSStyleSheet;

// jsdom doesn't provide the Fetch API globals; mock minimally
class MockResponse {
  constructor(body, init) {
    this._body = body ?? "";
    this.status = init?.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map();
    this.headers.set("content-type", "text/plain");
  }
  async text() {
    return this._body;
  }
  async json() {
    return JSON.parse(this._body);
  }
}

globalThis.Response = MockResponse;
globalThis.Request = class {};
