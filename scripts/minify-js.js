#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Minify a single JS source file to its .min.js counterpart.
 * Strips comments, collapses whitespace. Suitable for vanilla ES2022+
 * scripts with no imports/exports (script-tag delivery).
 *
 * Not a full AST minifier — variable renaming and dead-code elimination
 * are out of scope. For that, install terser and replace this script.
 *
 * @param {string} src  Absolute or relative path to the source .js file.
 * @returns {boolean}   true if the file was written, false otherwise.
 */
function minify(src) {
  src = path.resolve(src);

  if (!src.endsWith('.js') || src.endsWith('.min.js')) return false;
  if (!fs.existsSync(src)) { console.error(`minify-js: not found: ${src}`); return false; }

  const dst = src.replace(/\.js$/, '.min.js');
  const js  = fs.readFileSync(src, 'utf8');

  let min = js
    // Strip block comments (/* ... */) — preserve copyright headers if needed
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Strip single-line comments — careful not to strip URLs (http://)
    .replace(/(?<![:\w])\/\/[^\n]*/g, '')
    // Collapse whitespace runs (spaces, tabs) to a single space
    .replace(/[ \t]+/g, ' ')
    // Remove blank lines
    .replace(/\n[ \t]*\n/g, '\n')
    // Trim leading/trailing space on each line
    .replace(/^ +| +$/gm, '')
    // Collapse multiple newlines
    .replace(/\n+/g, '\n')
    .trim();

  fs.writeFileSync(dst, min);
  const saved = (((js.length - min.length) / js.length) * 100).toFixed(1);
  console.log(`[js]  ${path.basename(src)} → ${path.basename(dst)}  ${min.length} B  (${saved}% smaller)`);
  return true;
}

// CLI: node scripts/minify-js.js [file.js ...]
if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node scripts/minify-js.js <file.js> [file2.js ...]');
    process.exit(1);
  }
  files.forEach(f => minify(f));
}

module.exports = minify;
