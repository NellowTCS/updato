import * as core from "@actions/core";
import * as github from "@actions/github";
import * as exec from "@actions/exec";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";

export interface Manifest {
  app: string;
  mode: "commit" | "version";
  latest: string;
  files: string[];
  modules?: string[];
  timestamp: number;
}

export interface Inputs {
  mode: "commit" | "version";
  distDir: string;
  buildScript: string;
  version: string;
  cdnBranch: string;
  githubToken: string;
  userName: string;
  userEmail: string;
}

export function getInputs(): Inputs {
  const mode = core.getInput("mode");
  if (mode !== "commit" && mode !== "version") {
    throw new Error(`Invalid mode: "${mode}". Must be "commit" or "version".`);
  }
  return {
    mode,
    distDir: core.getInput("dist_dir"),
    buildScript: core.getInput("build_script"),
    version: core.getInput("version"),
    cdnBranch: core.getInput("cdn_branch"),
    githubToken: core.getInput("github_token") || process.env.GITHUB_TOKEN || "",
    userName: core.getInput("user_name"),
    userEmail: core.getInput("user_email"),
  };
}

export function getRepoOwner(): string {
  return github.context.repo.owner;
}

export function getRepoName(): string {
  return github.context.repo.repo;
}

export async function getCommitSha(): Promise<string> {
  let sha = "";
  const code = await exec.exec("git", ["rev-parse", "HEAD"], {
    silent: true,
    listeners: {
      stdout: (data) => {
        sha += data.toString().trim();
      },
    },
  });
  if (code !== 0 || !sha) {
    throw new Error("Failed to get current commit SHA");
  }
  return sha;
}

export async function getPackageVersion(): Promise<string> {
  const pkgPath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(
      "package.json not found in repo root. Provide an explicit version input."
    );
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    version?: string;
  };
  if (!pkg.version) {
    throw new Error(
      "No version field in package.json. Provide an explicit version input."
    );
  }
  return pkg.version;
}

export async function runBuild(buildScript: string): Promise<void> {
  core.startGroup("Running build script");
  try {
    const exitCode = await exec.exec("bash", ["-c", buildScript], {
      ignoreReturnCode: true,
    });
    if (exitCode !== 0) {
      throw new Error(`Build script exited with code ${exitCode}`);
    }
  } finally {
    core.endGroup();
  }
}

const SCRIPT_MODULE_RE = /<script[^>]*?type\s*=\s*["']module["'][^>]*?src\s*=\s*["']([^"']+)["']/gi;

export function findModuleScripts(distDir: string): Set<string> {
  const modules = new Set<string>();
  const htmlFiles = listFiles(distDir).filter(
    (f) => f.endsWith(".html") || f.endsWith(".htm"),
  );
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, "utf-8");
    SCRIPT_MODULE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SCRIPT_MODULE_RE.exec(content)) !== null) {
      const resolved = path.resolve(path.dirname(htmlFile), match[1]);
      modules.add(resolved);
    }
  }
  return modules;
}

export function listFiles(dir: string): string[] {
  const entries: string[] = [];
  function walk(current: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        entries.push(full);
      }
    }
  }
  walk(dir);
  return entries;
}

export function copyDirectoryContents(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryContents(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function cloneUrl(token: string): string {
  return `https://x-access-token:${token}@github.com/${getRepoOwner()}/${getRepoName()}.git`;
}

export async function deployToCdn(
  inputs: Inputs,
  version: string
): Promise<void> {
  const absDistDir = path.resolve(inputs.distDir);
  if (!fs.existsSync(absDistDir)) {
    throw new Error(
      `Build directory "${inputs.distDir}" does not exist. Run a build script first or check dist_dir input.`
    );
  }

  const files = listFiles(absDistDir);
  const worktree = path.join(os.tmpdir(), `updato-deploy-${randomUUID()}`);
  fs.mkdirSync(worktree, { recursive: true });

  try {
    const cloneCode = await exec.exec(
      "git",
      [
        "clone",
        "--branch",
        inputs.cdnBranch,
        "--single-branch",
        cloneUrl(inputs.githubToken),
        worktree,
      ],
      { silent: true, ignoreReturnCode: true }
    );

    if (cloneCode !== 0) {
      core.info(
        `Branch "${inputs.cdnBranch}" does not exist. Initializing new branch.`
      );
      await exec.exec("git", ["init"], { cwd: worktree, silent: true });
      fs.writeFileSync(
        path.join(worktree, "README.md"),
        `# ${inputs.cdnBranch}\nUpdato CDN artifacts\n`,
        "utf-8"
      );
    }

    const latestDir = path.join(worktree, "latest");
    fs.mkdirSync(latestDir, { recursive: true });
    copyDirectoryContents(absDistDir, latestDir);

    const versionsDir = path.join(worktree, "versions", version);
    fs.mkdirSync(versionsDir, { recursive: true });
    copyDirectoryContents(absDistDir, versionsDir);

    const existingManifestPath = path.join(worktree, "manifest.json");
    const existingManifest: Manifest | null = fs.existsSync(
      existingManifestPath
    )
      ? (JSON.parse(
          fs.readFileSync(existingManifestPath, "utf-8")
        ) as Manifest)
      : null;

    const relativeFiles = files.map((f) => f.replace(absDistDir + "/", ""));
    const moduleScripts = findModuleScripts(absDistDir);
    const modules = relativeFiles.filter((f) => {
      const abs = path.join(absDistDir, f);
      return moduleScripts.has(abs);
    });

    const manifest: Manifest = {
      app: getRepoName(),
      mode: inputs.mode,
      latest: version,
      files: relativeFiles,
      modules: modules.length > 0 ? modules : undefined,
      timestamp: Math.floor(Date.now() / 1000),
    };
    fs.writeFileSync(
      path.join(worktree, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );

    await exec.exec("git", ["add", "-A", "."], {
      cwd: worktree,
      silent: true,
    });

    const oldVersion = existingManifest ? existingManifest.latest : null;
    const commitMessage = oldVersion
      ? `deploy: ${version} (was ${oldVersion})`
      : `deploy: ${version}`;

    const commitCode = await exec.exec(
      "git",
      ["commit", "--allow-empty", "-m", commitMessage],
      { cwd: worktree, silent: true, ignoreReturnCode: true }
    );

    if (commitCode !== 0) {
      core.info("Nothing new to commit. CDN is up to date.");
      return;
    }

    if (cloneCode !== 0) {
      await exec.exec("git", ["branch", "-M", inputs.cdnBranch], {
        cwd: worktree,
        silent: true,
      });
    }

    await exec.exec("git", ["remote", "add", "origin", cloneUrl(inputs.githubToken)], {
      cwd: worktree,
      silent: true,
      ignoreReturnCode: true,
    });

    await exec.exec("git", ["push", "origin", inputs.cdnBranch], {
      cwd: worktree,
      silent: true,
    });

    core.info(`Deployed ${version} to branch "${inputs.cdnBranch}".`);
  } finally {
    fs.rmSync(worktree, { recursive: true, force: true });
  }
}

export async function run(): Promise<void> {
  try {
    const inputs = getInputs();

    if (!inputs.githubToken) {
      core.setFailed("github_token input or GITHUB_TOKEN environment variable is required.");
      return;
    }

    const commitSha = await getCommitSha();

    let version: string;
    if (inputs.mode === "version") {
      version = inputs.version || (await getPackageVersion());
    } else {
      version = commitSha;
    }

    if (inputs.buildScript) {
      await runBuild(inputs.buildScript);
    }

    await exec.exec("git", ["config", "--global", "user.name", inputs.userName]);
    await exec.exec("git", ["config", "--global", "user.email", inputs.userEmail]);

    await deployToCdn(inputs, version);

    core.setOutput("version", version);
    core.setOutput("commit", commitSha);
    core.setOutput("branch", inputs.cdnBranch);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

void run();
