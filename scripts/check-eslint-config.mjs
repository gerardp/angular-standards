#!/usr/bin/env node
//
// Guards against the flat-config footgun described at the top of eslint.config.js:
// a later block that sets `no-restricted-imports` / `no-restricted-syntax` REPLACES the
// earlier definition instead of extending it. Forgetting to spread the shared constants
// silently removes the global bans for that layer — the config still lints clean, it just
// stops enforcing what docs/standards/longevity.md promises.
//
// Run: node scripts/check-eslint-config.mjs   (also wired into `npm run lint`)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Must appear in EVERY block that defines no-restricted-imports. */
const GLOBAL_PACKAGES = [
  '@angular/animations',
  '@angular/common/http',
  '@angular/platform-browser-dynamic',
  'moment',
  'lodash',
  'axios',
];

/** Minimum number of selectors in EVERY block that defines no-restricted-syntax. */
const GLOBAL_SYNTAX_COUNT = 6;

const config = require(path.join(root, 'eslint.config.js'));
const failures = [];

for (const block of config) {
  if (!block?.rules) continue;
  const where = JSON.stringify(block.files ?? '(all)');

  const imports = block.rules['no-restricted-imports'];
  if (imports) {
    const names = (imports[1]?.paths ?? []).map((p) => p.name);
    const missing = GLOBAL_PACKAGES.filter((p) => !names.includes(p));
    if (missing.length) {
      failures.push(
        `${where}: no-restricted-imports drops global bans: ${missing.join(', ')}\n` +
          `  Fix: build the value with restrictImports(...) so BANNED_PACKAGES is spread in.`,
      );
    }
  }

  const syntax = block.rules['no-restricted-syntax'];
  if (syntax) {
    const count = syntax.length - 1; // first element is the severity
    if (count < GLOBAL_SYNTAX_COUNT) {
      failures.push(
        `${where}: no-restricted-syntax has ${count} selectors, expected at least ${GLOBAL_SYNTAX_COUNT}\n` +
          `  Fix: build the value with restrictSyntax(...) so BANNED_SYNTAX is spread in.`,
      );
    }
  }
}

if (failures.length) {
  console.error('eslint.config.js composition check FAILED:\n');
  for (const f of failures) console.error(`  - ${f}\n`);
  process.exit(1);
}

console.log('eslint.config.js: all blocks retain the global restrictions.');
