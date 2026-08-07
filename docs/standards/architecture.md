# Architecture

How this application is structured. Detailed rules live in the linked files — this is the map.

## The one rule

**Data flows in one direction. A component never performs I/O.**

```
Component  ──calls──▶  Service (or Store)  ──performs──▶  I/O
    ▲                                                       │
    └──────────────── signals ──────────────────────────────┘
```

A component may not inject `HttpClient`, call `httpResource` directly, or talk to any SDK. It calls
a method on an injected service, and reads signals back. Nothing else.

This is the rule everything else hangs off. It is what makes the app testable, what keeps features
from growing tendrils into each other, and what lets an agent modify one layer without reasoning
about the whole system.

**Audit:** Flag any component that injects `HttpClient`, calls `httpResource`/`resource`/`rxResource`
in its own class body, or imports anything from `data-access/` other than a type.

## Layers

| Layer | Owns | Never does |
| --- | --- | --- |
| **Component** | Template, local UI state, thin event handlers, presentation-only `computed` | I/O, DTO mapping, business rules |
| **Service** (and Store, when one exists) | Orchestration, application state, calling I/O, error handling | Rendering, DOM, template concerns |
| **Data access** | HTTP transport, DTO ⇄ domain model mapping, runtime validation | Application state, loading flags, caching policy |

Detail: [components.md](components.md), [reactivity-and-state.md](reactivity-and-state.md),
[data-access.md](data-access.md).

## Source layout

```
src/app/
├── core/            App-wide singletons. Auth, HTTP interceptors, global error handling,
│                    app config. Provided once in app.config.ts. Imported by anything.
│
├── data-access/     API services and domain models. One *-api.service.ts per backend area.
│                    Owns DTO → domain mapping. Imported by features and core only.
│
├── features/        Route-level areas. One folder per feature.
│   └── <feature>/   Code grouped by screen or cohesive flow when needed.
│                    Components and feature-local logic stay with their narrowest consumer.
│                    ⚠ A feature NEVER imports from another feature.
│
├── ui/              Presentational components. No injected services, no I/O.
│   └── helm/        Spartan helm components (generated, ours to maintain).
│                    See spartan-ui.md before editing.
│
└── util/            Pure functions. No Angular, no DI, no side effects. Trivially testable.
```

### Dependency direction

Dependencies point **downward only**:

```
features/  ──▶  core/  ──▶  util/
    │            │
    └──▶  data-access/  ──▶  util/
    │
    └──▶  ui/  ──▶  util/
```

- `util/` imports nothing from the app.
- `ui/` imports only `util/` and types. It never injects a service.
- `data-access/` imports `util/` and `core/` (for HTTP config). Never a feature, never `ui/`.
- `core/` never imports a feature.
- **`features/<a>/` never imports `features/<b>/`.** If two features need the same thing, it moves
  down into `ui/`, `data-access/`, `util/`, or `core/` — whichever layer owns it.

That last rule is the one that decays first and costs the most. It is enforced mechanically in
`eslint.config.js`, not by review discipline. A violation is a build failure.

**Audit:** Flag cross-feature imports and any upward import (e.g. `core/` importing from
`features/`). Flag any component in `ui/` that injects a service.

## Where does this file go?

Answer in order; the first match wins.

1. Is it a pure function with no Angular imports, used by more than one feature? → `util/`
2. Does it render, take `input()`s, and inject nothing? → `ui/`
3. Does it perform HTTP or map a DTO? → `data-access/`
4. Is it needed by more than one feature, app-wide, and provided once? → `core/`
5. Otherwise → `features/<feature>/`, colocated with what uses it.

**Default to colocation.** A component or pure helper used by one feature belongs in that feature,
not in `ui/` or `util/`. Promote it on the second consumer, not in anticipation of one. Premature
sharing creates the coupling that the layer rules exist to prevent.

## Feature-local structure

Group first by feature, then by screen or cohesive flow — never by technical type. A feature with
one screen keeps that screen's component, template, styles, spec, and service directly in the
feature root; do not create a redundant `<feature>/<feature>/` directory. Introduce per-screen or
per-flow directories when the feature gains a second screen or independently changing flow:

```
features/<feature>/
├── <feature>.routes.ts                  Lazy route definitions for this feature
├── <screen-or-flow>/
│   ├── <screen-or-flow>.ts              Component
│   ├── <screen-or-flow>.html            Template
│   ├── <screen-or-flow>.css             If Tailwind utilities cannot express the styles
│   ├── <screen-or-flow>.spec.ts         Tests
│   └── <screen-or-flow>-service.ts      Orchestration used only by this screen, if needed
├── <feature-local-widget>/
│   ├── <feature-local-widget>.ts
│   ├── <feature-local-widget>.html
│   └── <feature-local-widget>.spec.ts
├── <feature>-store.ts                   State shared across the feature, if needed
└── <feature>-<purpose>.ts               Pure logic shared across the feature, if needed
```

Keep a service, store, helper, template, stylesheet, and spec beside the narrowest screen or flow
that owns it. In a multi-screen feature, put one at the feature root only when several screens use
it. Do not create feature-wide `components/`, `services/`, or `stores/` buckets: those names
describe file types, not domain boundaries. Name pure-logic files after what they do
(`invoice-filters.ts`), never after their technical category (`invoice-helpers.ts`).

**Audit:** Flag feature-wide `components/`, `services/`, or `stores/` directories that group
unrelated files by technical type. In a multi-screen feature, flag screen-specific files placed at
the feature root when only one screen or flow uses them. Do not flag root placement in a
single-screen feature. Flag generic `helpers.ts` or `*-helpers.ts` filenames; the name must state
what the file does.

Every feature is lazy-loaded: use `loadComponent` for a single-screen feature and `loadChildren`
for a feature with its own route tree. See [routing.md](routing.md).

## Does this feature need a store?

Most do not. Start with `httpResource` in a data-access service plus component-local signals; that
covers the majority of screens with no extra concepts.

Add a feature store when you hit the graduation criteria in
[reactivity-and-state.md](reactivity-and-state.md#when-to-add-a-store). The layering rule is
identical either way — the component calls a method and reads signals. Introducing a store later
does not change component code shape, which is exactly why it is safe to defer.

## Bootstrap

Standalone throughout. No `NgModule` anywhere in app code.

```ts
// main.ts
bootstrapApplication(App, appConfig);
```

`app.config.ts` holds every `provide*()` call: router, HTTP, error handling, app initialisers. It
is the single place to answer "what is configured in this app?".

## Rendering strategy

Decide SSR **per route**, not per app, and record the decision in `AGENTS.local.md`. See
[routing.md](routing.md#rendering-strategies).
