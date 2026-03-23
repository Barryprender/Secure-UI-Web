#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook.
 * Reads the tool event from stdin, extracts the file path, and
 * minifies the CSS file if it is a source (non-min) .css file.
 *
 * Wired up in .claude/settings.json — do not run manually.
 */
'use strict';

const path   = require('path');
const minify = require('./minify-css');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const ev = JSON.parse(raw);
    const fp = ev?.tool_input?.file_path ?? '';
    if (!fp) return;

    const abs = path.resolve(fp);
    if (!abs.endsWith('.css') || abs.endsWith('.min.css')) return;

    minify(abs);
  } catch {
    // Non-JSON or missing fields — not a CSS edit, ignore silently
  }
});
