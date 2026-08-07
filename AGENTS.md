# Agent instructions

You are working on a long-lived Angular application. Target: **Angular 22.1+**, designed to stay
on the upgrade path through v23, v24 and beyond for 10+ years.

Read this file first. It routes you to the rule that applies.

## The three sources, in precedence order

1. **`AGENTS.local.md`** — this repo's exceptions. Overrides everything below. May not exist yet.
2. **`docs/standards/`** — house rules. Stricter than, or additional to, the upstream skill.
3. **`.agents/skills/`** — vendored upstream guidance: `angular-developer` and `angular-new-app`
   from `angular/angular`, and `spartan-ng-developer` from `mofirojean/angular-ui-skills`.
   Never edit these files; they are re-synced by `scripts/sync-skills.sh`.

When `docs/standards/` and the upstream skill disagree, `docs/standards/` wins. It is written to be
stricter, never contradictory on framework facts.

## Non-negotiable rules

These six apply to every change. Everything else is in the topic files.

1. **A component never performs I/O.** No `HttpClient`, no `httpResource`, no SDK calls in a
   component. Components call a service or store method. See
   [data-access.md](docs/standards/data-access.md).
2. **Check the Angular version before you write code.** Run `ng version`. APIs move fast; guidance
   for v20 is wrong for v22. See [longevity.md](docs/standards/longevity.md).
3. **Test every behaviour change.** Add or update the smallest test that proves it. Every bug fix
   needs a regression test that fails without the fix. Run `ng build` and `ng test` when you finish,
   and fix what they report before you report done. Do not skip this.
4. **Never use an API on the banned list.** [longevity.md](docs/standards/longevity.md) holds the
   list of deprecated and removal-scheduled APIs. This is a 10-year application; using a deprecated
   API is creating scheduled work for a future maintainer.
5. **Never edit generated Helm code by hand without reading**
   [spartan-ui.md](docs/standards/spartan-ui.md). Its location comes from `components.json`
   (`componentsPath`), not from a hard-coded path. That code is generated, owned by us, and has
   upgrade rules.
6. **State the tradeoff before adding a dependency.** See the dependency policy in
   [longevity.md](docs/standards/longevity.md).

## Topic index

| Topic | File |
| --- | --- |
| Layers, folders, dependency direction | [architecture.md](docs/standards/architecture.md) |
| **Banned APIs, upgrade cadence, dependency policy** | [longevity.md](docs/standards/longevity.md) |
| TypeScript config, naming, accessibility baseline | [core-engineering.md](docs/standards/core-engineering.md) |
| Components, inputs/outputs, host bindings | [components.md](docs/standards/components.md) |
| Signals, derived state, when to add a store | [reactivity-and-state.md](docs/standards/reactivity-and-state.md) |
| HTTP, services, DTO boundary, error handling | [data-access.md](docs/standards/data-access.md) |
| Signal Forms | [forms.md](docs/standards/forms.md) |
| Control flow, Tailwind v4, animations | [templates-and-styling.md](docs/standards/templates-and-styling.md) |
| Spartan NG brain/helm (house rules) | [spartan-ui.md](docs/standards/spartan-ui.md) |
| Spartan NG component APIs (depth) | `.agents/skills/spartan-ng-developer/` |
| Routes, guards, lazy loading, SSR | [routing.md](docs/standards/routing.md) |
| Tokens, XSS, CSP, input validation | [security.md](docs/standards/security.md) |
| Vitest, harnesses, zoneless testing | [testing.md](docs/standards/testing.md) |
| Review checklist | [anti-patterns.md](docs/standards/anti-patterns.md) |

## Upstream framework depth

For API-level detail not covered above:

- **Angular framework** — component anatomy, DI resolution, router lifecycle, Signal Forms API:
  `.agents/skills/angular-developer/SKILL.md` and its `references/`.
- **Spartan components** — the four Helm template patterns, per-component APIs, Brain primitives,
  theming: `.agents/skills/spartan-ng-developer/SKILL.md` and its `references/`. Read
  `references/helm-conventions.md` before writing any Spartan template.

Both are vendored and version-pinned; see `.agents/skills/UPSTREAM.txt`.

## Code review

Convention audits run through `.agents/skills/code-review/SKILL.md`. It does not restate rules —
it reads the `Audit:` lines in `docs/standards/` and checks against them. When you add a rule, add
its `Audit:` line in the same file. One source of truth.
