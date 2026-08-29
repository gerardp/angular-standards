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
