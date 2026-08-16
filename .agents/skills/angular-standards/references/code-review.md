# Code review

Audit changed code against the standards in this skill's `references/`. This file owns **process** —
scope, routing, severity, report format. It deliberately does **not** restate rules; the standards
files are the single source of truth. If a rule is not written down there, it is not a finding.

## Procedure

### 1. Establish scope

```bash
git diff --name-only origin/main...HEAD    # or the range you were given
```

Review only changed files. Do not audit the whole repo unless explicitly asked — a review that
reports pre-existing issues buries the ones the author can act on.

### 2. Run the mechanical checks first

Part of the standards is enforced by tooling — run it before reading anything, and do not
hand-report what a tool already reports. Which part is written on each rule; see step 4.

```bash
npm run lint   # runs scripts/check-eslint-config.mjs, then ng lint
ng build       # template type checking
ng test
```

Use `npm run lint`, not `ng lint` directly: the npm script also runs the ESLint composition check,
which verifies the layer rules are still actually wired up (see the note at the top of
`eslint.config.js`).

If the project has no `eslint.config.js` or no `check-eslint-config.mjs`, the standards are not
being enforced mechanically at all. Say so — it is the highest-value finding you can report — and
point at this skill's `assets/`.

Anything these catch is the author's to fix before review is worth doing. Say so and stop.

### 3. Route by what changed

Load only the standards relevant to the diff. Do not read all of `references/` every time.

| Changed | Read |
| --- | --- |
| Any `.ts` file | `core-engineering.md` |
| Any `.ts` under `features/` | `architecture.md`, `components.md`, `reactivity-and-state.md` |
| `data-access/**` | `data-access.md`, `security.md` |
| `*.html`, `*.css` | `templates-and-styling.md`, `spartan-ui.md` |
| Generated Helm code (see `components.json`) | `spartan-ui.md` — check for an `AGENTS.local.md` entry |
| Spartan component usage | `spartan-ui.md`, then `spartan/rules/composition.md` and `spartan/rules/styling.md` |
| `@spartan-ng/*` version bump | `spartan-ui.md` — was `healthcheck` run? |
| Forms | `forms.md` |
| `*.routes.ts`, `app.config.ts` | `routing.md` |
| `angular.json`, budget thresholds | `performance.md` |
| `injectAsync`, or a service newly declared `providedIn: 'root'` | `performance.md`, `routing.md` |
| A DI contract or provider anywhere — `InjectionToken`, an `abstract class` used as a token, `provide:`/`useClass`/`useValue`/`useFactory`, or a second implementation of an existing contract | `architecture.md` |
| `eslint.config.js`, `nx.json`, `project.json`, `ng-package.json`, or any other module-boundary configuration | `architecture.md` — the graduation and migration rules |
| `extends` on a class decorated `@Component`/`@Directive`, or a new `hostDirectives` entry | `components.md` |
| `NgZone`, `ChangeDetectorRef`, `changeDetection:`, `*cdkVirtualFor`, a `@for` over a large list, a pipe that caches rather than formats | `performance.md` |
| Auth, interceptors, storage | `security.md` |
| A global `ErrorHandler`, error-reporter setup, breadcrumb or analytics instrumentation, a trace/correlation header | `observability.md` |
| A feature-flag definition, the flag service/adapter, or any new flag read | `longevity.md` — the flag lifecycle rules |
| `*.spec.ts` | `testing.md` |
| `package.json` | `longevity.md` — the dependency policy |
| Angular version bump | `longevity.md` |

Always also check `AGENTS.local.md`. A documented override is not a finding — flagging it as one
wastes the author's time and teaches them to ignore reviews.

### 4. Collect findings

Work from the `Audit:` lines in the standards files you loaded. Those lines exist so that authoring
rules and review rules cannot drift apart — each one names a specific, checkable condition.

**Each one is tagged with who enforces it. This is where your effort goes:**

| Tag | Meaning | What you do |
| --- | --- | --- |
| `**Audit (lint):**` | `eslint.config.js` reports it in full | **Nothing.** Step 2 already caught it. Re-reporting it by hand is the noise this tag exists to remove. |
| `**Audit (partial):**` | The tool catches some of the condition | Check **only the remainder**. Every `partial` line carries a `*Lint covers:*` / `*You check:*` pair naming both halves — do not re-derive the split. |
| `**Audit (review):**` | No mechanical guardian exists | **All of it by hand.** This is where review earns its keep. |

Today that is 2 `lint`, 10 `partial`, 69 `review` out of 81. That ratio is not a defect — the lint
owns a large set of rules (type strictness, a11y, template hygiene, banned decorators) that never
needed an `Audit:` line because the tool covers them completely. The `Audit:` lines are the residue
that requires judgement, which is why most of them are `review`.

Two consequences, both deliberate:

- **A `review` tag is not a weaker rule.** It is a rule with no guardian but you. `forms.md`'s ban on
  reactive forms is `review`, and it is one of the most consequential rules in the standard.
- **A `lint` tag is a falsifiable claim.** If you hit a `lint` rule that `npm run lint` did not
  report, the tag is wrong — that is a finding against this skill, and the fix belongs in
  `assets/eslint.config.js`. Report it. Silent enforcement gaps are exactly what the tag exists to
  make visible.

Then check the consolidated list in [anti-patterns.md](anti-patterns.md), which is ordered by cost
to unwind.

### 5. Verify before reporting

For each candidate finding, confirm it by reading the actual code. A finding you cannot state as a
concrete failure — *these inputs produce this wrong outcome* — is speculation and must be dropped.

Then ask: **would this change if the author explained their reasoning?** If yes, it is a question,
not a finding. Ask it as a question.

## Severity

| Level | Meaning | Examples |
| --- | --- | --- |
| **Blocking** | Merging causes a bug, a vulnerability, or scheduled future work | Anti-patterns 1–10: layer violation, banned API, token in `localStorage`, secret in the bundle, cross-feature import |
| **Should fix** | Correctness or maintainability problem, not urgent | Missing `track`, `effect()` writing state, derived value stored in a signal, behaviour change with no test |
| **Consider** | Preference with a reason | Naming, splitting a component, test coverage of an edge case |

Nothing outside these three. If it does not fit, it is not a review comment.

## Report format

Order by severity, most severe first. For each finding:

```
**[Blocking]** src/app/features/invoices/invoice-list.ts:24 — Component performs I/O

Injects `HttpClient` and calls it in `loadInvoices()`. Components never perform I/O
(angular-standards: architecture.md#the-one-rule).

Move the call into `InvoiceApiService` as an `httpResource` and read the signal here.
```

Every finding needs: severity, `file:line`, one-sentence claim, the standard it violates, and the
concrete fix. A finding without a fix is a complaint.

End with a one-line verdict: what blocks the merge, or that nothing does.

## What not to do

- **Do not report style the formatter owns.** Prettier and ESLint handle formatting. Reviewing it
  is noise.
- **Do not report the same issue at every occurrence.** Report it once with a count and one
  representative location.
- **Do not invent rules.** If it is not in this skill's `references/` and not a genuine bug, it is
  at most a "Consider", and you must say it is your opinion rather than project policy.
- **Do not rewrite the author's approach** because you would have done it differently. Review what
  is there against the standards.
- **Do not pad.** Zero findings is a legitimate and common result. Say so plainly and stop. A review
  that always finds something is a review nobody reads.

## When a standard is wrong

If a rule in `references/` is genuinely wrong or has been overtaken by a framework change, say so in
the review and propose the edit to the standards file. Do not silently ignore it, and do not enforce
something you believe is incorrect. The standards are versioned code, not scripture — but they
change by proposal, not by drift.
