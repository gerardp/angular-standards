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
├── features/        Route-level areas. One folder per route tree.
│   └── <feature>/   Components, feature-local services/stores, <feature>.routes.ts.
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

1. Is it a pure function with no Angular imports? → `util/`
2. Does it render, take `input()`s, and inject nothing? → `ui/`
3. Does it perform HTTP or map a DTO? → `data-access/`
4. Is it needed by more than one feature, app-wide, and provided once? → `core/`
5. Otherwise → `features/<feature>/`, colocated with what uses it.

**Default to colocation.** A component used by one feature belongs in that feature, not in `ui/`.
Promote it to `ui/` on the second consumer, not in anticipation of one. Premature sharing creates
the coupling that the layer rules exist to prevent.

## Feature-local structure

```
features/invoices/
├── invoices.routes.ts          Lazy route definitions for this feature
├── invoice-list/
│   ├── invoice-list.ts         Component
│   └── invoice-list.html
├── invoice-detail/
├── invoices-store.ts           Feature state, IF the feature needs one (see below)
└── invoice-filters.ts          Feature-local pure helpers
```

Every feature is lazy-loaded via `loadChildren`. See [routing.md](routing.md).

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
