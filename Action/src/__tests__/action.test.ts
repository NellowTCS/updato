import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("@actions/exec");

const core = jest.requireMock("@actions/core") as { getInput: jest.Mock; setFailed: jest.Mock; setOutput: jest.Mock; info: jest.Mock; startGroup: jest.Mock; endGroup: jest.Mock };
const github = jest.requireMock("@actions/github") as { context: { repo: { owner: string; repo: string }; ref: string; sha: string }; getOctokit: jest.Mock };
const exec = (jest.requireMock("@actions/exec") as { exec: jest.Mock }).exec;

import {
  getInputs,
  getRepoOwner,
  getRepoName,
  getPackageVersion,
  listFiles,
  findModuleScripts,
  cloneUrl,
} from "../index";

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.GITHUB_TOKEN;
});

describe("getInputs", () => {
  it("returns parsed inputs from core.getInput", () => {
    (core as { getInput: jest.Mock }).getInput.mockImplementation((name: unknown) => {
      const map: Record<string, string> = {
        mode: "commit",
        dist_dir: "dist",
        build_script: "",
        version: "",
        cdn_branch: "cdn",
        github_token: "my-token",
        user_name: "Test User",
        user_email: "test@test.com",
      };
      return map[name as string] ?? "";
    });

    const inputs = getInputs();
    expect(inputs.mode).toBe("commit");
    expect(inputs.distDir).toBe("dist");
    expect(inputs.buildScript).toBe("");
  });

  it("throws for invalid mode", () => {
    (core as { getInput: jest.Mock }).getInput.mockReturnValue("invalid");
    expect(() => getInputs()).toThrow('Invalid mode: "invalid".');
  });
});

describe("getRepoOwner / getRepoName", () => {
  it("reads from github context", () => {
    expect(getRepoOwner()).toBe("test-owner");
    expect(getRepoName()).toBe("test-repo");
  });
});

describe("getPackageVersion", () => {
  it("reads version from package.json", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "updato-test-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ version: "1.2.3" }),
    );
    const cwd = process.cwd;
    process.cwd = () => dir;
    try {
      await expect(getPackageVersion()).resolves.toBe("1.2.3");
    } finally {
      process.cwd = cwd;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws when package.json is missing", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "updato-test-"));
    const cwd = process.cwd;
    process.cwd = () => dir;
    try {
      await expect(getPackageVersion()).rejects.toThrow(
        "package.json not found",
      );
    } finally {
      process.cwd = cwd;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("listFiles", () => {
  it("recursively lists all files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "updato-test-"));
    fs.writeFileSync(path.join(dir, "a.txt"), "");
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "b.txt"), "");
    try {
      const files = listFiles(dir);
      expect(files).toHaveLength(2);
      expect(files.some((f) => f.endsWith("a.txt"))).toBe(true);
      expect(files.some((f) => f.endsWith("b.txt"))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns empty array for empty directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "updato-test-"));
    try {
      expect(listFiles(dir)).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("findModuleScripts", () => {
  it("finds module scripts in HTML files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "updato-test-"));
    fs.writeFileSync(
      path.join(dir, "index.html"),
      '<script type="module" src="app.js"></script>',
    );
    fs.writeFileSync(path.join(dir, "app.js"), "");
    try {
      const modules = findModuleScripts(dir);
      const expected = path.resolve(dir, "app.js");
      expect(modules.has(expected)).toBe(true);
      expect(modules.size).toBe(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns empty set when no module scripts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "updato-test-"));
    fs.writeFileSync(
      path.join(dir, "index.html"),
      '<script src="app.js"></script>',
    );
    fs.writeFileSync(path.join(dir, "app.js"), "");
    try {
      expect(findModuleScripts(dir).size).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cloneUrl", () => {
  it("uses provided token", () => {
    const url = cloneUrl("my-token");
    expect(url).toContain("x-access-token:my-token");
    expect(url).toContain("github.com/test-owner/test-repo.git");
  });

  it("works with empty token", () => {
    const url = cloneUrl("");
    expect(url).toContain("x-access-token:");
  });
});
