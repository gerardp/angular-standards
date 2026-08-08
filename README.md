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

That installs one skill, `angular-standards`, into `.agents/skills/` — the house rules, the review
process, and the ESLint config that enforces them mechanically.

Install the upstream skills alongside it. They are **not** republished from here, so you always get
the current version from the people who maintain them:

```bash
npx skills add angular/skills -s angular-developer
npx skills add https://github.com/spartan-ng/spartan --skill spartan
```

Then, once per project, wire up the mechanical enforcement — see
[Enforcement](#enforcement) below.

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
ng add @angular-eslint/schematics --skip-confirmation --defaults

if [ -d ../.agents/skills/angular-standards ]; then
  standards_skill=../.agents/skills/angular-standards
else
  standards_skill=.agents/skills/angular-standards
fi

cp "$standards_skill/assets/eslint.config.js" ./eslint.config.js
mkdir -p scripts && cp "$standards_skill/assets/check-eslint-config.mjs" ./scripts/
npm pkg set scripts.lint="node scripts/check-eslint-config.mjs && ng lint"
```

The order matters: `ng add` generates its own baseline `eslint.config.js`, so copy the house config
**afterwards**. Otherwise the schematic silently overwrites the rules this skill promises.

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

Install the skills in the **backend repository root**, before entering `frontend/`. This is the
right scope when the agent is always started from the full-stack root: Codex discovers the root
`.agents/skills/`, while the routing rule below limits the Angular standards to work under
`frontend/`.

```bash
npx skills add gerardp/angular-standards
npx skills add angular/skills -s angular-developer
npx skills add https://github.com/spartan-ng/spartan --skill spartan
# Nothing else. The skill's SKILL.md lists which Angular UI skills to skip, and why.

curl -fsSLo AGENTS.local.md https://raw.githubusercontent.com/gerardp/angular-standards/main/AGENTS.local.md
```

The root `AGENTS.md` must route frontend work to the Angular skill. Merge this section into it; do
not replace existing backend instructions:

```markdown
## Angular frontend

For every task that reads, writes or reviews files under `frontend/`:

1. Read and follow `.agents/skills/angular-standards/SKILL.md` before acting.
2. Read `AGENTS.local.md` for repository-specific facts and overrides.
3. Run Angular, npm and Spartan commands from `frontend/`.
4. The house standards override the upstream Angular and Spartan skills.
```

If Laravel Boost owns the root `AGENTS.md`, put that section in
`.ai/guidelines/angular-frontend.md` instead and run `php artisan boost:update`. Boost will merge it
into its generated agent guidance without losing it on the next update.

Now create and enter the Angular workspace:

```bash
npx @angular/cli@latest new frontend --style css --strict --no-ssr --skip-git --ai-config none --interactive=false
cd frontend
```

Spartan requires Tailwind CSS v4 to be configured first. Install the packages:

```bash
npm install tailwindcss @tailwindcss/postcss postcss --force
```

Create `.postcssrc.json`:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

Add this at the start of `src/styles.css`:

```css
@import 'tailwindcss';
```

Then initialise Spartan without prompts. `init` already installs its runtime dependencies, wires
the Tailwind preset and generates the theme; do not run `ui-theme` again:

```bash
npm i -D @spartan-ng/cli
ng g @spartan-ng/cli:init --project=frontend --theme=neutral --styles-entry-point=src/styles.css
```

Create `components.json` before the first `ui` run so the house path, alias and component style are
deterministic rather than interactive:

```json
{
  "componentsPath": "src/app/ui/helm",
  "importAlias": "@spartan-ng/helm",
  "style": "nova"
}
```

```bash
ng g @spartan-ng/cli:ui --name=button
ng g @spartan-ng/cli:info --json
```

`info --json` must report `config.found: true`, non-null Tailwind, CDK and Brain versions, and
`button` under `installedComponents`. If it does not, stop: the setup did not finish.

Then set up [Enforcement](#enforcement) and complete the strict flags in
[core-engineering.md](.agents/skills/angular-standards/references/core-engineering.md#typescript-configuration).
Fill in the "Project facts" section of the root `AGENTS.local.md` — backend URL, auth model, rendering
strategy. It is the highest-value thing you can give an agent, because it is the context that
cannot be inferred from the code.

### Working with agents

Start the agent from the full-stack repository root as usual:

```bash
codex
```

Codex loads the root `AGENTS.md` and root-local skills. The `Angular frontend` rule activates the
standards only when a task touches `frontend/`, so backend work keeps its own guidance. Ask for a
review with *"review my frontend changes against the standards"*.

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
