# Spartan NG

Spartan is the component layer. Angular Material is not used, and neither is any other component
library — see [longevity.md](longevity.md#3-dependency-policy).

> **API detail lives in the vendored skill.** `.agents/skills/spartan-ng-developer/` covers
> installation, the four Helm template patterns, every component category, Brain primitives, forms
> integration, theming and accessibility — pinned to a specific Spartan version and re-synced by
> `scripts/sync-skills.sh`. **Read it before writing Spartan code.** This file states only the
> decisions that are ours, and wins where the two disagree.

## The two layers

| Layer | What | Where it lives | Who maintains it |
| --- | --- | --- | --- |
| **brain** | Accessible, unstyled primitives — keyboard handling, ARIA, focus management | `@spartan-ng/brain`, an npm dependency | Spartan upstream |
| **helm** | Styled Tailwind implementations built on brain | **Copied into our repo** | **Us** |

This split is why Spartan is a defensible 10-year bet. Helm code is not a dependency — it is our
source. If Spartan upstream stalled tomorrow we would still have a complete, readable component
library in our own repository, built on Angular CDK primitives maintained by the Angular team.

Be precise about what the dependency actually is, though: `@spartan-ng/brain` requires
`@angular/cdk`, `clsx`, `luxon` and `tw-animate-css` as peers, plus Tailwind v4. That is five
external packages, not one. See the [luxon exception](longevity.md#the-luxon-exception).

## Where helm code lives

**Do not hard-code the path.** The Spartan CLI writes generated Helm source to the location
configured in `components.json` (`componentsPath`), and `@spartan-ng/helm/<name>` is a
`tsconfig.json` path alias to it — *not* a `node_modules` package.

To find it: read `componentsPath` in `components.json`, or the `@spartan-ng/helm/*` entry under
`paths` in `tsconfig.json`.

This repo's convention is `src/app/ui/helm/`, set at `init` time. If you change it, change it in
`components.json` and update the `Audit:` globs in this file and the `ignores` in
`eslint.config.js` to match.

**Audit:** Flag any doc, script, or lint glob that assumes a helm path without deriving it from
`components.json`.

## Setup

```bash
npm i -D @spartan-ng/cli
ng g @spartan-ng/cli:init          # wires the Tailwind preset, CDK, peers, theme variables
ng g @spartan-ng/cli:ui-theme      # emits the CSS custom properties for light/dark
ng g @spartan-ng/cli:ui button     # add a component
```

In an Nx workspace it is `npx nx g @spartan-ng/cli:ui <name>`. The vendored skill's `setup.md` has
the full procedure and the troubleshooting for unstyled components.

Generated Helm source is committed. It is ours now.

## Usage

Import the `Hlm{X}Imports` barrel — it pulls in every directive and sub-component the template
needs, which is what makes compound components work:

```ts
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  imports: [HlmButtonImports],
  template: `<button hlmBtn variant="outline" size="sm">Save</button>`,
})
```

**Use the variant; do not re-style at the call site:**

```html
<!-- Wrong: fighting the design system with utilities -->
<button hlmBtn class="rounded-none bg-red-600 px-8 text-white">Delete</button>

<!-- Right: the variant already exists -->
<button hlmBtn variant="destructive">Delete</button>
```

If a needed variant does not exist, **add it to the Helm component's CVA config** so it is
available everywhere. One-off overrides at call sites are how a design system dies.

**Audit:** Flag colour, border-radius, padding, or typography utilities applied directly to a
`hlm*` component in a feature template. That styling belongs in the Helm component's variants.

## Editing helm components

You own this code, so editing is allowed — but you also own the consequences.

**Encouraged:** adding a variant to the CVA config, aligning classes to the design tokens, fixing a
bug.

**Careful:** changing a component's public input/output API (every call site depends on it), and
removing accessibility wiring from the underlying Brain primitive — if you are deleting an ARIA
attribute or a keyboard handler, you are almost certainly introducing a bug.

**Record every non-trivial edit** in `AGENTS.local.md` under "Active overrides". Otherwise a future
`ng g @spartan-ng/cli:ui` re-run silently reverts your fix and nobody knows why the bug came back.

**Audit:** Flag Helm components whose git history shows edits with no corresponding
`AGENTS.local.md` entry.

## Composite widgets: use brain

For anything with keyboard semantics — listbox, combobox, menu, tabs, accordion, dialog, tree — use
the Helm component, or drop to the Brain primitive when Helm does not expose what you need. Do not
hand-roll.

Accessible composite widgets are genuinely hard: roving tabindex, type-ahead, focus trapping,
`aria-activedescendant`, screen-reader announcement. Getting them wrong is invisible until an audit,
and hand-rolled versions are the most common source of accessibility debt in Angular apps.

This is also why we prefer Spartan Brain over **Angular Aria**: as of v22 Aria is Developer
Preview and carries no deprecation guarantee, while Spartan is 1.x stable. Revisit when Aria ships
stable, and record the decision in `AGENTS.local.md` if it changes.

**Audit:** Flag hand-rolled dropdowns, modals, tabs, or comboboxes built from `div`s and click
handlers where a Helm component or Brain primitive exists.

## Theming

Theme through the CSS custom properties Spartan emits (`--background`, `--foreground`, `--primary`,
`--muted`, `--destructive`, …), consumed via Tailwind's semantic classes:

```html
<div class="bg-background text-foreground border-border">
  <p class="text-muted-foreground">Secondary text</p>
</div>
```

**Never hard-code a palette colour in a component.** `bg-slate-900` breaks dark mode and breaks the
day someone rebrands. `bg-background` does not. Dark mode then comes free: the variables are
redefined under the dark selector and everything follows.

**Audit:** Flag literal Tailwind palette colours (`bg-slate-*`, `text-gray-*`, `border-zinc-*`,
`#hex`, `rgb()`) in any template or component style. Raw colours are allowed only where the theme
variables are defined, in `styles.css`.

## Composition

```
src/app/ui/
├── helm/              Spartan-generated components. Ours to maintain.
└── <our-components>/  Our own presentational components, built FROM helm.
```

Our own components in `ui/` compose Helm components. Features import from `ui/`. Simple primitives
(a button, an input) are fine to import directly from Helm in a feature; anything with an
app-specific shape gets wrapped once in `ui/` so the shape lives in one place.

## Upgrading Spartan

`@spartan-ng/brain` is upgraded on the normal dependency cadence. Helm components do **not** update
automatically — they are our source.

When Spartan ships a meaningful upstream fix to a Helm component:

1. Regenerate into a scratch location and diff against ours.
2. Port the fix, keeping our variants and any recorded overrides.
3. Update the `AGENTS.local.md` entry if the override still applies.
4. Re-run `./scripts/sync-skills.sh` so the vendored skill matches the installed Spartan version.

Do this alongside the annual Angular upgrade — see
[longevity.md](longevity.md#2-upgrade-on-a-schedule-not-on-demand) — so there is one review moment
per year rather than continuous drift. Check the Angular peer ceiling at the same time; it is
tracked in [longevity.md](longevity.md#check-the-dependency-ceilings-first).
