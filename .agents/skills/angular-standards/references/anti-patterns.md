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
| 23 | `finalize` placed *after* `shareReplay` in a shared request | Put `finalize` upstream — otherwise one unsubscribe clears the cache mid-flight | [security](security.md#token-refresh) |

## Structure

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 24 | Root-provided service holding state one screen reads | Feature store provided on the route | [reactivity](reactivity-and-state.md#state-ownership) |
| 25 | Component in `ui/` that injects something | Move it into the feature, or remove the dependency | [components](components.md#presentational-components-ui) |
| 26 | API service holding state or loading flags | Transport and mapping only | [data-access](data-access.md#one-service-per-backend-area) |
| 27 | `HttpClient.get` re-run manually when a signal changes | `httpResource` with a reactive request | [data-access](data-access.md#reads-use-httpresource-mutations-use-httpclient) |
| 28 | `httpResource` used for a mutation | `HttpClient` — mutations are not reactive reads | [data-access](data-access.md#reads-use-httpresource-mutations-use-httpclient) |
| 29 | Event handler with `try/catch`, loading flags, sequencing | Move it into the service or store | [components](components.md#thin-handlers) |
| 30 | Feature eagerly imported in `app.routes.ts` | `loadChildren` / `loadComponent` | [routing](routing.md#every-feature-is-lazy) |
| 31 | `inject(ActivatedRoute)` to read a param | `withComponentInputBinding()` + `input.required()` | [routing](routing.md#route-params-are-signal-inputs) |
| 32 | Logic in a template expression | A `computed()` | [components](components.md#templates) |
| 33 | Component or pure helper promoted to `ui/`/`util/` with one consumer | Colocate until there is a second | [architecture](architecture.md#where-does-this-file-go) |
| 34 | Indirection justified only by future reuse (generic helper, base class, pass-through layer) at one call site — *not* a required layer boundary | Write it inline; extract on the second call site | [core-engineering](core-engineering.md#before-you-write-it) |

## Styling

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 35 | Raw palette colour (`bg-slate-900`, hex, `rgb()`) | Semantic token (`bg-background`) | [styling](templates-and-styling.md#utilities-first-semantic-tokens-always) |
| 36 | Utilities overriding a helm component at the call site | Add a variant to the helm CVA config | [spartan](spartan-ui.md#usage) |
| 37 | Hand-rolled dropdown/modal/tabs/combobox | A Spartan brain primitive | [spartan](spartan-ui.md#composite-widgets-use-brain) |
| 38 | `@apply` to "tidy" a long class list | A component | [styling](templates-and-styling.md#long-class-lists) |
| 39 | `::ng-deep` or `!important` | Restructure; style the component that owns the element | [styling](templates-and-styling.md#when-utilities-are-not-enough) |
| 40 | Physical direction utilities (`ml-*`, `text-left`) | Logical (`ms-*`, `text-start`) | [styling](templates-and-styling.md#layout) |
| 41 | Animating `width`/`height`/`top`/`left` | `transform` and `opacity` | [styling](templates-and-styling.md#motion) |
| 42 | No `prefers-reduced-motion` handling | Add the global reduce block | [styling](templates-and-styling.md#motion) |
| 43 | `tailwind.config.js` in a v4 project | CSS-first config in `styles.css` | [styling](templates-and-styling.md#tailwind-v4-configuration) |
| 44 | Helm component edited without an `AGENTS.local.md` entry | Record it, or the next regen reverts it | [spartan](spartan-ui.md#editing-helm-components) |

## Tests

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 45 | Behaviour change or bug fix without a corresponding test | Add the smallest behavioural or regression test | [testing](testing.md#tests-are-part-of-the-change) |
| 46 | `fakeAsync`/`tick`/`setTimeout` for sequencing | `await fixture.whenStable()` | [testing](testing.md#zoneless-testing) |
| 47 | Asserting private members or signal internals | Assert user-visible behaviour | [testing](testing.md#test-behaviour-not-implementation) |
| 48 | Module-level mutable state shared across tests | Set it up inside `beforeEach` | [testing](testing.md#hygiene) |
| 49 | Flaky test retried until green | Fix it or delete it | [testing](testing.md#ci-gate) |
| 50 | Auto-mock instead of a typed fake | A fake implementing the real interface | [testing](testing.md#dependency-substitution) |

## Accessibility

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 51 | `(click)` on a `<div>` or `<span>` | A real `<button>` | [components](components.md#accessibility) |
| 52 | Input without an associated label | `<label for>` | [forms](forms.md#accessibility) |
| 53 | `outline: none` with no replacement | A visible focus style | [core-engineering](core-engineering.md#accessibility-baseline) |
| 54 | State conveyed by colour alone | Add text or an icon | [core-engineering](core-engineering.md#accessibility-baseline) |
| 55 | Concatenated user-facing sentence | One parameterised message | [core-engineering](core-engineering.md#internationalisation-readiness) |

## Performance

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 56 | No `budgets` in the production build config, or a budget raised to make a build pass | Set it; shrink the artefact that failed — the fix differs per budget type | [performance](performance.md#budgets-the-only-rule-here-the-build-can-enforce) |
| 57 | `NgZone` / `runOutsideAngular()` / any zone-based optimisation | Nothing — the app is zoneless, there is no zone | [performance](performance.md#stale-advice) |
| 58 | `ChangeDetectorRef` injected, or a `changeDetection:` line on a component | Put the state in a signal; OnPush is the v22 default | [performance](performance.md#stale-advice) |
| 59 | Heavy computation cached in a pure pipe | `computed()` — already lazy and memoised | [performance](performance.md#slow-computations) |
| 60 | `@for` over an unbounded list; `*cdkVirtualFor` without `trackBy` | Virtual scrolling, with a track function | [performance](performance.md#long-lists) |

## Process

| # | Anti-pattern | Instead | Rule |
| --- | --- | --- | --- |
| 61 | Angular major sitting past its active window | Upgrade within 9 months of release; never enter LTS | [longevity](longevity.md#2-upgrade-on-a-schedule-not-on-demand) |
| 62 | `tsconfig` strictness flag weakened | Restore it, or record it in `AGENTS.local.md` | [core-engineering](core-engineering.md#typescript-configuration) |
| 63 | Deviation from a standard with no `AGENTS.local.md` entry | Record it with a removal condition | `AGENTS.local.md` |
| 64 | Upstream skill (`angular-developer`, `spartan`) edited by hand | Edit this skill's `references/`; upstream skills are re-synced | [SKILL.md](../SKILL.md) |
| 65 | Commented-out code | Delete it; git remembers | [core-engineering](core-engineering.md#comments) |
