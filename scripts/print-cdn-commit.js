#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  const output = execSync('git ls-remote --heads origin cdn | awk \'{print $1}\'').toString().trim();
  if (output) {
    console.log(`cdn commit: ${output}`);
  } else {
    console.log('cdn branch not found.');
  }
} catch (err) {
  console.error('Error retrieving cdn commit:', err.message);
}
