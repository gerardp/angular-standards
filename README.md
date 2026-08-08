# Angular 22 agent kit

Coding standards and agent skills for a long-lived Angular application, packaged as an installable
skill. It covers what the official Angular skill deliberately does not: where files go, how state
flows, what a dependency costs, and which APIs are banned because they are on their way out.

**Stack:** Angular 22.1+ (zoneless, standalone, Signal Forms) · Tailwind CSS v4 · Spartan NG ·
Vitest · Playwright

**Design constraint:** this application must remain maintainable for 10+ years. That shapes every
rule here — see
[longevity.md](.agents/skills/angular-standards/references/longevity.md), which is the load-bearing
document of the set.

## Install

```bash
npx skills add gerardp/angular-standards
```

That installs one skill, `angular-standards`, into `.agents/skills/` — the house rules and review
process.

Install the upstream skills alongside it. They are **not** republished from here, so you always get
the current version from the people who maintain them:

```bash
npx skills add angular/skills -s angular-developer
npx skills add https://github.com/spartan-ng/spartan --skill spartan
```

## Layout

```
.agents/skills/angular-standards/
  SKILL.md                   Entry point. Six non-negotiable rules + topic routing.
  references/
    architecture.md          Layers, folders, dependency direction. The one rule.
    longevity.md             Banned APIs, upgrade cadence, dependency policy.  ← start here
    core-engineering.md      TypeScript strictness, naming, a11y, i18n readiness.
    components.md            Signal inputs/outputs, host bindings, templates.
    reactivity-and-state.md  Signals decision table, when to add a store.
    data-access.md           httpResource vs HttpClient, DTO boundary, errors.
    forms.md                 Signal Forms.
    templates-and-styling.md Tailwind v4, control flow, motion.
    spartan-ui.md            brain/helm, theming, upgrade rules.
    routing.md               Lazy loading, guards, route-scoped state, SSR.
    performance.md           Budgets, profiling, lazy services, long lists.
    security.md              Tokens, XSS, CSP, secrets.
    testing.md               Vitest, zoneless testing, what to test.
    anti-patterns.md         64-item review checklist, ordered by cost.
    code-review.md           The audit process. Reads the Audit: lines above.

AGENTS.md                    Pointer to the skill, for tools that read AGENTS.md.
CLAUDE.md                    Pointer so Claude Code auto-loads AGENTS.md.
AGENTS.local.md              Your overrides + project facts. Fill this in.
```

## Using it

### Starting a new app

These standards work with any backend — Node.js, AdonisJS, Rails, or another framework — when
Angular lives in a `frontend/` sub-folder. See the
[backend + Angular setup guide](docs/backend-angular-setup.md), which uses Laravel as its example.

### Keeping it current

Run skill updates from the full-stack repository root:

```bash
# during the Angular upgrade PR, and quarterly
npx skills update angular-standards angular-developer spartan
```

Name them. A bare `npx skills update` updates every skill you have installed globally and locally,
which is a separate decision each time — and it pulls upstream's latest, which is not the same as
"whatever matches the version in your `package.json`".

Do not gate your CI on skill freshness. Failing a build because upstream shipped a doc change
blocks work that has nothing to do with it — it is a scheduled task, not a build gate.

## Maintaining the standards

**When you make a decision an agent could not infer, write it down.** That is the whole discipline.
A rule that lives only in someone's head gets violated by the next agent and by the next hire.

- Adding a rule? Put it in the relevant `references/` file **with an `Audit:` line**, so the review
  process picks it up automatically.
- Deviating from a rule? Record it in `AGENTS.local.md` **with a removal condition**. An override
  without an expiry becomes permanent by accident.
- Angular deprecated something new? Add it to the banned table in `longevity.md` during the upgrade
  PR, while you are already looking at the release notes.
- Rule turned out to be wrong? Change it. These are versioned files, not scripture — but they change
  by proposal, not by drift.

## Provenance

This repository is MIT licensed — see [LICENSE](LICENSE).

The skills under `vendor/skills/` are copied verbatim from other MIT projects and keep their own
copyright: [`angular/angular`](https://github.com/angular/angular/tree/main/skills/dev-skills)
(Google LLC) and
[`spartan-ng/spartan`](https://github.com/spartan-ng/spartan/tree/main/skills/spartan)
(Robin Goetz). Full notices in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md); exact commits in
`vendor/skills/UPSTREAM.txt`.
