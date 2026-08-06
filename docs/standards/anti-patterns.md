# Anti-patterns

The consolidated checklist. Every entry is a shorthand for a rule stated in full elsewhere — this
file is for scanning, not for learning. The linked file is authoritative.

Ordered by how expensive each one is to unwind later.

## Blocking — fix before merge

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 1 | Component performs I/O (`HttpClient`, `httpResource`, SDK call) | Call a service or store method | [architecture](architecture.md#the-one-rule) |
| 2 | Feature imports from another feature | Move the shared thing down a layer | [architecture](architecture.md#dependency-direction) |
| 3 | A deprecated/banned API (`*ngIf`, `@angular/animations`, `NgModule`, `@Input()`, Zone.js…) | The modern equivalent | [longevity](longevity.md#banned-apis) |
| 4 | Auth token in `localStorage`/`sessionStorage` | `httpOnly` cookie or in-memory signal | [security](security.md#token-storage) |
| 5 | `bypassSecurityTrust*` or `[innerHTML]` in feature code | Sanitise once at the boundary in `core/` | [security](security.md#xss) |
| 6 | Permission enforced only by a guard or hidden UI | Server-side check; the guard is UX | [security](security.md#the-rule-that-governs-the-rest) |
| 7 | Secret in `environment.ts` or anywhere under `src/` | Server-side, behind an endpoint | [security](security.md#secrets) |
| 8 | `effect()` that writes a signal or triggers a fetch | `computed()`, `linkedSignal()`, or `httpResource` | [reactivity](reactivity-and-state.md#effect-is-a-last-resort) |
| 9 | `any`, or `as` used to silence the compiler on external data | `unknown` + runtime validation | [core-engineering](core-engineering.md#types) |
| 10 | New dependency without the four-question justification | Answer them, or do without | [longevity](longevity.md#3-dependency-policy) |

## Correctness

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 11 | Mutating a signal's value in place (`.push`, property assignment) | `.update()` with a new reference | [reactivity](reactivity-and-state.md#the-three-signal-rules) |
| 12 | Derived value stored in a `signal` and kept in sync manually | `computed()` | [reactivity](reactivity-and-state.md#the-three-signal-rules) |
| 13 | `.subscribe()` in a component | `toSignal()`, or a resource | [reactivity](reactivity-and-state.md#rxjs) |
| 14 | `subscribe()` without `takeUntilDestroyed()` | Add it — this is a memory leak | [reactivity](reactivity-and-state.md#rxjs) |
| 15 | `@for` without `track`, or `track $index` on a mutable list | Track a stable id | [components](components.md#templates) |
| 16 | `mergeMap` for a submit action | `exhaustMap` — prevents double-submit | [reactivity](reactivity-and-state.md#rxjs) |
| 17 | `undefined` or an optional property in a Signal Forms model | `''`, `0`, `[]`, `false`; `null` only on leaves whose control accepts it | [forms](forms.md#rules) |
| 18 | Reading `.touched()` off a `FormField` instead of a `FieldState` | Call the field first: `form.email().touched()` | [forms](forms.md#rules) |
| 19 | `window`/`document`/`localStorage` at render time | Guard with `afterNextRender()` | [routing](routing.md#rendering-strategies) |
| 20 | DTO type or ISO date string leaking out of `data-access/` | Map to the domain model at the boundary | [data-access](data-access.md#map-dtos-at-the-boundary) |
| 21 | Money as a float or a formatted string | Integer minor units | [data-access](data-access.md#map-dtos-at-the-boundary) |
| 22 | Each 401 triggering its own token refresh | One shared in-flight refresh | [security](security.md#token-refresh) |
| 22b | `finalize` placed *after* `shareReplay` in a shared request | Put `finalize` upstream — otherwise one unsubscribe clears the cache mid-flight | [security](security.md#token-refresh) |

## Structure

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 23 | Root-provided service holding state one screen reads | Feature store provided on the route | [reactivity](reactivity-and-state.md#state-ownership) |
| 24 | Component in `ui/` that injects something | Move it into the feature, or remove the dependency | [components](components.md#presentational-components-ui) |
| 25 | API service holding state or loading flags | Transport and mapping only | [data-access](data-access.md#one-service-per-backend-area) |
| 26 | `HttpClient.get` re-run manually when a signal changes | `httpResource` with a reactive request | [data-access](data-access.md#reads-use-httpresource-mutations-use-httpclient) |
| 27 | `httpResource` used for a mutation | `HttpClient` — mutations are not reactive reads | [data-access](data-access.md#reads-use-httpresource-mutations-use-httpclient) |
| 28 | Event handler with `try/catch`, loading flags, sequencing | Move it into the service or store | [components](components.md#thin-handlers) |
| 29 | Feature eagerly imported in `app.routes.ts` | `loadChildren` / `loadComponent` | [routing](routing.md#every-feature-is-lazy) |
| 30 | `inject(ActivatedRoute)` to read a param | `withComponentInputBinding()` + `input.required()` | [routing](routing.md#route-params-are-signal-inputs) |
| 31 | Logic in a template expression | A `computed()` | [components](components.md#templates) |
| 32 | Component promoted to `ui/` with one consumer | Colocate until there is a second | [architecture](architecture.md#where-does-this-file-go) |

## Styling

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 33 | Raw palette colour (`bg-slate-900`, hex, `rgb()`) | Semantic token (`bg-background`) | [styling](templates-and-styling.md#utilities-first-semantic-tokens-always) |
| 34 | Utilities overriding a helm component at the call site | Add a variant to the helm CVA config | [spartan](spartan-ui.md#usage) |
| 35 | Hand-rolled dropdown/modal/tabs/combobox | A Spartan brain primitive | [spartan](spartan-ui.md#composite-widgets-use-brain) |
| 36 | `@apply` to "tidy" a long class list | A component | [styling](templates-and-styling.md#long-class-lists) |
| 37 | `::ng-deep` or `!important` | Restructure; style the component that owns the element | [styling](templates-and-styling.md#when-utilities-are-not-enough) |
| 38 | Physical direction utilities (`ml-*`, `text-left`) | Logical (`ms-*`, `text-start`) | [styling](templates-and-styling.md#layout) |
| 39 | Animating `width`/`height`/`top`/`left` | `transform` and `opacity` | [styling](templates-and-styling.md#motion) |
| 40 | No `prefers-reduced-motion` handling | Add the global reduce block | [styling](templates-and-styling.md#motion) |
| 41 | `tailwind.config.js` in a v4 project | CSS-first config in `styles.css` | [styling](templates-and-styling.md#tailwind-v4-configuration) |
| 42 | Helm component edited without an `AGENTS.local.md` entry | Record it, or the next regen reverts it | [spartan](spartan-ui.md#editing-helm-components) |

## Tests

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 43 | `fakeAsync`/`tick`/`setTimeout` for sequencing | `await fixture.whenStable()` | [testing](testing.md#zoneless-testing) |
| 44 | Asserting private members or signal internals | Assert user-visible behaviour | [testing](testing.md#test-behaviour-not-implementation) |
| 45 | Module-level mutable state shared across tests | Set it up inside `beforeEach` | [testing](testing.md#hygiene) |
| 46 | Flaky test retried until green | Fix it or delete it | [testing](testing.md#ci-gate) |
| 47 | Auto-mock instead of a typed fake | A fake implementing the real interface | [testing](testing.md#dependency-substitution) |

## Accessibility

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 48 | `(click)` on a `<div>` or `<span>` | A real `<button>` | [components](components.md#accessibility) |
| 49 | Input without an associated label | `<label for>` | [forms](forms.md#accessibility) |
| 50 | `outline: none` with no replacement | A visible focus style | [core-engineering](core-engineering.md#accessibility-baseline) |
| 51 | State conveyed by colour alone | Add text or an icon | [core-engineering](core-engineering.md#accessibility-baseline) |
| 52 | Concatenated user-facing sentence | One parameterised message | [core-engineering](core-engineering.md#internationalisation-readiness) |

## Process

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 53 | Angular major sitting past its active window | Upgrade within 9 months of release; never enter LTS | [longevity](longevity.md#2-upgrade-on-a-schedule-not-on-demand) |
| 54 | `tsconfig` strictness flag weakened | Restore it, or record it in `AGENTS.local.md` | [core-engineering](core-engineering.md#typescript-configuration) |
| 55 | Deviation from a standard with no `AGENTS.local.md` entry | Record it with a removal condition | `AGENTS.local.md` |
| 56 | Vendored skill in `.agents/skills/` edited by hand | Edit `docs/standards/`; skills are re-synced | [AGENTS.md](../../AGENTS.md) |
| 57 | Commented-out code | Delete it; git remembers | [core-engineering](core-engineering.md#comments) |
