---
name: code-review
description: Audits Angular changes against this repo's standards in docs/standards/. Trigger when reviewing a PR, a diff, a branch, or when asked to check whether code follows the project conventions, architecture rules, or banned-API policy.
license: MIT
metadata:
  version: '1.0'
---

# Code review

Audit changed code against `docs/standards/`. This skill owns **process** — scope, routing,
severity, report format. It deliberately does **not** restate rules; the standards files are the
single source of truth. If a rule is not written down there, it is not a finding.

## Procedure

### 1. Establish scope

```bash
git diff --name-only origin/main...HEAD    # or the range you were given
```

Review only changed files. Do not audit the whole repo unless explicitly asked — a review that
reports pre-existing issues buries the ones the author can act on.

### 2. Run the mechanical checks first

Most of the standards are enforced by tooling. Run it before reading anything; do not hand-report
what a tool already reports.

```bash
ng lint     # architecture layer rules, banned APIs, a11y — see eslint.config.js
ng build    # template type checking
ng test
```

Anything these catch is the author's to fix before review is worth doing. Say so and stop.

### 3. Route by what changed

Load only the standards relevant to the diff. Do not read all of `docs/standards/` every time.

| Changed | Read |
| --- | --- |
| Any `.ts` under `features/` | `architecture.md`, `components.md`, `reactivity-and-state.md` |
| `data-access/**` | `data-access.md`, `security.md` |
| `*.html`, `*.css` | `templates-and-styling.md`, `spartan-ui.md` |
| Generated Helm code (see `components.json`) | `spartan-ui.md` — check for an `AGENTS.local.md` entry |
| Spartan component usage | `spartan-ui.md`, then `.agents/skills/spartan-ng-developer/references/helm-conventions.md` |
| Forms | `forms.md` |
| `*.routes.ts`, `app.config.ts` | `routing.md` |
| Auth, interceptors, storage | `security.md` |
| `*.spec.ts` | `testing.md` |
| `package.json` | `longevity.md` — the dependency policy |
| Angular version bump | `longevity.md` — then re-run `scripts/sync-skills.sh` |

Always also check `AGENTS.local.md`. A documented override is not a finding — flagging it as one
wastes the author's time and teaches them to ignore reviews.

### 4. Collect findings

Work from the `Audit:` lines in the standards files you loaded. Those lines exist so that authoring
rules and review rules cannot drift apart — each one names a specific, checkable condition.

Then check the consolidated list in `docs/standards/anti-patterns.md`, which is ordered by cost to
unwind.

### 5. Verify before reporting

For each candidate finding, confirm it by reading the actual code. A finding you cannot state as a
concrete failure — *these inputs produce this wrong outcome* — is speculation and must be dropped.

Then ask: **would this change if the author explained their reasoning?** If yes, it is a question,
not a finding. Ask it as a question.

## Severity

| Level | Meaning | Examples |
| --- | --- | --- |
| **Blocking** | Merging causes a bug, a vulnerability, or scheduled future work | Anti-patterns 1–10: layer violation, banned API, token in `localStorage`, secret in the bundle, cross-feature import |
| **Should fix** | Correctness or maintainability problem, not urgent | Missing `track`, `effect()` writing state, derived value stored in a signal |
| **Consider** | Preference with a reason | Naming, splitting a component, test coverage of an edge case |

Nothing outside these three. If it does not fit, it is not a review comment.

## Report format

Order by severity, most severe first. For each finding:

```
**[Blocking]** src/app/features/invoices/invoice-list.ts:24 — Component performs I/O

Injects `HttpClient` and calls it in `loadInvoices()`. Components never perform I/O
(docs/standards/architecture.md#the-one-rule).

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
- **Do not invent rules.** If it is not in `docs/standards/` and not a genuine bug, it is at most a
  "Consider", and you must say it is your opinion rather than project policy.
- **Do not rewrite the author's approach** because you would have done it differently. Review what
  is there against the standards.
- **Do not pad.** Zero findings is a legitimate and common result. Say so plainly and stop. A review
  that always finds something is a review nobody reads.

## When a standard is wrong

If a rule in `docs/standards/` is genuinely wrong or has been overtaken by a framework change, say
so in the review and propose the edit to the standards file. Do not silently ignore it, and do not
enforce something you believe is incorrect. The standards are versioned code, not scripture — but
they change by proposal, not by drift.
