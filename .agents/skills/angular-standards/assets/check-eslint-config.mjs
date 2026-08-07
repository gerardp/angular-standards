#!/usr/bin/env node
//
// Two guards on eslint.config.js. Both exist because a flat-config mistake fails SILENTLY:
// the config still lints clean, it just stops enforcing what angular-standards/references/ promises.
//
//   1. Composition — a later block that sets `no-restricted-imports` / `no-restricted-syntax`
//      REPLACES the earlier definition instead of extending it. Forgetting to spread the shared
//      constants removes the global bans for that layer.
//
//   2. Effective resolution — asserts what the rules actually come out as for representative
//      files, after all block overlaps and `ignores` are applied. This is the check that catches
//      "the spec files quietly lost their layer restrictions".
//
// Install: copy this file to scripts/ and eslint.config.js to the project root, then wire
//   "lint": "node scripts/check-eslint-config.mjs && ng lint"
// Run: node scripts/check-eslint-config.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

// Normal install is scripts/check-eslint-config.mjs next to a root eslint.config.js. Fall back to
// the working directory so the script also works when run from somewhere else.
const candidates = [
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'eslint.config.js'),
  path.resolve(process.cwd(), 'eslint.config.js'),
];
const configPath = candidates.find((p) => existsSync(p));
if (!configPath) {
  console.error(
    'eslint.config.js not found. Looked in:\n' +
      candidates.map((p) => `  - ${p}`).join('\n') +
      '\n\nCopy it from .agents/skills/angular-standards/assets/eslint.config.js to the project root.',
  );
  process.exit(1);
}
const config = require(configPath);

const failures = [];

// ── 1. Composition ─────────────────────────────────────────────────────────────────────────────

/** Must appear in EVERY block that defines no-restricted-imports. */
const GLOBAL_PACKAGES = [
  '@angular/animations',
  '@angular/common/http',
  '@angular/platform-browser-dynamic',
  'moment',
  'lodash',
  'axios',
];

/** Minimum selector count in EVERY block that defines no-restricted-syntax. */
const GLOBAL_SYNTAX_COUNT = 6;

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
          `    Fix: build the value with restrictImports(...) so BANNED_PACKAGES is spread in.`,
      );
    }
  }

  const syntax = block.rules['no-restricted-syntax'];
  if (syntax) {
    const count = syntax.length - 1; // first element is the severity
    if (count < GLOBAL_SYNTAX_COUNT) {
      failures.push(
        `${where}: no-restricted-syntax has ${count} selectors, expected >= ${GLOBAL_SYNTAX_COUNT}\n` +
          `    Fix: build the value with restrictSyntax(...) so BANNED_SYNTAX is spread in.`,
      );
    }
  }
}

// ── 2. Effective resolution ────────────────────────────────────────────────────────────────────

/** Minimal glob matcher. Tokenised in one pass so substitutions cannot corrupt each other. */
function globToRegExp(glob) {
  let out = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') { out += '(?:[^/]*/)*'; i += 3; } else { out += '.*'; i += 2; }
      } else { out += '[^/]*'; i += 1; }
    } else if (c === '?') { out += '[^/]'; i += 1; }
    else if ('.+^${}()|[]\\'.includes(c)) { out += `\\${c}`; i += 1; }
    else { out += c; i += 1; }
  }
  return new RegExp(`^${out}$`);
}
const matches = (glob, file) => globToRegExp(glob).test(file);

// Self-test the matcher; a broken matcher would make every assertion below meaningless.
for (const [glob, file, expected] of [
  ['**/*.spec.ts', 'src/app/ui/card/card.spec.ts', true],
  ['**/*.spec.ts', 'src/app/ui/card/card.ts', false],
  ['src/app/ui/**/*.ts', 'src/app/ui/card/card.ts', true],
  ['src/app/ui/helm/**', 'src/app/ui/helm/button/button.ts', true],
  ['src/app/ui/helm/**', 'src/app/ui/card/card.ts', false],
]) {
  if (matches(glob, file) !== expected) {
    failures.push(`internal: glob matcher wrong for ${glob} vs ${file}`);
  }
}

function resolve(file) {
  let imports = null;
  let syntax = null;
  for (const block of config) {
    if (!block?.rules || !block.files) continue;
    if (!block.files.some((g) => matches(g, file))) continue;
    if (block.ignores?.some((g) => matches(g, file))) continue;
    if (block.rules['no-restricted-imports']) imports = block.rules['no-restricted-imports'];
    if (block.rules['no-restricted-syntax']) syntax = block.rules['no-restricted-syntax'];
  }
  const groups = (imports?.[1]?.patterns ?? []).flatMap((p) => p.group);
  const paths = (imports?.[1]?.paths ?? []).map((p) => p.name);
  return {
    globals: GLOBAL_PACKAGES.every((p) => paths.includes(p)),
    banInject: (syntax ?? []).some((s) => s.selector?.includes('"inject"')),
    banFeatures: groups.some((g) => g.includes('features')),
    banApiSvc: groups.some((g) => g.includes('-api.service')),
    banFakeAsync: (syntax ?? []).some((s) => s.selector?.includes('fakeAsync')),
  };
}

/** What each representative file MUST resolve to. Update deliberately, never to make CI pass. */
const EXPECTATIONS = {
  // ui/ components: full layer boundaries, no injection, no I/O.
  'src/app/ui/card/card.ts': { globals: true, banInject: true, banFeatures: true, banApiSvc: true },
  // ui/ specs: keep the layer boundaries, lose the inject ban (TestBed.inject is legitimate).
  'src/app/ui/card/card.spec.ts': {
    globals: true, banInject: false, banFeatures: true, banApiSvc: true, banFakeAsync: true,
  },
  // Generated Helm code: globals only — we did not author it and it legitimately injects.
  'src/app/ui/helm/button/button.ts': {
    globals: true, banInject: false, banFeatures: false, banApiSvc: false,
  },
  // Feature components: no cross-feature imports, no direct API service.
  'src/app/features/inv/list.ts': {
    globals: true, banInject: false, banFeatures: true, banApiSvc: true,
  },
  // Feature services/stores: may use an API service; still no cross-feature imports.
  'src/app/features/inv/inv.service.ts': {
    globals: true, banInject: false, banFeatures: true, banApiSvc: false,
  },
  // Feature specs: layer boundaries kept, zone-era helpers banned.
  'src/app/features/inv/list.spec.ts': {
    globals: true, banFeatures: true, banApiSvc: false, banFakeAsync: true,
  },
  // util/ is pure.
  'src/app/util/money.ts': { globals: true, banFeatures: true },
};

for (const [file, expected] of Object.entries(EXPECTATIONS)) {
  const actual = resolve(file);
  for (const [key, want] of Object.entries(expected)) {
    if (actual[key] !== want) {
      failures.push(`${file}: expected ${key}=${want}, got ${actual[key]}`);
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error('eslint.config.js check FAILED:\n');
  for (const f of failures) console.error(`  - ${f}\n`);
  process.exit(1);
}

console.log(
  `eslint.config.js: composition intact, ${Object.keys(EXPECTATIONS).length} resolution cases pass.`,
);
