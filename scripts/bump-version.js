#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  let level = 'patch';
  let yes = false;
  args.forEach(arg => {
    if (arg === '--major' || arg === '-M') level = 'major';
    if (arg === '--minor' || arg === '-m') level = 'minor';
    if (arg === '--patch' || arg === '-p') level = 'patch';
    if (arg === '--yes' || arg === '-y') yes = true;
  });
  return { level, yes };
}

function bump(v, level) {
  const parts = v.split('.').map(Number);
  if (parts.length !== 3) throw new Error(`Invalid semver: ${v}`);
  switch (level) {
    case 'major': parts[0]++; parts[1] = 0; parts[2] = 0; break;
    case 'minor': parts[1]++; parts[2] = 0; break;
    case 'patch': parts[2]++; break;
  }
  return parts.join('.');
}

function loadPkg(dir) {
  const path = join(dir, 'package.json');
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

function writePkg(dir, pkg) {
  const path = join(dir, 'package.json');
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
}

function run() {
  const { level, yes } = parseArgs();
  const dirs = ['.', join('Action'), join('Build'), join('Worker')];
  const pkgs = dirs.map(loadPkg);
  const newVersion = bump(pkgs[0].version, level);

  // Write updated versions
  pkgs[0].version = newVersion;
  pkgs[1].version = newVersion;
  pkgs[2].version = newVersion;
  pkgs[3].version = newVersion;
  for (let i = 0; i < dirs.length; i++) {
    writePkg(dirs[i], pkgs[i]);
  }

  // Commit
  execSync('git add .');
  execSync(`git commit -m "chore: bump version to ${newVersion}"`);

  // Tag
  const tag = `v${newVersion}`;
  execSync(`git tag ${tag}`);
  execSync('git push');
  execSync(`git push origin ${tag}`);

  console.log(`Bumped to ${newVersion} and tagged ${tag}`);
}

run();
