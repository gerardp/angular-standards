---
name: spartan-ng-developer
description: Generates Spartan/ng UI code and guidance for Angular projects using @spartan-ng/helm (styled components copied into the repo) and @spartan-ng/brain (headless primitives). Covers installation, Tailwind v4 theming, component usage across all categories (forms, overlays, layout, display, data), Brain primitives, ReactiveForms / Signal Forms integration, and accessibility. Use when the user mentions Spartan, spartan-ng, @spartan-ng, hlm-* or brn-* components, OR when the Angular project's package.json contains @spartan-ng/* dependencies. Pairs with angular-developer for Angular fundamentals.
license: MIT
metadata:
  author: Mofiro Jean
  version: '0.0.1'
---

# Spartan/ng Developer Guidelines

> **Pairs with `angular-developer`** - that skill provides Angular fundamentals (signals, DI, routing, forms, SSR, accessibility). This skill focuses on Spartan/ng specifics. Install both for the best experience.

## Compatibility

- **Tracks:** `@spartan-ng/brain` v1.3.1 (released 2026-08-04). Spartan reached 1.0 stable in June 2026; the 1.x line adds components fast while keeping the API surface versioned and re-validated each bump.
- **1.1 → 1.3 highlights:** 1.1 added the **month-year picker and full date-input support** to Calendar / Date Picker, host-style overrides for `brn-radio` / `brn-checkbox` / `brn-switch`, a CLI scaffold-integrity healthcheck, and strict-CSP inline-style fixes. 1.2 added new **message, bubble, attachment, and marker** components plus Signal-Forms compatibility for Date Picker and Input OTP. 1.3 / 1.3.1 brought a11y fixes for autocomplete / combobox / command and a `defaultOpen` option on Sidebar. No breaking API changes across the 1.x line.
- **Angular:** v21 or v22. `@spartan-ng/brain@1.3.1` peers `@angular/* >=21.0.0 <23.0.0`, so both Angular 21 and 22 are officially supported. Standalone components, control flow (`@if` / `@for`), and signal APIs (`input()` / `output()`) are assumed; it will not generate `NgModule`-based or decorator-based code.
- **Tailwind:** **v4 required.** Spartan 1.x peers `tailwindcss >=4.0.0`, v3 is no longer supported. It also pulls in `luxon >=3.0.0` (date primitives), `clsx >=2.0.0`, and `tw-animate-css >=1.0.0` as peers, ensure those are installed. See [setup.md](references/setup.md).
- **Not supported:** old alphas (`v0.0.1-alpha.*`) with pre-1.0 API drift, Angular v20 or below, **Tailwind v3**, projects using `@spartan-ng/ui-*` packages (deprecated, replaced by `@spartan-ng/helm`).

If the project's installed version differs significantly from the tracked one, warn the user before generating code, the API surface may have shifted.


1. Always check the project's Spartan/ng version before providing guidance. Spartan is now 1.0 stable but still evolves, `package.json` is the source of truth.

2. Detect the project layout up front:
   - If `nx.json` exists → Nx workspace. Use `npx nx g @spartan-ng/cli:ui <name>` commands.
   - Otherwise → Angular CLI. Use `ng g @spartan-ng/cli:ui <name>` commands.

   The destination path for generated Helm source is configured in `components.json` (`componentsPath`) - don't hard-code path assumptions. Find the actual location in `tsconfig.json` `paths` after `init`. See [setup.md](references/setup.md).

3. Confirm the project is on **Tailwind v4** (`tailwindcss` dependency in `package.json`). Spartan 1.x requires Tailwind v4 (peer `>=4.0.0`); v3 is no longer supported. Also ensure the `luxon`, `clsx`, and `tw-animate-css` peers are present. See [setup.md](references/setup.md).

4. After generating code that uses Spartan components, run `ng build` to verify there are no compilation errors. If components render unstyled, the issue is almost always Tailwind config - see the troubleshooting section in [setup.md](references/setup.md).

## Spartan architecture: Helm vs Brain (critical)

Spartan ships two packages with a unique relationship:

- **`@spartan-ng/helm`** - Styled components that live **in the user's project**, not in `node_modules`. The CLI (`ng g @spartan-ng/cli:ui button`) copies the component source into the path configured by `components.json` (`componentsPath`). The `@spartan-ng/helm/<name>` import is a tsconfig path alias to the generated source. To customize a Helm component, **edit the file in the user's repo**. Do not look for it in `node_modules`.

- **`@spartan-ng/brain`** - Headless, accessible primitives installed normally from npm. Helm components compose Brain primitives via Angular's `hostDirectives`.

**Default to Helm.** Reach for Brain only when: (1) Helm doesn't expose the primitive you need, (2) you're building a reusable composition that wraps multiple Helm components, or (3) you need to control accessibility attributes Helm hides.

## Installation and theming

- **Setup**: Install the CLI, add Spartan, configure Tailwind v4 (required, plus the `luxon` / `clsx` / `tw-animate-css` peers), CLI vs Nx detection. Read [setup.md](references/setup.md)
- **Theming**: CSS variables, dark mode, custom themes. Read [theming.md](references/theming.md)

## Components

Spartan/ng provides 56 stable Helm components, grouped here by category. The shared conventions file applies to all of them; the category files cover specific component APIs and gotchas.

- **Helm conventions**: The `hlm*` directive pattern, signal inputs, composition via `hostDirectives`, the `cn()` helper, the `HlmXImports` barrel pattern, common pitfalls. Read [helm-conventions.md](references/helm-conventions.md)
- **Form controls**: Autocomplete, Button, Button Group, Checkbox, Combobox, Date Picker, Field, Input, Input Group, Input OTP, Label, Native Select, Radio Group, Select, Slider, Switch, Textarea, Toggle, Toggle Group. Read [form-controls.md](references/form-controls.md)
- **Overlays**: Alert Dialog, Command, Context Menu, Dialog, Dropdown Menu, Hover Card, Menubar, Navigation Menu, Popover, Sheet, Sonner (Toast), Tooltip. Read [overlays.md](references/overlays.md)
- **Layout**: Accordion, Aspect Ratio, Card, Collapsible, Resizable, Scroll Area, Separator, Sidebar, Tabs. Read [layout.md](references/layout.md)
- **Display**: Alert, Avatar, Badge, Empty, Icon, Item, Kbd, Progress, Skeleton, Spinner. Read [display.md](references/display.md)
- **Data display**: Breadcrumb, Calendar, Carousel, Data Table, Pagination, Table. Read [data-display.md](references/data-display.md)

## Recipes

Cookbook patterns that compound multiple Helm components into a purpose-built surface. None of these are shipped Helm components, the recipe is the contribution. Start with the diff viewer (syntax highlighting, per-line gutter, file tree, inline line comments) if you're building a code-review tool. Read [recipes.md](references/recipes.md)

## Brain primitives

- **Brain**: Headless primitives, when to drop down from Helm, building custom compositions. Read [brain.md](references/brain.md)

## Forms integration

- **Forms**: Wiring Helm form components to ReactiveForms or Signal Forms, `ControlValueAccessor` patterns, validation display. Read [forms.md](references/forms.md)

## Accessibility

- **Accessibility**: A11y conventions Helm and Brain provide for free, ARIA patterns to know, and gotchas. Read [accessibility.md](references/accessibility.md)
