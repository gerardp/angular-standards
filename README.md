# Angular 22 agent kit

Coding standards and agent skills for a long-lived Angular application.

**Stack:** Angular 22.1+ (zoneless, standalone, Signal Forms) · Tailwind CSS v4 · Spartan NG ·
Vitest · Playwright

**Design constraint:** this application must remain maintainable for 10+ years. That shapes every
rule here — see [docs/standards/longevity.md](docs/standards/longevity.md), which is the load-
bearing document of the set.

## What this is

Three layers, in precedence order:

| Layer | What | Maintained by |
| --- | --- | --- |
| `AGENTS.local.md` | This repo's deliberate exceptions | You |
| `docs/standards/` | House rules — architecture, state, styling, security | You |
| `.agents/skills/*` | Framework and component-library guidance | Upstream, vendored |

The bottom layer is vendored verbatim and never hand-edited:

- **`angular-developer` / `angular-new-app`** from `angular/angular/skills/dev-skills/` — the
  Angular team's own skill, updated in the same PRs as the framework.
- **`spartan-ng-developer`** from `mofirojean/angular-ui-skills` — Spartan Helm/Brain depth,
  pinned to a tracked Spartan version.

Both are re-synced by `scripts/sync-skills.sh`, which records a commit SHA per source.

The middle layer covers what the official skill deliberately does not: where files go, how state
flows, what a dependency costs, and which APIs are banned because they are on their way out.

`.agents/skills/code-review/` is ours. It audits changed code against `docs/standards/` by reading
the `Audit:` lines in those files — so authoring rules and review rules cannot drift apart.

## Layout

```
AGENTS.md                    Entry point. Agents read this first.
CLAUDE.md                    Pointer so Claude Code auto-loads AGENTS.md.
AGENTS.local.md              Your overrides + project facts. Fill this in.
eslint.config.js             Mechanical enforcement of the layer rules and banned APIs.

docs/standards/
  architecture.md            Layers, folders, dependency direction. The one rule.
  longevity.md               Banned APIs, upgrade cadence, dependency policy.  ← start here
  core-engineering.md        TypeScript strictness, naming, a11y, i18n readiness.
  components.md              Signal inputs/outputs, host bindings, templates.
  reactivity-and-state.md    Signals decision table, when to add a store.
  data-access.md             httpResource vs HttpClient, DTO boundary, errors.
  forms.md                   Signal Forms.
  templates-and-styling.md   Tailwind v4, control flow, motion.
  spartan-ui.md              brain/helm, theming, upgrade rules.
  routing.md                 Lazy loading, guards, route-scoped state, SSR.
  security.md                Tokens, XSS, CSP, secrets.
  testing.md                 Vitest, zoneless testing, what to test.
  anti-patterns.md           59-item review checklist, ordered by cost.

.agents/skills/
  angular-developer/         Vendored from angular/angular. Do not edit.
  angular-new-app/           Vendored from angular/angular. Do not edit.
  spartan-ng-developer/      Vendored from mofirojean/angular-ui-skills. Do not edit.
  code-review/               Ours. Audits against docs/standards/.
  UPSTREAM.txt               Provenance: one commit SHA per source + sync date.

scripts/sync-skills.sh       Re-sync the vendored skills.
```

## Using it

### Starting the app

This directory holds only the kit. **Scaffold the app first, then overlay the kit** — running
`ng new --directory .` into a populated directory conflicts with `README.md`, `eslint.config.js`
and friends, and the CLI may refuse or overwrite.

```bash
# 1. Scaffold in a clean sibling directory
npx @angular/cli@latest new my-app --style css --ssr
cd my-app

# 2. Overlay the kit (from wherever you cloned it), keeping the kit's versions
cp -R ../angular-standards/{AGENTS.md,AGENTS.local.md,CLAUDE.md,docs,scripts} .
cp -R ../angular-standards/.agents .
cp ../angular-standards/eslint.config.js .        # overwrites the generated one — intended

# 3. Tooling
npm i -D @spartan-ng/cli && ng g @spartan-ng/cli:init && ng g @spartan-ng/cli:ui-theme
ng add @angular-eslint/schematics                 # keep THIS repo's eslint.config.js if prompted
```

Then wire the config check into the lint script, so the flat-config footgun documented at the top
of `eslint.config.js` cannot come back silently:

```jsonc
// package.json
"scripts": {
  "lint": "node scripts/check-eslint-config.mjs && ng lint"
}
```

Then fill in the "Project facts" section of `AGENTS.local.md` — backend URL, auth model, rendering
strategy. It is the highest-value thing you can give an agent, because it is the context that
cannot be inferred from the code.

### Working with agents

Claude Code, Cursor, and any tool that reads `AGENTS.md` pick this up automatically. There is
nothing to install. For a tool that does not, point it at `AGENTS.md`.

Ask for a review with: *"review my changes against the standards"* — it routes through
`.agents/skills/code-review/`.

### Keeping it current

```bash
./scripts/sync-skills.sh --check    # in CI: fails if the vendored skills are stale
./scripts/sync-skills.sh            # after every Angular upgrade, and quarterly
```

## Maintaining the standards

**When you make a decision an agent could not infer, write it down.** That is the whole discipline.
A rule that lives only in someone's head gets violated by the next agent and by the next hire.

- Adding a rule? Put it in the relevant `docs/standards/` file **with an `Audit:` line**, so the
  review skill picks it up automatically.
- Deviating from a rule? Record it in `AGENTS.local.md` **with a removal condition**. An override
  without an expiry becomes permanent by accident.
- Angular deprecated something new? Add it to the banned table in `longevity.md` during the upgrade
  PR, while you are already looking at the release notes.
- Rule turned out to be wrong? Change it. These are versioned files, not scripture — but they change
  by proposal, not by drift.

## Provenance

This repository is MIT licensed — see [LICENSE](LICENSE).

The skills under `.agents/skills/` are vendored verbatim from other MIT projects and keep their own
copyright: [`angular/angular`](https://github.com/angular/angular/tree/main/skills/dev-skills)
(Google LLC) and
[`mofirojean/angular-ui-skills`](https://github.com/mofirojean/angular-ui-skills) (Mofiro Jean).
Full notices in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md); exact commits in
`.agents/skills/UPSTREAM.txt`.
