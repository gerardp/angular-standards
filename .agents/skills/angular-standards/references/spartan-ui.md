# Spartan NG

Spartan is the component layer. Angular Material is not used, and neither is any other component
library — see [longevity.md](longevity.md#3-dependency-policy).

> **API detail lives in the upstream skills.** This file states only the decisions that are ours,
> and wins where any of them disagree.

## The upstream skill

**One skill: `spartan`**, from `spartan-ng/spartan`. It is written by the Spartan maintainers and
lives in the library's own monorepo, so it is released alongside the code it documents.

That makes it well-aligned, **not** pinned to this project. `npx skills update` fetches upstream's
latest, which may describe a Spartan newer than the one in `package.json`. So when the skill and
the project disagree, the project wins, in this order: the generated Helm source, then
`package.json`, then the skill. Never assume an API exists because the skill documents it — check
that the installed version has it.

| You need | Read |
| --- | --- |
| Anything about the CLI — `init`, `ui`, `ui-theme`, `info`, `healthcheck`, `migrate-*` | `spartan/cli.md` |
| The project's actual paths, versions and installed components | `spartan/cli.md` → `info --json` |
| Styling rules — `hlm()`, `classes()`, semantic tokens, overlay z-index | `spartan/rules/styling.md` |
| Form composition — `hlmField`, fieldsets, error display | `spartan/rules/forms.md` |
| Nesting rules — what goes inside what | `spartan/rules/composition.md` |
| Icons — `provideIcons`, sizing | `spartan/rules/icons.md` |
| Theming, CSS variables, adding a custom colour | `spartan/customization.md` |
| Distribution model, `components.json` fields | `spartan/registry.md` |

### Finding a component's API

The official skill deliberately carries **no per-component catalogue**. Its instruction is *"never
guess selectors — confirm them."* So confirm them, in this order:

1. **The generated Helm source in this repo.** It is ours and it is on disk — the file under
   `componentsPath` is the actual API, not a description of it. This beats every other source and
   needs no network.
2. **The `@spartan-ng/mcp` server** — `spartan_components_get` with `extract: "api"`, then
   `extract: "code"` for an example. Setup is in `spartan/mcp.md`.
3. **`https://www.spartan.ng/components/<name>`.**

If none of the three is available, say the API could not be confirmed. Do not guess a selector, and
do not reconstruct one from memory — Spartan renamed selectors across the alpha → 1.x transition
and a plausible-looking wrong selector fails at runtime, not at build.

### Community Spartan skills and snippets

Third-party Spartan skills, blog posts and Stack Overflow answers are easy to find and easy to
install. **Do not add them** — the exclusion list is in [SKILL.md](../SKILL.md).

They are not written for this project, and they fail the same four ways often enough to check for
by default. When any outside Spartan code lands here, audit it for exactly this:

| Check | Rule |
| --- | --- |
| Raw palette colours (`bg-emerald-500`) and hand-written `dark:` overrides instead of semantic tokens | [Theming](#theming) below |
| Reactive Forms — `FormControl`, `formControlName`, `ReactiveFormsModule` | [forms.md](forms.md) — Signal Forms only |
| `.subscribe()` in a component | [reactivity-and-state.md](reactivity-and-state.md#rxjs) |
| `[innerHTML]`, physical direction utilities (`ml-*`, `text-right`) | [security.md](security.md#xss), [templates-and-styling.md](templates-and-styling.md#layout) |

Precedence resolves all of it on paper — this file wins. But precedence is a rule applied *after*
reading, and a worked example is the most copied thing in any document. Treat outside Spartan
material as a hint about which component to use, never as a pattern to paste.

Version banners are not evidence, either. A skill or post can carry a current version number and
still contain guidance from three releases ago; the header is the cheapest thing to update. The
installed version and the generated Helm source are what decide.

Neither this project's rules nor its architecture are known to any upstream skill. They are
reference material; the decisions are here.

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

**Ask the CLI, do not parse the file.** Pick the runner from the filesystem first — `nx.json` at the
workspace root means Nx, otherwise Angular CLI:

```bash
if [ -f nx.json ]; then
  npx nx g @spartan-ng/cli:info --json
else
  ng g @spartan-ng/cli:info --json
fi
```

Write it as an `if`, not as `[ -f nx.json ] && npx nx g … || ng g …`. That one-liner falls through
to `ng g` when the Nx command *fails*, not only when `nx.json` is absent — so a real Nx error gets
swallowed and retried against the wrong runner, and you debug the wrong workspace type.

That `nx.json` check is the only way in. `info` *reports* `workspaceType`, but you cannot read it
without having already chosen a runner, so do not treat the field as the way to detect one — it is
there to confirm what you picked. The same choice applies to every generator below; this file
writes the Angular CLI form throughout.

`info` is read-only and returns `componentsPath`, `importAlias`, `installedComponents`,
`availableComponents`, `versions` and `tailwindCssFile`. It applies the CLI's own defaults, which
reading `components.json` by hand does not. Run it **before** generating anything — it also tells
you what is already installed, so you do not re-add a component and clobber local edits.

Fallback if the CLI is not installed: `componentsPath` in `components.json`, or the
`@spartan-ng/helm/*` entry under `paths` in `tsconfig.json`.

If `components.json` does not exist the project is not set up — see Setup below. `init` does not
create it. An interactive first `ui` run can create it, but this skill writes it explicitly before
`ui` so an unattended setup cannot stall at its path, alias and style prompts.

This repo's convention is `src/app/ui/helm/`, recorded in `components.json`. If you change it,
update the `Audit:` globs in this file and the `ignores` in `eslint.config.js` to match.

**Audit (review):** Flag any doc, script, or lint glob that assumes a helm path without deriving it from
`components.json`.

## Setup

Spartan requires Tailwind CSS v4 before its generators run. Follow Tailwind's
[official Angular guide](https://tailwindcss.com/docs/installation/framework-guides/angular):

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

Add `@import 'tailwindcss';` at the start of `src/styles.css`, then initialise Spartan. Passing a
theme makes `init` non-interactive; it already generates the theme, so do not follow it with
`ui-theme`:

```bash
npm i -D @spartan-ng/cli
ng g @spartan-ng/cli:init --theme=neutral
```

For this house convention, create `components.json` before the first `ui` run rather than answering
prompts:

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
`button` under `installedComponents`. Treat any missing value as an incomplete setup.

In an Nx workspace every command is `npx nx g @spartan-ng/cli:<generator>` instead — decided by
`nx.json`, as above.

Full generator reference: `spartan/cli.md`. If components render unstyled, it is almost always the
Tailwind wiring: check that the global stylesheet imports
`@spartan-ng/brain/hlm-tailwind-preset.css` and that `tailwindcss` is v4
(`spartan/customization.md` has the exact import block).

Generated Helm source is committed. It is ours now.

**After any Spartan upgrade, run the healthcheck.** It scans for deprecated APIs and stale imports
and fixes them, which is the whole `migrate-*` family in one command:

```bash
ng g @spartan-ng/cli:healthcheck             # report only
ng g @spartan-ng/cli:healthcheck --autoFix   # apply
```

Do not invoke `migrate-*` generators individually unless you are targeting one known migration.

**Audit (review):** Flag a `@spartan-ng/*` version bump in `package.json` whose PR shows no healthcheck run.

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

**Audit (review):** Flag colour, border-radius, padding, or typography utilities applied directly to a
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

**Audit (review):** Flag Helm components whose git history shows edits with no corresponding
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

**Audit (review):** Flag hand-rolled dropdowns, modals, tabs, or comboboxes built from `div`s and click
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

**Audit (review):** Flag literal Tailwind palette colours (`bg-slate-*`, `text-gray-*`, `border-zinc-*`,
`#hex`, `rgb()`) in any template or component style. Raw colours are allowed only where the theme
variables are defined, in `styles.css`.

**Need a colour the palette does not have?** Add it as a token, not as a one-off. Define the
variable in both `:root` and `.dark`, then expose it to Tailwind with `@theme inline` so
`bg-warning` works like `bg-primary` does. The exact shape is in `spartan/customization.md`. A
semantic token added once is a rebrand-safe decision; a hex in a template is a bug with a delay
fuse.

## Composition

```
src/app/ui/
├── helm/              Spartan-generated components. Ours to maintain.
└── <our-components>/  Our own presentational components, built FROM helm.
```

Our own components in `ui/` compose Helm components. Features import from `ui/`. Simple primitives
(a button, an input) are fine to import directly from Helm in a feature; anything with an
app-specific shape gets wrapped once in `ui/` so the shape lives in one place.

**Build them the way Helm builds them.** A component in `ui/` that takes classes from its callers
merges them with `classes()` from `@spartan-ng/helm/utils`, called in the constructor — it applies
your base classes to the host and merges the caller's `class` over them, with the caller winning
conflicts. Never concatenate class strings by hand; `hlm()` (clsx + tailwind-merge) exists for the
computed case. Both patterns are written out in `spartan/rules/styling.md`.

**Audit (review):** Flag template-literal or `+` class concatenation in a component under `ui/`. It produces
duplicate, mutually-overriding Tailwind classes whose winner depends on stylesheet order.

## Upgrading Spartan

`@spartan-ng/brain` is upgraded on the normal dependency cadence. Helm components do **not** update
automatically — they are our source.

When Spartan ships a meaningful upstream fix to a Helm component:

1. Run `ng g @spartan-ng/cli:healthcheck` first. It catches the deprecated APIs and stale imports
   mechanically, which is most of what an upgrade actually breaks.
2. Regenerate into a scratch location and diff against ours.
3. Port the fix, keeping our variants and any recorded overrides.
4. Update the `AGENTS.local.md` entry if the override still applies.
5. Run `npx skills update spartan` to pull the latest upstream guidance.

On that last step: `npx skills update` with no name updates **every** installed skill, including
`angular-developer`, which is a separate decision — name the skill. And it fetches upstream's
latest, which is not the same as "the version this project has installed". It usually tracks
closely, because the skill ships from the Spartan monorepo, but if the guidance and
`package.json` disagree, `package.json` and the generated Helm source win.

Do this alongside the annual Angular upgrade — see
[longevity.md](longevity.md#2-upgrade-on-a-schedule-not-on-demand) — so there is one review moment
per year rather than continuous drift. Check the Angular peer ceiling at the same time; it is
tracked in [longevity.md](longevity.md#check-the-dependency-ceilings-first).
