// @ts-check
// Architecture enforcement. The rules in angular-standards/references/ that CAN be checked mechanically are
// checked here — review discipline decays, a failing build does not.
//
// Setup:
//   ng add @angular-eslint/schematics
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// IMPORTANT — how flat config composes rules
//
// In ESLint flat config, when several config objects match the same file, the LAST definition of
// a given rule REPLACES the earlier one. Options are not merged: a later
// `no-restricted-imports` does not extend an earlier one, it discards it.
// https://eslint.org/docs/latest/use/configure/rules
//
// So every block below that sets `no-restricted-imports` or `no-restricted-syntax` must spread
// the shared constants explicitly. Adding a per-layer rule without spreading BANNED_PACKAGES /
// BANNED_SYNTAX silently removes the global bans for that layer.
//
// If a rule name errors as unknown after install, check it against the installed angular-eslint
// version rather than deleting it — each rule below names the standard it enforces.
// ─────────────────────────────────────────────────────────────────────────────────────────────

const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

// ── Shared restriction sets ────────────────────────────────────────────────────────────────────

/** angular-standards/references/longevity.md#banned-apis — applies everywhere. */
const BANNED_PACKAGES = [
  {
    name: '@angular/animations',
    message:
      'Deprecated. Use native CSS with animate.enter / animate.leave. angular-standards/references/longevity.md',
  },
  {
    name: '@angular/common/http',
    importNames: ['HttpClientModule'],
    message: 'Deprecated. Use provideHttpClient(). angular-standards/references/longevity.md',
  },
  {
    name: '@angular/platform-browser-dynamic',
    message: 'Use bootstrapApplication(). angular-standards/references/longevity.md',
  },
  { name: 'moment', message: 'Use Intl.* / Temporal. angular-standards/references/longevity.md' },
  {
    name: 'lodash',
    message: 'Write the function you need into src/app/util/. angular-standards/references/longevity.md',
  },
  { name: 'axios', message: 'Use provideHttpClient(). angular-standards/references/longevity.md' },
];

/** angular-standards/references/longevity.md#banned-apis — decorators and APIs superseded by signals. */
const BANNED_SYNTAX = [
  {
    selector: 'PropertyDefinition > Decorator > CallExpression[callee.name="Input"]',
    message: '@Input() is banned. Use input() / input.required(). angular-standards/references/longevity.md',
  },
  {
    selector: 'PropertyDefinition > Decorator > CallExpression[callee.name="Output"]',
    message: '@Output() is banned. Use output(). angular-standards/references/longevity.md',
  },
  {
    selector:
      'PropertyDefinition > Decorator > CallExpression[callee.name=/^(ViewChild|ViewChildren|ContentChild|ContentChildren)$/]',
    message:
      'Query decorators are banned. Use viewChild() / contentChild(). angular-standards/references/longevity.md',
  },
  {
    selector:
      'PropertyDefinition > Decorator > CallExpression[callee.name=/^(HostBinding|HostListener)$/]',
    message:
      '@HostBinding/@HostListener are banned. Use the host object. angular-standards/references/components.md',
  },
  {
    selector: 'CallExpression[callee.property.name="mutate"]',
    message:
      'signal.mutate() does not exist. Use .set() / .update(). angular-standards/references/reactivity-and-state.md',
  },
  {
    selector: 'CallExpression[callee.name="provideZoneChangeDetection"]',
    message: 'This app is zoneless. angular-standards/references/longevity.md',
  },
  // The v22 ng update migration WRITES this line for you, into files nobody touched — so it is
  // the one banned API that arrives without anyone typing it. Deliberately narrowed to the two
  // values that opt a component out of OnPush: an explicit `OnPush` is noise, not a defect, and
  // generated Helm code may legitimately carry one.
  {
    selector:
      'Property[key.name="changeDetection"] > MemberExpression[object.name="ChangeDetectionStrategy"][property.name=/^(Eager|Default)$/]',
    message:
      'Eager/Default opt the component out of OnPush, which is the v22 default. Delete the changeDetection line and put the state in a signal. angular-standards/references/longevity.md#eager-arrives-by-migration-not-by-hand',
  },
];

/**
 * angular-standards/references/architecture.md#the-one-rule — components never perform I/O.
 * The *-api.service.ts naming convention is what makes this checkable.
 */
const IO_PATHS = [
  {
    name: '@angular/common/http',
    importNames: ['HttpClient', 'httpResource'],
    message:
      'Components never perform I/O. Call a service or store method. angular-standards/references/architecture.md#the-one-rule',
  },
];

const IO_PATTERNS = [
  {
    group: ['**/*-api.service'],
    message:
      'Components never import an API service directly. Go through a feature service or store. angular-standards/references/architecture.md#the-one-rule',
    allowTypeImports: true,
  },
];

/** angular-standards/references/architecture.md#dependency-direction — one entry per layer. */
const LAYER_PATTERNS = {
  util: [
    {
      group: ['@angular/*', '**/core/**', '**/features/**', '**/data-access/**', '**/ui/**'],
      message:
        'util/ must be pure: no Angular, no DI, no app imports. angular-standards/references/architecture.md',
    },
  ],
  ui: [
    {
      group: ['**/features/**', '**/core/**'],
      message:
        'ui/ components are presentational: inputs in, outputs out. angular-standards/references/components.md#presentational-components-ui',
    },
    {
      group: ['**/data-access/**'],
      message:
        'ui/ must not depend on data-access services. Accept data via input(). angular-standards/references/architecture.md',
      allowTypeImports: true,
    },
  ],
  dataAccess: [
    {
      group: ['**/features/**', '**/ui/**'],
      message:
        'data-access/ must not depend on features or UI. angular-standards/references/architecture.md#dependency-direction',
    },
  ],
  core: [
    {
      group: ['**/features/**'],
      message:
        'core/ must not depend on features. Invert the dependency. angular-standards/references/architecture.md#dependency-direction',
    },
  ],
  // Within-feature imports are relative ("./x", "../sibling/x") and do not contain "features/",
  // so this catches only cross-feature reaches.
  //
  // NOTE: a good approximation, not airtight. For full enforcement install
  // eslint-plugin-boundaries and declare element types — worth doing past a handful of features.
  features: [
    {
      group: ['**/features/*/**', '@app/features/**'],
      message:
        'A feature must never import another feature. Move the shared code down into ui/, data-access/, util/ or core/. angular-standards/references/architecture.md#dependency-direction',
    },
  ],
};

/** Compose a complete `no-restricted-imports` value. Always includes the global bans. */
const restrictImports = (patterns = [], extraPaths = []) => [
  'error',
  { paths: [...BANNED_PACKAGES, ...extraPaths], patterns },
];

/** Compose a complete `no-restricted-syntax` value. Always includes the global bans. */
const restrictSyntax = (extra = []) => ['error', ...BANNED_SYNTAX, ...extra];

module.exports = tseslint.config(
  // ───────────────────────────────────────────────────────────────────────────── TypeScript ──
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // ── core-engineering.md: types ──
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // 'no-public': require private/protected to be explicit, but keep public members bare —
      // which is what the examples in angular-standards/references/components.md do.
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'no-public' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // ── core-engineering.md: error handling — never swallow ──
      'no-empty': ['error', { allowEmptyCatch: false }],

      // ── Angular style guide (components.md: naming) ──
      '@angular-eslint/component-class-suffix': 'off', // v20+ style guide dropped the suffix
      '@angular-eslint/directive-class-suffix': 'off',
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],

      // ── longevity.md: banned APIs ──
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/no-host-metadata-property': 'off', // we REQUIRE the host object
      '@angular-eslint/no-attribute-decorator': 'error',

      'no-restricted-imports': restrictImports(),
      'no-restricted-syntax': restrictSyntax(),
    },
  },

  // ─────────────────────────────────────────────────── architecture.md: layer rules ──
  // Each block re-composes the global bans. See the note at the top of this file.

  {
    // util/ is pure: no Angular, no DI, no app imports.
    files: ['src/app/util/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictImports(LAYER_PATTERNS.util),
      'no-restricted-syntax': restrictSyntax(),
    },
  },

  {
    // ui/ layer boundaries. These apply to specs too — a test in ui/ importing from features/
    // is the same coupling as the component doing it, and would leak past the rule below.
    //
    // Generated Spartan Helm code is EXCLUDED throughout: it legitimately injects (it composes
    // Brain primitives via hostDirectives and uses CDK services), and we did not author it.
    // Keep this glob in step with `componentsPath` in components.json — see
    // angular-standards/references/spartan-ui.md#where-helm-code-lives
    files: ['src/app/ui/**/*.ts'],
    ignores: ['src/app/ui/helm/**'],
    rules: {
      'no-restricted-imports': restrictImports([...LAYER_PATTERNS.ui, ...IO_PATTERNS], IO_PATHS),
      'no-restricted-syntax': restrictSyntax(),
    },
  },

  {
    // ui/ components inject nothing. Specs are exempt: a test legitimately calls
    // TestBed.inject() to get the thing under test.
    files: ['src/app/ui/**/*.ts'],
    ignores: ['src/app/ui/helm/**', '**/*.spec.ts'],
    rules: {
      'no-restricted-imports': restrictImports([...LAYER_PATTERNS.ui, ...IO_PATTERNS], IO_PATHS),
      'no-restricted-syntax': restrictSyntax([
        {
          selector: 'CallExpression[callee.name="inject"]',
          message:
            'Components in ui/ must inject nothing. Move it to a feature. angular-standards/references/components.md#presentational-components-ui',
        },
      ]),
    },
  },

  {
    // data-access/ is transport + mapping. It never knows about features or UI.
    files: ['src/app/data-access/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictImports(LAYER_PATTERNS.dataAccess),
      'no-restricted-syntax': restrictSyntax(),
    },
  },

  {
    // core/ is app-wide infrastructure. It never reaches into a feature.
    files: ['src/app/core/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictImports(LAYER_PATTERNS.core),
      'no-restricted-syntax': restrictSyntax(),
    },
  },

  {
    // features/ never import each other. Services and stores in a feature MAY do I/O.
    files: ['src/app/features/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictImports(LAYER_PATTERNS.features),
      'no-restricted-syntax': restrictSyntax(),
    },
  },

  {
    // Components inside features: everything above, PLUS the no-I/O rule.
    // Services, stores and specs are excluded — they are the layer allowed to do I/O.
    files: ['src/app/features/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*-store.ts',
      '**/*.store.ts',
      '**/*.service.ts',
      '**/*-service.ts',
    ],
    rules: {
      'no-restricted-imports': restrictImports(
        [...LAYER_PATTERNS.features, ...IO_PATTERNS],
        IO_PATHS,
      ),
      'no-restricted-syntax': restrictSyntax(),
    },
  },

  // ──────────────────────────────────────────────────────────────────────────── Templates ──
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // longevity.md: built-in control flow only
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',

      // components.md: templates
      '@angular-eslint/template/no-call-expression': ['error', { allowList: [] }],
      '@angular-eslint/template/use-track-by-function': 'error',
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/eqeqeq': 'error',

      // core-engineering.md: accessibility baseline — errors, not warnings
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/valid-aria': 'error',
      '@angular-eslint/template/role-has-required-aria': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/no-autofocus': 'error',
      '@angular-eslint/template/table-scope': 'error',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────────── Tests ──
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      // testing.md#zoneless-testing — Zone-era helpers do not apply to a zoneless app.
      // NOTE: .subscribe() is deliberately NOT banned here. Testing a genuinely
      // Observable-returning API by subscribing is legitimate; see angular-standards/references/testing.md.
      'no-restricted-syntax': restrictSyntax([
        {
          selector: 'CallExpression[callee.name=/^(fakeAsync|tick)$/]',
          message:
            'Zone-based test helpers. Use await fixture.whenStable(). angular-standards/references/testing.md#zoneless-testing',
        },
      ]),
    },
  },
);
