# Reactivity and state

Signals are the reactivity model. RxJS is a tool for genuinely stream-shaped problems, not the
default.

Framework detail: `.agents/skills/angular-developer/references/signals-overview.md`,
`linked-signal.md`, `resource.md`, `effects.md`.

## Decision table

Find your need, use that tool. Do not improvise.

| Need | Use | Notes |
| --- | --- | --- |
| Local writable state | `signal()` | `.set()` / `.update()`. `.mutate()` does not exist. |
| Derived value | `computed()` | Pure, lazy, memoised. Never store what you can derive. |
| Writable state that resets when a source changes | `linkedSignal()` | Replaces the "effect that resets state" anti-pattern entirely. |
| Read data from the server | `httpResource()` in a service | See [data-access.md](data-access.md). |
| Async work that is not an HTTP read | `resource()` | |
| Component input | `input()` / `input.required()` | |
| Two-way binding | `model()` | |
| Component output | `output()` | |
| Element/component reference | `viewChild()` / `contentChild()` | |
| Read a signal without subscribing to it | `untracked()` | Deliberate escape hatch; comment why. |
| Observable → signal | `toSignal(obs, { initialValue })` | Always supply `initialValue`. |
| Signal → Observable | `toObservable()` | Only when feeding an RxJS pipeline. |
| Run code after render | `afterNextRender()` / `afterRenderEffect()` | For DOM measurement and third-party widgets. |
| Sync to a non-signal API | `effect()` | **Last resort.** See below. |

## The three signal rules

**1. Never mutate, always replace.**

```ts
// Wrong — signal never notifies, and in zoneless nothing re-renders
this.items().push(item);

// Right
this.items.update((items) => [...items, item]);
```

Same for objects: `this.user.update((u) => ({ ...u, name }))`.

**2. Never store what you can derive.** A field that can be computed from other state will
eventually go stale. Totals, filtered lists, "is valid", "has selection" — all `computed`.

```ts
// Wrong
readonly total = signal(0);   // must be kept in sync forever

// Right
readonly total = computed(() => this.items().reduce((n, i) => n + i.price, 0));
```

**3. Keep state flat.** Deeply nested state objects make every update a spread cascade. Prefer
several signals, or normalise by id, over one deep tree.

## `effect()` is a last resort

`effect()` exists to push values into systems that do not understand signals. That is all.

**Legitimate:** analytics events, `localStorage` writes, canvas drawing, syncing to a non-Angular
third-party library, logging.

**Banned:**

- Writing to another signal to keep two pieces of state in sync → use `computed()` or
  `linkedSignal()`.
- Triggering a fetch when an input changes → use `httpResource()` with a reactive request, which
  handles cancellation for you.
- Anything the template could derive itself.

The upstream skill puts this bluntly and it is worth repeating: *if you are calling `.set()` on a
signal inside an `effect()`, you are making a mistake.* It produces infinite loops, ordering bugs,
and state whose origin cannot be traced by reading the code.

**Audit:** Flag every `effect()`. Each one must have a comment naming the non-signal system it is
syncing to. Flag any `effect()` containing `.set(`, `.update(`, or an HTTP call.

## State ownership

Ask "who else reads this?" and place state at the narrowest scope that answers it:

| Read by | Lives in |
| --- | --- |
| One component | A `signal` in that component |
| One component and its children | A `signal` in the parent, passed via `input()` |
| One feature, several components | A feature service/store, provided on the feature route |
| The whole app | A `providedIn: 'root'` service in `core/` |

**Push state down, not up.** The common failure mode is a root-level service accumulating fields
that only one screen reads. That service becomes the app's shared mutable global and the thing
nobody dares change in year three.

**Audit:** For each field on a root-provided service, ask whether more than one feature reads it.
If not, flag it for relocation.

## When to add a store

**Default: no store.** A data-access service exposing `httpResource` signals plus component-local
signals covers most screens. This is the framework's own model, has no third-party dependency, and
is the cheapest thing to maintain for a decade.

Add a **feature store** — a plain service with signals, provided on the feature's route — when
**two or more** of these are true:

1. Three or more components in the feature read or write the same state.
2. There is a multi-step flow with meaningful intermediate state (wizard, multi-stage dialog).
3. There are mutations with optimistic updates or rollback.
4. There is orchestration between two or more data-access services.
5. There is polling, debouncing, retry, or explicit cancellation.

A feature store is just this — no library required:

```ts
@Injectable()
export class InvoicesStore {
  private readonly api = inject(InvoiceApiService);

  private readonly _filter = signal<InvoiceFilter>({ status: 'all' });
  private readonly _selectedId = signal<InvoiceId | null>(null);

  readonly filter = this._filter.asReadonly();
  private readonly invoicesResource = this.api.invoices(this._filter);

  readonly invoices = computed(() => this.invoicesResource.value() ?? []);
  readonly isLoading = this.invoicesResource.isLoading;
  readonly error = this.invoicesResource.error;
  readonly selected = computed(() =>
    this.invoices().find((i) => i.id === this._selectedId()) ?? null,
  );

  setFilter(filter: InvoiceFilter): void {
    this._filter.set(filter);   // resource re-fetches, previous request is cancelled
  }
}
```

Provided on the route, so its lifetime matches the feature:

```ts
// invoices.routes.ts
export const routes: Routes = [
  { path: '', providers: [InvoicesStore], loadComponent: () => import('./invoice-list') },
];
```

Note the shape: private writable signals, public readonly ones, mutations only through methods.
That encapsulation is the point, and it does not require a library.

### Adopting a state library

Only consider `@ngrx/signals` when the plain-service store above is genuinely insufficient —
realistically, when you need cross-feature entity normalisation or time-travel debugging across
many stores.

If you adopt one:

- Record the decision, the date, and the triggering requirement in `AGENTS.local.md`.
- Apply it to one feature first. Never rewrite the app for it.
- Answer the four dependency questions in [longevity.md](longevity.md#3-dependency-policy) first.
- Note that helpers like `withCallState` and `withDevtools` are **not** in `@ngrx/signals` core —
  they come from `@angular-architects/ngrx-toolkit`, which is a second dependency with its own
  upgrade cadence. Count both.

The component-facing shape does not change when you adopt a store — call a method, read signals —
which is precisely why deferring this decision is safe.

## RxJS

RxJS is not banned; it is scoped. Use it where the problem is genuinely a stream over time:

- Debounced search input
- WebSocket / SSE streams
- Complex cancellation and sequencing

Rules when you do:

- RxJS lives in services, never in components.
- Never `.subscribe()` in a component. Convert with `toSignal()`, or let a `resource` handle it.
- If you must subscribe in a service, use `takeUntilDestroyed()`.
- Choose the flattening operator by meaning: `switchMap` (cancel the previous — typeahead),
  `exhaustMap` (ignore while one is running — submit buttons), `concatMap` (queue, order matters),
  `mergeMap` (fully concurrent — rare, and rarely what you meant).

`exhaustMap` on form submission is the standard fix for double-submit. Use it.

**Audit:** Flag `.subscribe(` anywhere under `src/app/features/` or `src/app/ui/`. Flag any
subscribe without `takeUntilDestroyed()`.
