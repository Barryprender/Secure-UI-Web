#!/usr/bin/env node
/**
 * Asset watcher — run once in a terminal alongside your dev server:
 *
 *   node scripts/watch-css.js
 *
 * Watches static/styles/ and static/js/ recursively.
 * - *.css  → regenerates *.min.css; rebuilds global.min.css when a bundled file changes.
 * - *.js   → regenerates *.min.js
 */
'use strict';

const fs        = require('fs');
const path      = require('path');
const minify    = require('./minify-css');
const minifyJs  = require('./minify-js');

const stylesDir = path.join(__dirname, '..', 'static', 'styles');
const jsDir     = path.join(__dirname, '..', 'static', 'js');

if (!fs.existsSync(stylesDir)) {
  console.error(`watch-css: directory not found: ${stylesDir}`);
  process.exit(1);
}

// Files that compose global.min.css — must stay in sync with bundle-css.js.
const globalBundleInputs = new Set([
  'fonts/fonts.min.css',
  'tokens/tokens.min.css',
  'base/base.min.css',
  'navigation/navigation.min.css',
  'footer/footer.min.css',
  'view-transitions/view-transitions.min.css',
  'no-js-fallback/no-js-fallback.min.css',
]);

const globalBundleOrder = [
  'fonts/fonts.min.css',
  'tokens/tokens.min.css',
  'base/base.min.css',
  'navigation/navigation.min.css',
  'footer/footer.min.css',
  'view-transitions/view-transitions.min.css',
  'no-js-fallback/no-js-fallback.min.css',
];

function rebuildGlobal() {
  const parts = globalBundleOrder.map(rel => {
    const full = path.join(stylesDir, rel);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  });
  const out = path.join(stylesDir, 'global', 'global.min.css');
  fs.writeFileSync(out, parts.join(''));
  const size = fs.statSync(out).size;
  console.log(`[css] bundled global.min.css  ${size} B`);
}

const timers = {};

function onChange(filename) {
  if (!filename) return;
  // Normalise Windows backslashes
  filename = filename.replace(/\\/g, '/');
  if (!filename.endsWith('.css') || filename.endsWith('.min.css')) return;

  clearTimeout(timers[filename]);
  timers[filename] = setTimeout(() => {
    const full = path.join(stylesDir, filename);
    if (!fs.existsSync(full)) return;

    const changed = minify(full);
    if (!changed) return;

    // Check if the resulting .min.css is part of the global bundle.
    const minRel = filename.replace(/\.css$/, '.min.css');
    if (globalBundleInputs.has(minRel)) {
      rebuildGlobal();
    }
  }, 120);
}

function onJsChange(filename) {
  if (!filename) return;
  filename = filename.replace(/\\/g, '/');
  if (!filename.endsWith('.js') || filename.endsWith('.min.js')) return;

  clearTimeout(timers['js:' + filename]);
  timers['js:' + filename] = setTimeout(() => {
    const full = path.join(jsDir, filename);
    if (!fs.existsSync(full)) return;
    minifyJs(full);
  }, 120);
}

// recursive: true is required to detect changes in subdirectories.
fs.watch(stylesDir, { persistent: true, recursive: true }, (_, filename) => onChange(filename));
fs.watch(jsDir,     { persistent: true, recursive: true }, (_, filename) => onJsChange(filename));

console.log(`[css] watching ${stylesDir}`);
console.log(`[js]  watching ${jsDir}`);
console.log('[   ] Ctrl+C to stop');
