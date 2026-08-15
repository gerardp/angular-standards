---
name: angular-standards
description: House coding standards for a long-lived Angular 22+ application — layer architecture and dependency direction, signals and state, data access, Signal Forms, Tailwind v4, Spartan NG, routing, security, testing, and the banned-API list — plus the review process that audits changes against them. Use when writing, refactoring or reviewing Angular code, when deciding where a file goes, when adding a dependency, when upgrading Angular, or when asked to review a diff, branch or PR against project conventions.
license: MIT
metadata:
  version: '2.0'
---

# Angular standards

You are working on a long-lived Angular application. Target: **Angular 22.1+**, designed to stay on
the upgrade path through v23, v24 and beyond for 10+ years.

Read this file first. It routes you to the rule that applies.

## The three sources, in precedence order

1. **`AGENTS.local.md`** in the project root — that repo's exceptions. Overrides everything below.
   May not exist yet.
2. **`references/` in this skill** — house rules. Stricter than, or additional to, the upstream
   Angular and Spartan skills.
3. **The upstream skills** — `angular-developer` from `angular/angular`, and `spartan` from
   `spartan-ng/spartan` (the official Spartan skill).

When `references/` and an upstream skill disagree, `references/` wins. It is written to be stricter,
never contradictory on framework facts.

## Non-negotiable rules

These six apply to every change. Everything else is in the topic files.

1. **A component never performs I/O.** No `HttpClient`, no `httpResource`, no SDK calls in a
   component. Components call a service or store method. See
   [data-access.md](references/data-access.md).
2. **Check the Angular version before you write code.** Run `ng version`. APIs move fast; guidance
   for v20 is wrong for v22. See [longevity.md](references/longevity.md).
3. **Test every behaviour change.** Add or update the smallest test that proves it. Every bug fix
   needs a regression test that fails without the fix. Run `ng build` and `ng test` when you finish,
   and fix what they report before you report done. Do not skip this.
4. **Never use an API on the banned list.** [longevity.md](references/longevity.md) holds the list
   of deprecated and removal-scheduled APIs. This is a 10-year application; using a deprecated API
   is creating scheduled work for a future maintainer.
5. **Never edit generated Helm code by hand without reading**
   [spartan-ui.md](references/spartan-ui.md). Ask the CLI where it lives —
   `ng g @spartan-ng/cli:info --json` — never assume a path. That code is generated, owned by us,
   and has upgrade rules.
6. **State the tradeoff before adding a dependency.** See the dependency policy in
   [longevity.md](references/longevity.md).

## Topic index

| Topic | File |
| --- | --- |
| Layers, folders, dependency direction | [architecture.md](references/architecture.md) |
| **Banned APIs, upgrade cadence, dependency policy** | [longevity.md](references/longevity.md) |
| TypeScript config, naming, accessibility baseline | [core-engineering.md](references/core-engineering.md) |
| Components, inputs/outputs, host bindings | [components.md](references/components.md) |
| Signals, derived state, when to add a store | [reactivity-and-state.md](references/reactivity-and-state.md) |
| HTTP, services, DTO boundary, error handling | [data-access.md](references/data-access.md) |
| Signal Forms | [forms.md](references/forms.md) |
| Control flow, Tailwind v4, animations | [templates-and-styling.md](references/templates-and-styling.md) |
| Spartan NG brain/helm (house rules) | [spartan-ui.md](references/spartan-ui.md) |
| Routes, guards, lazy loading, SSR | [routing.md](references/routing.md) |
| Budgets, profiling, lazy services, long lists | [performance.md](references/performance.md) |
| Tokens, XSS, CSP, input validation | [security.md](references/security.md) |
| Error reporting, correlation, field metrics | [observability.md](references/observability.md) |
| Vitest, harnesses, zoneless testing | [testing.md](references/testing.md) |
| Review checklist | [anti-patterns.md](references/anti-patterns.md) |
| **Reviewing a diff, branch or PR** | [code-review.md](references/code-review.md) |

## Upstream framework depth

The standards files cite upstream material as `<skill-name>/references/<file>.md` — for example
`angular-developer/references/signal-forms.md`. Those live in the upstream skills, not here:

```bash
npx skills add angular/skills -s angular-developer
npx skills add https://github.com/spartan-ng/spartan --skill spartan
```

- **`angular-developer`** — component anatomy, DI resolution, router lifecycle, Signal Forms API,
  testing, CLI. `angular/skills` is Angular's published mirror of
  `angular/angular/skills/dev-skills/`; both work, the mirror clones in seconds.
- **`spartan`** — the **official** Spartan skill, released from the library's own monorepo. The
  single source for Spartan: the `@spartan-ng/cli` generators (`info --json`, `healthcheck`, the
  `migrate-*` family), the `@spartan-ng/mcp` server, the styling/forms/composition/icons rules,
  `components.json`, and theming.

`spartan` carries no per-component catalogue on purpose — confirm a component's API from the
generated Helm source, then MCP, then the docs site. The order and the reasoning are in
[spartan-ui.md](references/spartan-ui.md#finding-a-components-api).

**Those two, and nothing else.** Angular UI skills are easy to find and most of them fight these
standards. The ones you are most likely to be offered:

| Do not install | Why |
| --- | --- |
| `angular-material-developer`, `ng-zorro-developer`, `primeng-developer` | Recommend component libraries this standard bans — [spartan-ui.md](references/spartan-ui.md), [longevity.md](references/longevity.md) |
| `spartan-ng-developer` | The per-component catalogue that would fill the gap above — but its worked examples teach patterns these standards ban — [spartan-ui.md](references/spartan-ui.md#community-spartan-skills-and-snippets) |
| `ui-craft` | Contradicts itself on the rule that matters most here: its top-level principles say to reach for theme tokens so dark mode comes free, then its reference files work in raw palette shades with hand-written `dark:` overrides. See [spartan-ui.md](references/spartan-ui.md#theming) |
| `angular-new-app` | Scaffolds a new app. The app already exists by the time it is installed, and its `ng new --ai-config` step generates an `AGENTS.md` that collides with this project's. Its "generate everything with `ng generate`" step ignores [architecture.md](references/architecture.md) on file placement. |

The pattern is the same in all four: they are written for a generic Angular project, and this one
has a design system. A skill that reaches for `bg-emerald-500` is not neutral advice here — it is a
worked example of the rule these standards spend the most effort enforcing. And a document that
contradicts *itself* is worse than one that is simply wrong: you cannot predict which half an agent
copies.

These are assessments of third-party documents made when this list was written, not permanent
facts — upstream can fix any of them. They are reasons to exclude by default, not verdicts. If you
have a reason to install one, read it against
[spartan-ui.md](references/spartan-ui.md#community-spartan-skills-and-snippets) first and record the
decision in `AGENTS.local.md`.

`angular-new-app` is the exception that is genuinely useful **before** a project exists. Install it
globally if you want it: `npx skills add angular/skills -s angular-new-app -g`.

Update them by name — a bare `npx skills update` updates everything installed, which is a separate
decision each time: `npx skills update angular-developer spartan`.

If a cited file is not present, the skill is not installed. Say so rather than guessing at the API,
and fall back to `https://angular.dev` for framework questions.

## Mechanical enforcement — set this up once per project

Most of these rules are checkable, and a failing build beats review discipline. `assets/` holds the
two files that do it. On a project that does not have them yet, install them:

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

The order matters: `ng add` writes a baseline `eslint.config.js`; copying the house config before
it lets the schematic overwrite the rules silently. The `npm pkg set` command wires the composition
check into `package.json`, so the flat-config footgun documented at the top of `eslint.config.js`
cannot come back silently.

`eslint.config.js` enforces: the banned-package and banned-decorator lists, the "no I/O in a
component" rule, the layer dependency direction, the accessibility baseline as errors, and the
zoneless test rules. `check-eslint-config.mjs` asserts that those rules survive ESLint flat-config
composition — a mistake there fails **silently**, leaving a config that lints clean while enforcing
nothing.

## Maintaining the standards

**When a decision is made that an agent could not infer, write it down.** That is the whole
discipline.

- Adding a rule? Put it in the relevant `references/` file **with an `Audit:` line**, so
  [code-review.md](references/code-review.md) picks it up automatically. One source of truth for
  authoring and for review.
- Deviating from a rule? Record it in the project's `AGENTS.local.md` **with a removal condition**.
  An override without an expiry becomes permanent by accident.
- Angular deprecated something new? Add it to the banned table in
  [longevity.md](references/longevity.md) during the upgrade PR, while the release notes are open.
