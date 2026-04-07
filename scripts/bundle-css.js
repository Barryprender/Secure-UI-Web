#!/usr/bin/env node
/**
 * CSS build script — minifies all source CSS files and assembles global.min.css.
 *
 *   node scripts/bundle-css.js
 *
 * Steps:
 *   1. Minify every *.css file in static/styles (excluding global.css and *.min.css).
 *   2. Concatenate the global bundle files in dependency order into global.min.css.
 *
 * global.css uses @import for dev convenience. The bundle replaces those imports
 * with a single concatenated file so the server makes one HTTP request, not seven.
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const minify = require('./minify-css');

const stylesDir = path.join(__dirname, '..', 'static', 'styles');

// Critical CSS — render-blocking. Only styles needed for above-fold paint.
const globalBundle = [
  'fonts/fonts.min.css',
  'tokens/tokens.min.css',
  'base/base.min.css',
  'navigation/navigation.min.css',
  'no-js-fallback/no-js-fallback.min.css',
];

// Deferred CSS — loaded async after initial render. Below-fold content only.
const deferredBundle = [
  'footer/footer.min.css',
  'view-transitions/view-transitions.min.css',
];

// Step 1: Minify all source CSS files, skipping global.css (it's an @import manifest,
// not a real source file — its output is assembled in step 2).
function minifyAll() {
  const skip = new Set(['global/global.css']);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.css') && !entry.name.endsWith('.min.css')) {
        const rel = path.relative(stylesDir, full).replace(/\\/g, '/');
        if (!skip.has(rel)) minify(full);
      }
    }
  }

  walk(stylesDir);
}

// Step 2: Concatenate a bundle of files into an output file.
function bundle(files, outPath, label) {
  const parts = files.map(rel => {
    const full = path.join(stylesDir, rel);
    if (!fs.existsSync(full)) {
      console.error(`bundle-css: missing ${rel}`);
      process.exit(1);
    }
    return fs.readFileSync(full, 'utf8');
  });

  fs.writeFileSync(outPath, parts.join(''));
  const size = fs.statSync(outPath).size;
  console.log(`[css] bundled ${label}  ${size} B  (${files.length} files)`);
}

minifyAll();
bundle(globalBundle,  path.join(stylesDir, 'global', 'global.min.css'),   'global.min.css  ');
bundle(deferredBundle, path.join(stylesDir, 'global', 'deferred.min.css'), 'deferred.min.css');
