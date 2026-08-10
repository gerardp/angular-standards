# Performance

Performance is a longevity problem here, not a tuning exercise. An application that gets 150ms
slower every quarter is indistinguishable from one that was never fast, and by year three nobody can
say which change did it. So the rules below are the ones that hold a budget over a decade — a
threshold the build enforces, a profiler you actually open — not the ones that win a benchmark.

## Where the guidance lives

Angular publishes a performance hub at <https://angular.dev/best-practices/performance>. It is the
authoritative source, and it is **not in the `angular-developer` skill** — that skill has no
performance reference at all. This is the one topic where there is no upstream file to cite, so this
file links `angular.dev` directly.

Half of that hub does not apply to this codebase, because the project already made the decisions it
recommends. Check this table before following one of its guides:

| angular.dev guide | Status here |
| --- | --- |
| Lazy-loaded routes | Already mandatory — [routing.md](routing.md#every-feature-is-lazy) |
| `@defer` blocks | Already mandatory below the fold — [components.md](components.md#deferred-loading) |
| Image optimisation | Already mandatory — [templates-and-styling.md](templates-and-styling.md#images-and-assets) |
| SSR / hydration / incremental hydration | Decided per route — [routing.md](routing.md#rendering-strategies) |
| Zoneless change detection | Already the project default — [longevity.md](longevity.md#banned-apis) |
| Skipping component subtrees | OnPush is the v22 default — [components.md](components.md#shape) |
| **Zone pollution** | **Does not apply.** There is no zone. See [stale advice](#stale-advice) |
| **Lazy loading services** | **Read it** — and the house rule [below](#lazy-load-heavy-services) |
| **Slow computations** | **Read it with the correction [below](#slow-computations)** |
| **Chrome DevTools profiling** | **Read it** — [below](#measure-before-you-change-anything) |

## Measure before you change anything

Every optimisation below is a cost: a budget to maintain, an API to keep current, a carve-out from
another rule. Pay it where a profiler said to, never where a blog post said to.

Angular's runtime feeds the Chrome DevTools performance panel directly. Enable it in development:

```ts
// main.ts
import { enableProfiling } from '@angular/core';

enableProfiling();          // development only — has no effect in a production build
bootstrapApplication(App, appConfig);
```

Or `ng.enableProfiling()` in the console of a running dev build, which needs no code change and is
the usual way. Record in the Performance panel and Angular's own entries appear on their own track,
colour-coded: blue for TypeScript (services, lifecycle hooks), purple for compiled template code,
green for the reason the work was scheduled. That last one is the point — it tells you *what
triggered* a change-detection cycle, which is the question you actually have.

Angular DevTools remains the tool for the component tree and the injector graph. Chrome DevTools is
the one for "why is this slow".

**Audit:** Flag a performance-motivated change with no profile, no measurement, and no budget
failure behind it. "This should be faster" is not a reason to add a carve-out to a standard.

## Budgets: the only rule here the build can enforce

Everything else in this file relies on someone noticing. A budget does not.

```jsonc
// angular.json — architect.build.configurations.production
"budgets": [
  { "type": "initial", "maximumWarning": "300kB", "maximumError": "500kB" },
  { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
]
```

The `initial` budget is the backstop for [routing.md](routing.md#every-feature-is-lazy), and it is
worth being exact about what it does. It fails when the bootstrap payload crosses `maximumError` —
so it catches the eager import of anything substantial, but a small feature slips in underneath and
no budget knows the rule it is standing in for. "No feature is eagerly imported into
`app.routes.ts`" remains a review-time check; `eslint.config.js` enforces layer direction, not
eager routes.

Set the error threshold just above the current real size. The tighter it is, the smaller the
regression it catches — a budget left at a round number twice the current build is decoration.

Add a named `bundle` budget for any lazy chunk that has a reason to stay small.

**Raising a budget to make a build pass is the anti-pattern.** Shrink the artefact that failed, and
which artefact that is depends on the budget type — they measure different things:

| Failing budget | Measures | Fix |
| --- | --- | --- |
| `initial` | JS + CSS needed to bootstrap | A feature crept into the eager graph — restore `loadComponent`/`loadChildren` |
| `bundle` (named) | One named chunk | `@defer` the below-the-fold parts, `injectAsync` a heavy service, split the route |
| `allScript` | Every script added together | Splitting will not help — it moves code, it does not remove it. Delete code, drop or replace a dependency, or fix what is defeating tree-shaking |
| `all` | The whole application — scripts, styles and assets | Read the metafile before acting: an `all` failure is as often an unoptimised asset or a bloated stylesheet as it is JavaScript |
| `anyComponentStyle` | **One component's stylesheet, on its own** | Not a bundling problem. Move the CSS to Tailwind utilities, or the component is doing too much and should be split — [templates-and-styling.md](templates-and-styling.md#when-utilities-are-not-enough), [components.md](components.md#splitting) |

Raising the number is allowed only with an `AGENTS.local.md` entry recording the new figure and why
— same discipline as any other deviation.

**Audit:** Flag a production build config with no `budgets` array. Flag any PR that raises a budget
threshold without a corresponding `AGENTS.local.md` entry.

### Reading the bundle

The build system is esbuild, so the analysis story is esbuild's:

```bash
ng build --stats-json          # writes an esbuild metafile to the output directory
```

Upload it to <https://esbuild.github.io/analyze/>. Do not reach for `webpack-bundle-analyzer` or
`source-map-explorer` — they belong to the webpack builder this project does not use.

## Lazy-load heavy services

`@defer` splits templates and `loadComponent` splits routes, but a service injected by a component
is in that component's chunk whether or not the user ever triggers it. A PDF exporter, a CSV
generator, a charting adapter — all paid for on navigation, all typically used by a minority of
visits.

`injectAsync()` (stable since v22.0) is the service-layer equivalent.

**It belongs in the feature service, not the component.** A dynamic `import()` is module loading,
not data I/O — it does not engage [architecture.md](architecture.md#the-one-rule), the same way
`loadComponent` and `@defer` do not. But resolving the injector is *sequencing*, and a chunk fetch
can fail on a flaky network or after a deploy has invalidated the old hash. Both belong behind a
service method, per [components.md](components.md#thin-handlers).

```ts
// features/invoices/invoice-detail/invoice-exporter.ts
import { Injectable } from '@angular/core';

// The lazily-loaded service must provide itself — injectAsync has no providers array to consult.
// Feature-specific *and* root-provided is normally a finding; stateless collaborators loaded this
// way are the documented exception — routing.md#the-one-exception-services-loaded-with-injectasync
@Injectable({ providedIn: 'root' })
export class InvoiceExporter {
  async export(id: InvoiceId): Promise<void> { /* pdf generation, heavy imports */ }
}
```

```ts
// features/invoices/invoice-detail/invoice-detail-service.ts
import { ErrorHandler, Injectable, inject, injectAsync, onIdle, signal } from '@angular/core';

@Injectable()
export class InvoiceDetailService {
  private readonly errors = inject(ErrorHandler);

  private readonly exporter = injectAsync(
    () => import('./invoice-exporter').then((m) => m.InvoiceExporter),
    { prefetch: onIdle },
  );

  private readonly _exportError = signal<string | null>(null);
  readonly exportError = this._exportError.asReadonly();

  async exportPdf(id: InvoiceId): Promise<void> {
    this._exportError.set(null);
    try {
      const exporter = await this.exporter();   // resolves the chunk, then delegates
      await exporter.export(id);
    } catch (error) {
      // A chunk fetch fails on a flaky network, or after a deploy invalidated the old hash.
      this.errors.handleError(error);
      this._exportError.set('Could not export this invoice. Try again.');
    }
  }
}
```

```ts
// the component stays as thin as any other handler, and renders exportError()
protected exportPdf(): void {
  void this.invoices.exportPdf(this.invoiceId());
}
```

The `void` is only safe because `exportPdf` cannot reject — the service catches, reports, and
surfaces the failure as a signal the template renders. A `void` in front of a method that can reject
is an unhandled rejection with punctuation in front of it.

Three things about this:

- **The lazily-loaded service must be auto-provisioned** — `@Injectable({ providedIn: 'root' })` on
  `InvoiceExporter`, the token `injectAsync` resolves. This is the easy mistake: the requirement is
  on the *loaded* service, not on the service holding the injector (`InvoiceDetailService` here is
  route-provided, which is fine). A target that is provided manually cannot be lazy-loaded this way,
  and you get a `NullInjectorError` at the moment the user clicks — not at build time. v22 also
  ships `@Service()` as a shorthand for the same thing, but **this project has not adopted it**: the
  decorator is new, the codebase is consistent on `@Injectable()`, and a codebase that mixes both is
  worse than one that picks either. Revisit at v23/v24, once its adoption pattern has settled.
- **`prefetch` is opportunistic.** `onIdle` warms the chunk when the browser is idle; calling the
  injector before that resolves simply loads it immediately. Custom triggers implement
  `PrefetchTrigger` — a function returning a promise — which is how you get `on hover` parity with
  `@defer (prefetch on hover)`.
- **Failure is a real case.** A chunk fetch can reject. Handle it where the service handles every
  other failure — never let a rejected injector surface as an unhandled promise.

This is worth doing for a genuinely heavy, genuinely optional dependency. It is not worth doing for
an ordinary feature service — you would be adding a promise to every call site to save two
kilobytes.

**Audit:** Flag a component that eagerly injects a service whose only consumer is one rarely-used
handler, where that service pulls in a large third-party dependency.

## Slow computations

Angular's guide on this is correct about the diagnosis and dated about the cure. It recommends
caching heavy work in a **pure pipe**. In this codebase the answer is `computed()`:

```ts
// The guide's answer: move `summarise()` into a pure pipe, memoised on its last input,
// and call it from the template as `invoices | summarise`.

// The answer here
protected readonly summary = computed(() => summarise(this.invoices()));
```

`computed()` is already lazy and memoised, it recomputes only when a dependency actually changes,
and it does not require the value to travel through a template binding to be cached. A pure pipe was
the zone-era way to memoise; with signals it is a second mechanism doing the same job with worse
ergonomics. Pipes remain right for *formatting* — see
[core-engineering.md](core-engineering.md#internationalisation-readiness) on `DatePipe` and friends.

The guide's first recommendation is the one that still holds and is still the best one: **fix the
algorithm**. A `computed()` wrapped around an O(n²) loop is a faster way to be slow.

**Audit:** Flag a pure pipe whose purpose is caching a computation rather than formatting a value.

## Long lists

`@for` with `track` renders every row. Past a few hundred rows that is the dominant cost, and no
amount of `track` discipline fixes it — the DOM nodes exist. Use CDK virtual scrolling, which
renders only what fits on screen:

```ts
imports: [CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll, CdkVirtualForOf],
```

```html
<cdk-virtual-scroll-viewport itemSize="48" class="h-[600px]">
  <app-invoice-row *cdkVirtualFor="let invoice of invoices(); trackBy: trackId" [invoice]="invoice" />
</cdk-virtual-scroll-viewport>
```

`@angular/cdk` is already an adopted dependency (a Spartan peer, maintained by the Angular team), so
this adds nothing to `package.json` and needs no dependency justification —
[longevity.md](longevity.md#standing-decisions).

**Two deliberate carve-outs, and they apply only inside a viewport:**

1. `*cdkVirtualFor` is a structural directive, which
   [templates-and-styling.md](templates-and-styling.md#templates) otherwise bans. There is no block
   syntax for it. The ban exists to keep `*ngIf`/`*ngFor` out of the codebase; this is not that.
2. It takes `trackBy`, not `track`. Always pass one. CDK diffs on object identity by default and
   recycles its view containers, so this is not catastrophic — filtering or reordering an existing
   array keeps the same element references and updates cheaply. The case that costs you is a
   **refetch**: `httpResource` re-running produces freshly parsed objects, so every row is a new
   reference and identity diffing reports the whole visible range as replaced. A stable id does not
   make that free — CDK still writes the new object into each existing view's context and Angular
   re-evaluates the bindings — but it removes the structural churn and keeps the row instances
   alive, which is where the cost and the lost DOM state actually are.

Prefer a fixed `itemSize` where the design allows it: fixed-size strategy never measures a row, and
measurement is most of the cost of the alternative.

**Audit:** Flag a `@for` rendering an unbounded collection — anything backed by a paginated or
user-filtered endpoint with no page size cap. Flag `*cdkVirtualFor` without `trackBy`.

## Web workers

For computation that blocks the frame — large parses, crypto, spreadsheet-scale aggregation — move
it off the main thread. Generate with the CLI so the build configuration is written for you:

```bash
ng generate web-worker invoice-aggregator
```

Wrap the worker in a service and expose a promise or a signal; no component ever touches
`postMessage` directly. Under SSR there is no worker — `@angular/platform-server` does not support
them — so any worker-backed path needs a synchronous fallback or must be guarded to the browser.

This is a genuine last resort. Reach for it after the profiler shows a long task and after the
algorithm has been fixed, not before.

## Stale advice

Angular performance content published before v20 assumes a zone-based, decorator-based application.
This codebase is neither, and the most-cited advice is now actively wrong here. Both the framework's
older guides and essentially every third-party listicle carry it.

| Advice you will find | Why it is wrong here |
| --- | --- |
| `NgZone.runOutsideAngular()`, "avoid zone pollution" | Zoneless: there is no zone to escape from |
| `ChangeDetectorRef.detectChanges()` / `markForCheck()` / `detach()` | Signals schedule their own updates. Reaching for manual CD means some state is not in a signal — fix that instead |
| Add `changeDetection: ChangeDetectionStrategy.OnPush` | OnPush is the v22 default. The line is noise; `Eager` and the `Default` it supersedes are banned — [longevity.md](longevity.md#eager-arrives-by-migration-not-by-hand) |
| `trackBy` function with `*ngFor` | `@for … track` (the one exception is `*cdkVirtualFor`, above) |
| Cache a heavy computation in a pure pipe | `computed()` |
| `*ngIf="user$ \| async as user"` | Banned. Use `toSignal()` or `httpResource` in a service |
| `PreloadAllModules` | Eager loading with extra steps — [routing.md](routing.md#preloading) |
| `loadChildren` returning an `NgModule` | `loadChildren` returning a routes array |
| `webpack-bundle-analyzer`, `--stats-json` → webpack stats | esbuild metafile → <https://esbuild.github.io/analyze/> |
| "Angular Universal", `provideClientHydration()` from Universal | `@angular/ssr` |
| `@Pipe({ pure: true })` | `pure` is the default; writing it is noise |

The pattern is worth naming, because it will recur for the next decade: **performance advice ages
faster than any other kind.** It is written against a specific change-detection model, and Angular
has now replaced that model twice. When you find a performance tip, check its date and check which
model it assumes before you check whether it works.

**Audit:** Flag any import of `NgZone`, any `ChangeDetectorRef` injection, and any
`changeDetection:` line in a `@Component`.
