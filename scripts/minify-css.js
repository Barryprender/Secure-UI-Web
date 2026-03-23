#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Minify a single CSS source file to its .min.css counterpart.
 * @param {string} src  Absolute or relative path to the source .css file.
 * @returns {boolean}   true if the file was written, false otherwise.
 */
function minify(src) {
  src = path.resolve(src);

  if (!src.endsWith('.css') || src.endsWith('.min.css')) return false;
  if (!fs.existsSync(src)) { console.error(`minify-css: not found: ${src}`); return false; }

  const dst = src.replace(/\.css$/, '.min.css');
  const css = fs.readFileSync(src, 'utf8');

  const min = css
    .replace(/\/\*[\s\S]*?\*\//g, '')  // strip comments
    .replace(/\s*\n\s*/g, ' ')          // collapse newlines
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*>\s*/g, '>')
    .replace(/\s*~\s*/g, '~')
    .replace(/\s*\+\s*/g, '+')
    .trim();

  fs.writeFileSync(dst, min);
  const saved = (((css.length - min.length) / css.length) * 100).toFixed(1);
  console.log(`[css] ${path.basename(src)} → ${path.basename(dst)}  ${min.length} B  (${saved}% smaller)`);
  return true;
}

// CLI: node scripts/minify-css.js [file.css ...]
if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node scripts/minify-css.js <file.css> [file2.css ...]');
    process.exit(1);
  }
  files.forEach(f => minify(f));
}

module.exports = minify;
