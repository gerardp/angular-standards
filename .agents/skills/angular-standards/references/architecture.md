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

### Abstractions are for real seams, not for testability

Angular's DI already gives you the seam. A class is its own injection token, so a test overrides it
with no abstraction in the way:

```ts
const fakeInvoiceApi = {
  create: () => of(stubInvoice),
} satisfies Pick<InvoiceApiService, 'create'>;

TestBed.configureTestingModule({
  providers: [{ provide: InvoiceApiService, useValue: fakeInvoiceApi }],
});
```

The `satisfies` clause is doing the work, not the provider: `ClassProvider` and `ValueProvider` both
type `provide` as `any`, so the provider line checks nothing on its own. Anchoring the fake to a
`Pick<>` of the real service is what makes it fail to compile when the service changes — the signal
[testing.md](testing.md#dependency-substitution) is asking for.

An `interface` + `InjectionToken`, or an `abstract class` base, layered on top of that buys nothing
and costs a file. Inject the concrete class.

**A TypeScript `interface` cannot be an injection token at all.** It is erased at compile time:
`inject(InvoiceRepository)` does not compile, and a constructor parameter typed as one fails with
NG2003 — an error, not a warning, under `strictInjectionParameters`
([core-engineering.md](core-engineering.md#typescript-configuration)). "Inject the interface, not
the class" is C#/Java advice. In Angular the token has to be a runtime value.

Introduce a contract — an abstract class, or an `InjectionToken<T>` — only when **two
implementations ship in the same app** and something picks between them at runtime:

- Platform split — a browser and a server implementation, swapped in `app.config.server.ts`.
- Route or tenant scope — different providers on different routes.
- A wrapper isolating a risky dependency ([longevity.md](longevity.md#isolate-what-you-cannot-avoid)),
  where the abstract type is what stops the vendor's types leaking into features.

"We might swap it later" is not one of them, and neither is a test double.

```ts
// The seam is real: there is no IndexedDB on the server.
export abstract class DocumentCache {
  abstract read(id: DocumentId): Promise<Document | null>;
  abstract write(doc: Document): Promise<void>;
}

// Each implementation declares the contract. Nothing else checks it — `ClassProvider` types
// `provide` as `any` and `useClass` as `Type<any>`, so the provider line below would accept
// a class that has drifted.
export class IndexedDbDocumentCache implements DocumentCache { /* ... */ }
export class NoopDocumentCache implements DocumentCache { /* ... */ }

// app.config.ts        → { provide: DocumentCache, useClass: IndexedDbDocumentCache }
// app.config.server.ts → { provide: DocumentCache, useClass: NoopDocumentCache }
```

**Abstract class or `InjectionToken<T>`?** Default to the abstract class: one symbol is both the
type and the token, so `inject(DocumentCache)` is typed with no second declaration to keep in sync.
Reach for `InjectionToken<T>` when the implementations cannot share a base — a plain object, a
factory result, a value — or when the contract has to stay a structural type.

**Every implementation states the contract; how depends on what it is.** A class declares
`implements` or `extends`. A value, object or factory result — which cannot — is anchored the same
way a test fake is: `satisfies T`, or an explicit return type on the factory. Without one of the
two, nothing checks the implementation at all, because `provide` and `useClass`/`useValue`/
`useFactory` are all typed `any`.

**The count rule applies to service and adapter contracts, not to every token.** A configuration
object, a function, a primitive or anything else with no class to inject *needs* an
`InjectionToken` — that is Angular's runtime identifier, not a speculative abstraction. The same
goes for a `multi: true` token, which is plural by design. What the rule bans is a contract wrapped
around a single service you could have injected directly.

**Two implementations need one test suite.** Write the tests against the contract and run them
against both. Substitutability asserted only in the type system is not asserted at all — the
compiler checks signatures, and every bug worth having here is in the behaviour behind them.

**Audit:** Flag an `interface` or `abstract class` introduced as a DI contract with a single
implementation. Flag a constructor parameter or `inject()` call whose type is a TypeScript
interface. Flag an `InjectionToken` created for something that could be injected as its own class —
not one standing in for a value, a function or a `multi` collection. Flag a class implementation of
a DI contract that does not declare `implements`/`extends`, and a non-class one with neither
`satisfies T` nor a typed factory return. Flag a second implementation added without a shared suite
exercising both.

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
