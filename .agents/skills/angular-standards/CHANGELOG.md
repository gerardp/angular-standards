# Changelog — angular-standards

This file ships **inside the skill**, on purpose. `npx skills update angular-standards` overwrites
`.agents/skills/angular-standards/` in place, so the changelog has to arrive in the same diff as the
rules it describes. A changelog left behind in the source repository is one the consumer never sees.

## What the version number means

`metadata.version` in `SKILL.md` is semver, and the question it answers is *"can code that passed
review yesterday fail today?"*

| Bump | Means | Consumer action |
| --- | --- | --- |
| **MAJOR** | A rule got stricter: a new banned API, a new error-level rule in `assets/`, a tightened dependency direction, or a change to which upstream skills must be installed. Compliant code can stop being compliant. | Read the entry. It names what it invalidates and what to do. |
| **MINOR** | New ground covered **that invalidates nothing**: guidance for a decision the codebase has not made yet, a new `references/` file about a subject with no existing code, a clarified `Audit:` line, better examples. | Read at leisure. |
| **PATCH** | Wording, examples, links, upstream pin refresh. No rule changed. | None. |

The invalidation test governs, and it beats the category every time. "Previously unspecified" is
**not** a reason to call something MINOR: a first rule about an unaddressed subject is MAJOR the
moment existing code can violate it, and most new rules can. If you have to think about whether
anything breaks, you already have your answer — bump MAJOR.

**Every MAJOR entry states what it invalidates and how to comply.** That is the same bar
[SKILL.md](SKILL.md#maintaining-the-standards) puts on an `AGENTS.local.md` override — a change
without a stated consequence becomes silent drift by accident, whether it is an exception or a rule.

Release procedure: bump `metadata.version` in `SKILL.md` and add the entry here **in the same
commit as the rule change**, then tag `v<version>`. A rule change that ships without both is the
defect this file exists to prevent.

---

## 6.0.0 — 2026-09-01

### Breaking

- **`'unsafe-inline'` is out of the `style-src` baseline.** *Invalidates:* the target policy this
  file published up to 5.0.0. A deployment serving `style-src 'self' 'unsafe-inline'` was compliant
  and is not now — this is a change to the standard, not to any code in the repository, so it will
  not surface in a build. *To comply:* generate a nonce per response, name it in both `script-src`
  and `style-src`, and put it on the root element with `ngCspNonce` (or supply it through the
  `CSP_NONCE` token when the bootstrap is programmatic). If the host genuinely cannot produce a
  per-response value, keep `'unsafe-inline'` on `style-src` **only** and record it in
  `AGENTS.local.md` with a removal condition. A constant nonce committed to `index.html` does not
  comply: it grants what it appears to withhold, and it is now explicitly flagged.
- **Form-field debouncing must use `debounce()` from `@angular/forms/signals`.** *Invalidates:*
  hand-rolled debouncing around a `[formField]`-bound value — `debounceTime`, a `setTimeout`, or a
  manual flush on blur or submit. *To comply:* delete it and add `debounce(path.field, ms)` to the
  schema. The rule already syncs on touched (which includes blur) and on `submit()`, so the manual
  guard could only disagree with it. This is a **different API** from the banned `debounced()` in
  `@angular/core`; the ban was never about this one.
- **Form submission is configured on `form()`, not wired in the template.** *Invalidates:* the
  shape this file prescribed until now — an `onSubmit()` method calling the standalone `submit()`
  for an ordinary `<form>`, and any `(submit)`/`(ngSubmit)` handler doing its own `preventDefault`
  or `novalidate`. *To comply:* pass `submission.action` as `form()`'s third argument and bind
  `[formRoot]`, which sets all three. The standalone `submit()` stays correct for wizard steps,
  auto-save, and triggers outside the `<form>`.
- **Submit-time server errors are returned from the action, not surfaced as a separate signal.**
  *Invalidates:* the previous instruction to expose a conflict or a decline as a service signal
  rendered beside the form. *To comply:* return `{ kind, message, fieldTree }` from the action.
  They then land in the field's `errors()` alongside validation errors and **auto-clear when the
  user edits that field** — the parallel signal had to be cleared by hand, and the stale
  "already taken" under a corrected field is the bug that follows from not doing it.
- **A form using `validateHttp` or `validateAsync` must set `ignoreValidators: 'none'`.**
  *Invalidates:* every such form relying on the default. `'pending'` does not block on validators
  in flight — if nothing has failed *yet*, the action runs while the uniqueness check is still
  outstanding. *To comply:* set `'none'`. This standard already prescribed `validateHttp` for
  server-checked uniqueness, so the race was reachable from following it.
- **An `injectAsync` target may not be statically imported anywhere else, and the split must be
  verified.** *Invalidates:* every existing `injectAsync` whose target is also reachable through a
  plain `import` — a barrel re-export, a sibling that needed one constant, a helper. Those were
  never actually split, and nothing reported it: no error, no warning, no lint failure, correct
  behaviour, bytes still in the eager chunk. *To comply:* grep the class name across the project,
  convert type-only consumers to `import type`, and confirm a separate chunk exists in the esbuild
  metafile or the Network tab. Every reason to use `injectAsync` is a bundle-size reason, so an
  unverified split is an optimisation with no evidence it happened.
- **`ɵ`-prefixed Angular imports are banned, with a lint rule.** *Invalidates:* every private-API
  import — `ɵDeferBlockState` being the one that circulates most, because it was private when the
  examples using it were written and is public as `DeferBlockState` now. *To comply:* check the
  package's public API for the unprefixed name before assuming there is no equivalent. `ɵ` means no
  deprecation cycle, no changelog entry, and free to vanish in a patch release — the definition of
  scheduled work for a future maintainer.
- **An `@defer` block's states are behaviour and need tests.** *Invalidates:* `@defer` blocks whose
  `@loading` and `@error` branches are never rendered in a spec — which is most of them, because
  reaching those states used to mean mocking `IntersectionObserver` or `requestIdleCallback`. *To
  comply:* `DeferBlockBehavior.Manual` plus `fixture.getDeferBlocks()` and
  `DeferBlockFixture.render(DeferBlockState.X)`. No trigger, no timers.
- **The auth interceptor must be scoped to your own origin, with a default-deny allowlist.**
  *Invalidates:* every auth interceptor that attaches a token unconditionally — which is what this
  file's own "attaches credentials centrally" line described until now — and every origin check
  written as `startsWith`/`includes` on a URL string, since
  `https://api.example.com.attacker.tld` passes one. *To comply:* compare
  `new URL(req.url, location.origin).origin` against an allowlist and attach nothing otherwise. The
  interceptor chain is global, so the first call to any second backend sends your bearer token to a
  third party, the request succeeds, and nothing warns you.
- **`APP_INITIALIZER` is banned.** *Invalidates:* runtime-configuration bootstrapping written from
  any tutorial published before the replacement landed — which is most of them. *To comply:* use
  `provideAppInitializer(() => …)`. It is marked `@deprecated` in Angular's public API.
- **`angular-architecture` joins the do-not-install list.** *Invalidates:* nothing in a codebase,
  but a project that installed it after reading the provenance note now has two skills issuing
  contradictory state-management rules. *To comply:* uninstall it, or record the exception in
  `AGENTS.local.md` naming which skill wins on stores.

### Changed

- [security.md](references/security.md#style-src-and-ngcspnonce) gains a `style-src` / `ngCspNonce`
  section: why the directive survives every review, the `CSP_NONCE` alternative, and why a constant
  nonce is worse than the `'unsafe-inline'` it replaces.
- [forms.md](references/forms.md#debouncing-input) gains a debouncing section, and
  [reactivity-and-state.md](references/reactivity-and-state.md#debouncing-stays-in-rxjs-for-now)
  now opens by sending form fields there. Two APIs one letter apart, in different packages, at
  different stability tiers — and only the banned one had a rule pointing at it, so the lint
  message for `debounced()` now names the forms answer first. `minDate`/`maxDate` join the
  validator list in rule 2. Verified against Angular's `guide/forms/signals` source, not against
  secondary write-ups: the claim circulating that v22 auto-converts a text input to `number` and
  an empty one to `null` is **not** in that documentation — `number | null` comes from writing a
  `FormValueControl<number | null>` custom control — so rule 1 is unchanged.
- [forms.md](references/forms.md#submission-and-io) documents the submission API, and records that
  `angular-developer/references/signal-forms.md` covers **none** of it — no `FormRoot`,
  `submission`, `ignoreValidators`, `onInvalid` or `submitting()`. The "full API surface" pointer
  at the top of that file has a hole exactly there, so this is now a source rather than a summary,
  verified against Angular's `guide/forms/signals/form-submission`. `submission.onInvalid` also
  joins the accessibility rules: focus the first invalid control on a failed submit, or a keyboard
  user presses the button and nothing appears to happen.
- [performance.md](references/performance.md#one-static-import-anywhere-defeats-the-whole-thing)
  gains the silent-failure section above, names the injection-context constraint its example
  already demonstrated (`injectAsync` in a field initializer, only the `await` in the method), and
  documents `onIdle({ timeout })`.
- [reactivity-and-state.md](references/reactivity-and-state.md#the-three-signal-rules) gains a
  fourth signal rule: a new reference is a change even when the contents are identical. It is rule 1
  read backwards — replacing the reference is what makes a signal notify, so a reference created for
  no reason (`?? []` in a `computed`, an object literal in a template) notifies just as loudly. The
  fix is a frozen constant, **not** a custom `equal`: a deep-equality comparator runs on every write,
  moving work onto the hot path permanently to fix what a stable identity fixes for free.
- [testing.md](references/testing.md#testing-an-defer-block) documents the `@defer` testing seam,
  which nothing here covered even though [components.md](references/components.md#deferred-loading)
  makes `@defer` mandatory below the fold. `Manual` is the default for the same reason 5.0.0
  restricted fake timers: the mandated `@placeholder (minimum 300ms)` turns every `Playthrough`
  assertion into a timer question, and `render()` answers it directly.
- [security.md](references/security.md#the-auth-interceptor-is-scoped-to-your-own-origin--default-deny)
  explains why the boundary is an allowlist rather than a `SKIP_AUTH` opt-out: an opt-out fails
  open, so the next third-party call added by someone who has not read the file leaks by default,
  while an allowlist fails closed — a new *own* backend fails loudly with a 401 and gets added
  deliberately. `HttpContext`/`HttpContextToken` keeps its place for per-request decisions within
  your own origin; a genuinely separate backend gets its own child-injector client, with
  `withRequestsMadeViaParent()` when it must also run the global chain.
  [data-access.md](references/data-access.md#http-configuration) now points there from where the
  chain is configured.
- [longevity.md](references/longevity.md#banned-apis) gains two banned-table rows — `ɵ`-prefixed
  imports and `APP_INITIALIZER` — and its *Lint covers:* list names the new `ɵ` rule, so the
  `(partial)` tag on that audit line stays truthful about which half the tool handles.
- `assets/eslint.config.js` gains the `ɵ`-import rule and a rewritten `debounced()` message, and
  `assets/check-eslint-config.mjs` grows with it: `GLOBAL_SYNTAX_COUNT` goes 6 → 7 and every
  resolution case asserts `banPrivateApi`. Without both, the new rule would have had no composition
  guard — the silent failure that script exists to prevent, reintroduced by the commit that added
  the rule. The
  audit inventory is 95 tagged lines — 3 `lint`, 11 `partial`, 81 `review`, up from 92: the signal
  reference-identity and `@defer` testing rules add one each, and every other rule here extended an
  existing `Audit:` line rather than adding one. The consolidated anti-pattern checklist stays at
  78 entries — the `ignoreValidators` race is deliberately not in it, since inserting a Correctness
  row would renumber 55 entries for one line, and the rule already has an `Audit:` line that
  [code-review.md](references/code-review.md) collects.
- [SKILL.md](SKILL.md) records why the upstream source of these standards is not installable
  alongside them. It now ships as a Claude Code plugin and mandates an NgRx Signal Store per
  feature; [reactivity-and-state.md](references/reactivity-and-state.md#when-to-add-a-store)
  defaults to no store. Both projects now target Angular 22, so the state model is what separates
  them, not the framework version.

## 5.0.0 — 2026-08-30

### Breaking

- **Zoneless component tests must trigger the same notification surface as production.**
  *Invalidates:* tests that mutate component state and force the result with `detectChanges()`, or
  use fake timers for generic Promise, Observable or change-detection sequencing. *To comply:* use
  signals, `componentRef.setInput()` or real DOM events, then native `await`, `firstValueFrom()` or
  `whenStable()`; reserve fake timers for behaviour whose contract is elapsed time and restore them.
- **Smoke and shallow-test boilerplate no longer counts as coverage.** *Invalidates:* smoke-only
  `should create` specs, `compileComponents()` without `@defer`, `NO_ERRORS_SCHEMA` shortcuts,
  DOM-affecting directive tests with no host, and one-off component harnesses. *To comply:* assert a
  public behaviour through the rendered DOM, use a minimal host for directives, and add a harness
  only for a shared interactive widget.
- **Test doubles are reserved for real seams and must fully contain side effects.** *Invalidates:*
  unnecessary fakes for simple deterministic local dependencies, untyped/auto-generated fakes, and
  partial spies or subclasses that can execute the real network, storage or clock dependency. *To
  comply:* keep deterministic dependencies real, or replace the boundary completely with a small
  `satisfies Pick<...>` fake.
- **Angular test infrastructure stays on the supported path.** *Invalidates:* a `jsdom` test claimed
  as proof of layout/browser behaviour, custom Vitest configuration with no documented Angular CLI
  limitation and removal condition, mocked Angular routers, and redundant or reversed HTTP test
  providers. *To comply:* use the existing Playwright suite for browser guarantees, configure
  ordinary test options in `angular.json`, use `provideRouter()` with `RouterTestingHarness`, and
  put `provideHttpClientTesting()` last (with no `provideHttpClient()` unless configuring a feature).

### Changed

- [testing.md](references/testing.md) now distinguishes `jsdom` from a real browser, defines the
  production-faithful zoneless interaction path, limits fake timers and custom Vitest config,
  tightens component/fake/HTTP hygiene, and adds router and directive testing rules.
- The durable guidance taken from [*Testing Angular*](https://testing-angular.com/) is deliberately
  tool-neutral: full fake replacement, real deterministic collaborators, and host-component tests
  for DOM directives. Its Jasmine/Karma, Cypress, Spectator, `ng-mocks`, test-id and
  manual-change-detection conventions do not enter this Angular 22 standard.
- Review routing now sends test-target and Vitest configuration changes to `testing.md`. The audit
  inventory is 92 tagged `Audit:` lines — 3 `lint`, 11 `partial`, 78 `review` — and the consolidated
  anti-pattern checklist has 78 entries.

## 4.0.0 — 2026-08-29

### Breaking

- **Icon-only controls and user-relevant async status changes must be accessible.** Icon-only
  buttons and links need an accessible name, and loading/save/failure/result-count updates need a
  status or live-region announcement. *Invalidates:* templates where the icon is the only label, or
  where visible async feedback is silent to screen readers. *To comply:* add visible or
  screen-reader-only text (or `aria-label`) and use `role="status"` or an appropriate live region.
- **Frontend N+1 request fan-out is banned.** A list response may not trigger one detail request per
  row. *Invalidates:* screens whose network work grows by one request for every returned item. *To
  comply:* return the view fields in the list response or use one batch request; a detail request
  caused by an explicit user action remains valid.
- **Error reporting must contain its own failures.** A reporter or global `ErrorHandler` may not
  throw, reject, or recurse while handling the original failure. *Invalidates:* reporter adapters
  that let synchronous SDK errors or rejected reporting promises escape. *To comply:* contain the
  failure once inside the owned adapter.

### Changed

- The audit inventory is now accurate and includes the three rules above: 87 tagged `Audit:` lines
  — 3 `lint`, 11 `partial`, 73 `review`. The anti-pattern checklist now has 72 entries.
- Review routing now loads `components.md` for template changes and `performance.md` for list or
  batch I/O, so the new rules are actually checked in the diffs where they can be violated.

## 3.0.0 — 2026-08-16

Two kinds of change are folded into this release, and the difference matters when you read the
entries below:

- **Reconstructed drift** — shipped between 2026-08-08 and 2026-08-15 while `metadata.version`
  stayed at `'2.0'`. Entries carry the commit hash. This is the record that was missing.
- **New in 3.0.0** — written on 2026-08-16 as part of closing that gap. Entries carry no hash
  because they were not committed separately. These are the `resource()`/`rxResource()` and
  `debounced()` enforcement, the `Audit:` enforcer tags, the "does not cover" section, and the
  `ui/helm/**` and bootstrap fixes.

The version format also moves from `'2.0'` to full semver here.

### Breaking

- **`resource()` and `rxResource()` are now enforced in components.** They were banned in prose by
  [architecture.md](references/architecture.md#the-one-rule) since 2.0 and never enforced: `IO_PATHS`
  restricted only `@angular/common/http`, while both primitives live in `@angular/core` and
  `@angular/core/rxjs-interop`. A component could call `resource()` and lint clean while breaking the
  rule the other five non-negotiables hang off. *Invalidates:* any component importing either.
  *To comply:* move the call into a service and read the signal back in the component — the service
  layer is deliberately still allowed both. Re-copy `assets/eslint.config.js` and
  `assets/check-eslint-config.mjs`.
- **The `ui/` inject ban now also restricts the `inject` import.** The `no-restricted-syntax`
  selector matches on `callee.name`, so `import { inject as di }` followed by `di(Service)` walked
  past it. `importNames` matches the imported name regardless of local alias, so the two together
  leave no gap. *Invalidates:* aliased `inject` in `src/app/ui/` outside `helm/` and specs — rare,
  but it was the difference between the `(lint)` tag being true and being a claim.
- **`debounced()` is now enforced** as a global ban, matching the prose in
  [reactivity-and-state.md](references/reactivity-and-state.md). *Removal condition:* revisit at
  v23/v24 — this is project policy, not a deprecation.
- **`ChangeDetectionStrategy.Eager` and `.Default` are banned** (`65bd450`). Added to the banned
  table in [longevity.md](references/longevity.md) and enforced as an **error** by
  `assets/eslint.config.js`. *Invalidates:* any component carrying a `changeDetection` line with
  either value — including the ones the v22 `ng update` migration writes into files nobody touched.
  *To comply:* delete the line (OnPush is the v22 default) and move the component's state into a
  signal. Re-copy `assets/eslint.config.js` and `assets/check-eslint-config.mjs`.
- **`debounced()` from `@angular/core` is banned** (`d7d101c`). Experimental in v22 — the tier below
  Developer Preview, with no stability promise. *To comply:* `debounceTime` into `toSignal()` in a
  service, per [reactivity-and-state.md](references/reactivity-and-state.md). *Removal condition:*
  revisit at v23/v24; this is project policy, not a deprecation.
- **The Spartan upstream skill changed** (`c7decd3`). The community `spartan-ng-developer` copy is
  replaced by the **official** `spartan` skill from `spartan-ng/spartan`. *To comply:*
  `npx skills remove spartan-ng-developer` and
  `npx skills add https://github.com/spartan-ng/spartan --skill spartan`. Citations of the form
  `spartan/...` resolve to the new skill; the old one is on the do-not-install list in
  [SKILL.md](SKILL.md#upstream-framework-depth).
- **Angular 22 migration rules tightened** (`a751d73`) across
  [data-access.md](references/data-access.md), [routing.md](references/routing.md) and
  [longevity.md](references/longevity.md), with matching `assets/` lint changes. *To comply:*
  re-copy both files in `assets/`.

### Added

- **Every `Audit:` line now names its enforcer** — `(lint)`, `(partial)` or `(review)`, defined in
  [code-review.md](references/code-review.md#4-collect-findings). All 81 lines are tagged: 2 `lint`,
  10 `partial`, 69 `review`, and every `partial` line names both halves of the split. This makes the
  enforcement gap auditable instead of invisible — a
  `(lint)` tag is a falsifiable claim, and a reviewer who hits one the tool did not report is told
  to report it as a defect against this skill.
- **A declared "What this skill does not cover" section** in [SKILL.md](SKILL.md) — SSR state
  transfer, monorepo/multi-app, legacy migration, backend. These were always out of scope; now they
  say so, so a gap is not read as an oversight.
- [performance.md](references/performance.md) — budgets, profiling, lazy services, long lists
  (`aa27f49`).
- [observability.md](references/observability.md) — error reporting, correlation, field metrics
  (`0721154`).
- Pragmatic SOLID guidance across [architecture.md](references/architecture.md),
  [components.md](references/components.md), [core-engineering.md](references/core-engineering.md)
  and [testing.md](references/testing.md), with `Audit:` lines (`2c364ac`).
- Minimal-implementation guidance in [core-engineering.md](references/core-engineering.md)
  (`0b7397b`).
- Expanded [architecture.md](references/architecture.md), [routing.md](references/routing.md) and
  [security.md](references/security.md) production standards (`0721154`).

### Changed

- **`components.md`'s inject ban now exempts `src/app/ui/helm/**`**, matching `eslint.config.js` and
  [spartan-ui.md](references/spartan-ui.md#where-helm-code-lives). The Audit line was stricter than
  the lint, so a review of generated Helm code produced findings the tool deliberately suppresses.
- The `AGENTS.local.md` bootstrap in `docs/backend-angular-setup.md` no longer clobbers an existing
  file on re-run.
- Root-level full-stack layout supported by the `assets/` install snippet and the setup docs
  (`5adf5e1`, `db3ccde`).
- [anti-patterns.md](references/anti-patterns.md) checklist and
  [code-review.md](references/code-review.md) routing table extended to cover every rule added
  above.

---

## 2.0.0 — 2026-08-07

Reconstructed from git history; there was no changelog at the time.

- Repackaged the standards as an installable skill under `.agents/skills/angular-standards/`
  (`321dbf8`). *Breaking:* the rules moved out of the repository root; `AGENTS.md` and `CLAUDE.md`
  became pointers. This is the commit that first set `metadata.version`, to `'2.0'`.
- Clarified feature structure and testing rules (`aed4ef0`).

## 1.0.0 — 2026-08-06

Reconstructed from git history.

- Initial Angular 22 agent kit: layer architecture, banned-API list, review process, and the
  `assets/` ESLint enforcement pair (`1ce45d3`, `ae71c08`).
