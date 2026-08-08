# Angular 22 agent kit

Coding standards and agent skills for a long-lived Angular application, packaged as an installable
skill.

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

That installs one skill, `angular-standards`, into `.agents/skills/` — the house rules, the review
process, and the ESLint config that enforces them mechanically.

Install the upstream skills alongside it. They are **not** republished from here, so you always get
the current version from the people who maintain them:

```bash
npx skills add angular/skills -s angular-developer
npx skills add https://github.com/spartan-ng/spartan --skill spartan
```

> **The Spartan skill is the official one**, released from the library's own monorepo — it owns the
> CLI (`info --json`, `healthcheck`, the `migrate-*` family), the `@spartan-ng/mcp` server, the
> styling and composition rules, and theming. It ships no per-component catalogue on purpose: it
> tells you to confirm selectors rather than recall them. This kit's answer to that is an explicit
> order — the generated Helm source in your repo first, then MCP, then the docs site.
>
> **Those two, and nothing else.** Angular UI skills are easy to find, and the popular ones are
> written for a generic Angular project — this one has a design system, so their worked examples
> teach against it. `spartan-ng-developer` has the per-component catalogue the official skill
> omits, alongside `.subscribe()` in a component, `[innerHTML]`, raw palette colours and
> ReactiveForms as the default. `ui-craft` states the right rule at the top — reach for theme
> tokens — and then works in raw palette shades with hand-written `dark:` overrides in its own
> reference files. `angular-material-developer`, `ng-zorro-developer` and `primeng-developer`
> recommend component libraries the dependency policy bans. `angular-new-app` scaffolds an app you
> already have, and writes an `AGENTS.md` over this kit's — install it globally instead if you want
> it (`npx skills add angular/skills -s angular-new-app -g`).
>
> The exclusion list, and what to check when outside Spartan code lands in your repo either way, is
> in the skill's `SKILL.md` and `spartan-ui.md`. Precedence resolves these conflicts on paper, but a
> worked example is the most-copied thing in any document.
>
> `angular/skills` is Angular's published mirror of `angular/angular/skills/dev-skills/` — same
> content, clones in seconds instead of pulling the whole monorepo. Spartan publishes no such
> mirror, so that one clones the full monorepo for a single skill. Nothing to be done about it.

Then, once per project, wire up the mechanical enforcement — see
[Enforcement](#enforcement) below.

## What this is

Three layers, in precedence order:

| Layer | What | Maintained by |
| --- | --- | --- |
| `AGENTS.local.md` | Your repo's deliberate exceptions | You |
| `angular-standards` skill | House rules — architecture, state, styling, security | This repo |
| `angular-developer`, `spartan` | Framework and component-library API depth | Upstream |

The middle layer covers what the official Angular skill deliberately does not: where files go, how
state flows, what a dependency costs, and which APIs are banned because they are on their way out.

### Can I use these standards with a different component library?

Not as a configuration switch — that would be a fork, and it is an honest one to make.

Spartan is a structural bet here, not a preference: Helm source is copied into your repo, so the
component layer survives upstream going quiet. Several standards are written on top of that
assumption, and they are not all in `spartan-ui.md`:

| File | Spartan-specific clause |
| --- | --- |
| `architecture.md` | Pins `ui/helm/` in the `src/app/` layout |
| `components.md` | Mandates Brain primitives for composite widgets |
| `forms.md` | Mandates Helm form-field components for error announcement |
| `longevity.md` | Five standing-decision rows, the `@spartan-ng/brain` peer ceiling, and the entire luxon exception |
| `templates-and-styling.md` | Tailwind v4, adopted partly *because* Spartan requires it |
| `assets/eslint.config.js` | `ignores: ['src/app/ui/helm/**']` |
| `assets/check-eslint-config.mjs` | Its glob self-tests and `EXPECTATIONS` assert that exact path — repointing the glob without updating them fails the check |

Everything else — the layer rules, "no I/O in a component", the signals decision table, the DTO
boundary, routing, security, testing — is genuinely independent. So a fork is tractable: swap those
seven, keep the rest. It is an afternoon, not a rewrite. But it is a fork, and pretending otherwise
would hand you a set of rules with a hole in the middle.

One thing that does not change either way: composite widgets with keyboard semantics come from a
library or from Angular CDK, never hand-rolled. That is an accessibility argument, not a Spartan one.

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
    security.md              Tokens, XSS, CSP, secrets.
    testing.md               Vitest, zoneless testing, what to test.
    anti-patterns.md         59-item review checklist, ordered by cost.
    code-review.md           The audit process. Reads the Audit: lines above.
  assets/
    eslint.config.js         Mechanical enforcement of the layer rules and banned APIs.
    check-eslint-config.mjs  Asserts the ESLint rules survive flat-config composition.

AGENTS.md                    Pointer to the skill, for tools that read AGENTS.md.
CLAUDE.md                    Pointer so Claude Code auto-loads AGENTS.md.
AGENTS.local.md              Your overrides + project facts. Fill this in.

vendor/skills/               Pinned reference copies of the upstream skills. Never published
                             from here, never hand-edited — see THIRD-PARTY-NOTICES.md.
scripts/sync-skills.sh       Re-sync vendor/skills/ from upstream.
```

## Enforcement

The rules an agent can ignore are the rules that decay. `assets/` holds the two files that turn the
checkable ones into build failures:

```bash
cp .agents/skills/angular-standards/assets/eslint.config.js ./eslint.config.js
mkdir -p scripts && cp .agents/skills/angular-standards/assets/check-eslint-config.mjs ./scripts/
ng add @angular-eslint/schematics    # keep the eslint.config.js you just copied if prompted
```

```jsonc
// package.json
"scripts": {
  "lint": "node scripts/check-eslint-config.mjs && ng lint"
}
```

`eslint.config.js` enforces the banned-package and banned-decorator lists, "no I/O in a component",
the layer dependency direction, the accessibility baseline as errors, and the zoneless test rules.
`check-eslint-config.mjs` exists because a flat-config composition mistake fails **silently** — the
config still lints clean, it just stops enforcing what the standards promise.

## Using it

### Starting a new app

These standards assume Angular lives in a `frontend/` sub-folder of a backend repo — Laravel, Rails,
Django. Serving the API is not Angular's job, and the layer rules in
[architecture.md](.agents/skills/angular-standards/references/architecture.md) are written for that
split. Run this from the repo root; the CLI creates the folder:

```bash
npx @angular/cli@latest new frontend --style css --no-ssr --skip-git --ai-config none --interactive=false
cd frontend

npx skills add gerardp/angular-standards
npx skills add angular/skills -s angular-developer
npx skills add https://github.com/spartan-ng/spartan --skill spartan
# Nothing else. Not spartan-ng-developer, not ui-craft — see "Install" above for why.

npm i -D @spartan-ng/cli && ng g @spartan-ng/cli:init && ng g @spartan-ng/cli:ui-theme
```

The three flags that are not obvious. `--skip-git`: the backend repo already has git, and nesting
one inside it gives you a folder whose changes never commit. `--ai-config none`: the CLI otherwise
writes its own `AGENTS.md` over the one you copy below. `--no-ssr`: an app entirely behind a login
gets nothing from SSR and pays for it with a Node server to deploy next to the backend — add it
later with `ng add @angular/ssr` if a public, indexable route ever appears, and decide it per route
rather than app-wide (see
[routing.md](.agents/skills/angular-standards/references/routing.md#rendering-strategies)).

Then set up [Enforcement](#enforcement), copy `AGENTS.md`, `CLAUDE.md` and `AGENTS.local.md` from
this repo, and fill in the "Project facts" section of `AGENTS.local.md` — backend URL, auth model,
rendering strategy. It is the highest-value thing you can give an agent, because it is the context
that cannot be inferred from the code.

### Working with agents

Claude Code, Cursor, and any tool that reads `AGENTS.md` pick this up automatically. Ask for a
review with *"review my changes against the standards"*.

### Keeping it current

In **your application**, that is the whole story:

```bash
# during the Angular upgrade PR, and quarterly
npx skills update angular-standards angular-developer spartan
```

Name them. A bare `npx skills update` updates every skill you have installed globally and locally,
which is a separate decision each time — and it pulls upstream's latest, which is not the same as
"whatever matches the version in your `package.json`".

Do not gate your CI on skill freshness. Failing a build because upstream shipped a doc change
blocks work that has nothing to do with it — it is a scheduled task, not a build gate.

`scripts/sync-skills.sh` and `vendor/` belong to **this repository only** and never travel with the
skill. They keep the pinned upstream copies here in step so the citations in `references/` stay
verifiable:

```bash
./scripts/sync-skills.sh --check    # CI *here*: fails if vendor/skills/ is stale
./scripts/sync-skills.sh            # after every Angular upgrade, and quarterly
```

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
