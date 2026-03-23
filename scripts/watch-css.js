#!/usr/bin/env node
/**
 * CSS watcher — run once in a terminal alongside your dev server:
 *
 *   node scripts/watch-css.js
 *
 * Watches static/styles/ and regenerates *.min.css whenever a source
 * file is saved. Works with any editor or IDE.
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const minify = require('./minify-css');

const stylesDir = path.join(__dirname, '..', 'static', 'styles');

if (!fs.existsSync(stylesDir)) {
  console.error(`watch-css: directory not found: ${stylesDir}`);
  process.exit(1);
}

const timers = {};

function onChange(filename) {
  if (!filename || !filename.endsWith('.css') || filename.endsWith('.min.css')) return;

  // Debounce — editors often write in multiple bursts
  clearTimeout(timers[filename]);
  timers[filename] = setTimeout(() => {
    const full = path.join(stylesDir, filename);
    if (fs.existsSync(full)) minify(full);
  }, 120);
}

fs.watch(stylesDir, { persistent: true }, (_, filename) => onChange(filename));

console.log(`[css] watching ${stylesDir}`);
console.log('[css] Ctrl+C to stop');
