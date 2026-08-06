# Routing

The route tree is the application's skeleton. It determines what loads when, where features begin
and end, and where state is scoped.

Framework detail: `.agents/skills/angular-developer/references/define-routes.md`,
`loading-strategies.md`, `route-guards.md`, `rendering-strategies.md`.

## Configuration

Functional and standalone throughout. `RouterModule` is banned.

```ts
// app.config.ts
provideRouter(
  routes,
  withComponentInputBinding(),   // route params arrive as signal inputs
  withViewTransitions(),         // native View Transitions API
  withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
)
```

## Every feature is lazy

```ts
// app.routes.ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  { path: 'invoices', loadChildren: () => import('./features/invoices/invoices.routes').then((m) => m.routes) },
  { path: '**', loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound) },
];
```

No feature is eagerly imported into `app.routes.ts`. The initial bundle contains the shell and
nothing else. This is not a performance micro-optimisation — it is what keeps the app's startup
cost flat as it grows over ten years.

**Audit:** Flag any static import of a feature component in `app.routes.ts` or `app.config.ts`.

## Route params are signal inputs

With `withComponentInputBinding()`, params bind straight to `input()`. Never inject
`ActivatedRoute` to read a param.

```ts
// route: { path: ':invoiceId', providers: [InvoiceDetailService], loadComponent: ... }

export class InvoiceDetail {
  readonly invoiceId = input.required<string>();   // bound from the URL

  private readonly invoices = inject(InvoiceDetailService);

  // The route signal is passed straight through; the resource tracks it.
  protected readonly invoice = this.invoices.byId(this.invoiceId);
}
```

```ts
// features/invoices/invoice-detail-service.ts
@Injectable()
export class InvoiceDetailService {
  private readonly api = inject(InvoiceApiService);

  /** Tracks `rawId`: re-fetches on navigation and cancels the superseded request. */
  byId(rawId: Signal<string>) {
    // A URL segment is untrusted input. Validate and brand it before it reaches the API,
    // and return null for a malformed id so the resource simply does not fetch.
    const id = computed(() => toInvoiceId(rawId()));   // string -> InvoiceId | null
    return this.api.invoice(id);
  }
}
```

Note the `computed`: the route param arrives as a plain `string`, and `InvoiceApiService.invoice()`
takes `Signal<InvoiceId | null>`. Branded ids are not assignable from `string`, which is the point —
the conversion has to be explicit, and it is the natural place to validate. `toInvoiceId` lives in
`data-access/` next to the model, and returns `null` for anything malformed, which the resource
already treats as "do not fetch". See
[data-access.md](data-access.md#validate-what-the-server-sends).

The component injects a **feature service**, never `InvoiceApiService`. Injecting the API service
directly would violate [architecture.md](architecture.md#the-one-rule) and is blocked by
`eslint.config.js`.

That composition — a route param signal feeding an `httpResource` — is the standard detail-page
pattern. It is reactive with no `effect()`, no subscription, and no `ngOnChanges`.

The feature service looks thin here, and at this size it is. It earns its keep the moment there is
derived state, a second call to orchestrate, or a mutation — which is exactly when you would
otherwise have been tempted to put that logic in the component.

**Audit:** Flag `inject(ActivatedRoute)` used to read `params`, `queryParams`, or `data`. It is
legitimate only for navigation-event introspection.

## Guards

Functional guards. Class-based guards are banned.

| Use | For |
| --- | --- |
| `canMatch` | Whether the route **exists** — feature flags, role-based route hiding. Falls through to the next matching route. |
| `canActivate` | Whether this user may proceed **now** — redirect to login. |
| `canDeactivate` | Unsaved-changes confirmation. |

Prefer `canMatch` for anything conditional about a feature's existence: it prevents the chunk from
even downloading, and it lets a fallback route match instead of producing a dead end.

```ts
export const canMatchAdmin: CanMatchFn = () =>
  inject(SessionService).hasRole('admin') || inject(Router).createUrlTree(['/forbidden']);
```

**Guards are UX, not security.** They control what the client renders. Every permission must be
enforced independently by the server — a guard is trivially bypassed by anyone with devtools. See
[security.md](security.md).

## Route-scoped providers

Provide feature state on the route to scope its visibility to that feature. Note that this scopes
**visibility, not lifetime** — see the warning below the example:

```ts
// features/invoices/invoices.routes.ts
export const routes: Routes = [
  {
    path: '',
    providers: [InvoicesStore],
    children: [
      { path: '', loadComponent: () => import('./invoice-list/invoice-list').then((m) => m.InvoiceList) },
      { path: ':invoiceId', loadComponent: () => import('./invoice-detail/invoice-detail').then((m) => m.InvoiceDetail) },
    ],
  },
];
```

This scopes the service to the feature rather than the whole app, and keeps feature state out of
the root injector.

### Route injectors are NOT destroyed on navigation

Do not assume route-scoped means short-lived. Angular's documented default:

> By default, route injectors and their services persist even after navigating away from the
> route. They are not destroyed until the application is closed.

So a route provider gives you **scoping, not cleanup**. State survives navigating away and coming
back, which is sometimes what you want and sometimes a stale-data bug.

Consequences to design for:

- **Never rely on navigation to reset state.** If a screen must start clean, reset it explicitly —
  on init, or by keying the state to the route param so a new id produces new state.
- **Prefer deriving from the route param** over storing a copy. A resource that tracks the id
  signal is self-correcting; a field you `set()` on entry is not.
- **Release heavy resources deliberately** with `DestroyRef`/`ngOnDestroy` on the component, rather
  than assuming the injector will be torn down.

Angular has an experimental option for automatic cleanup of unused route injectors. It is
experimental — do not depend on it in this codebase until it is stable, and record the decision in
`AGENTS.local.md` if that changes. See
[longevity.md](longevity.md#do-not-build-on-developer-preview).

**Audit:** Flag feature-specific services declared `providedIn: 'root'`. Flag any comment or code
that assumes a route-scoped service is destroyed on navigation.

## Resolvers: use sparingly

A resolver blocks navigation until data arrives — the user sits on the old page with no feedback.
Prefer navigating immediately and rendering a loading state from `httpResource`.

Use a resolver only when the route genuinely cannot render without the data and a partial render
would be wrong (for example, resolving a title for SSR meta tags).

## Rendering strategies

Decide **per route**, and record the decision in `AGENTS.local.md`.

| Strategy | Use for |
| --- | --- |
| Prerender (SSG) | Marketing, docs, anything the same for everyone |
| SSR | Pages needing per-request data and SEO or fast first paint |
| CSR | Authenticated app screens behind a login |

Angular's server routing config expresses this per route. Do not make it an app-wide switch — that
choice always turns out wrong for half the app.

If you use SSR, the hydration rules matter:

- Reading `window`, `document`, `localStorage`, or `Date.now()` during render causes hydration
  mismatches. Guard with `afterNextRender()`.
- Use `PendingTasks` to delay serialisation until critical async work finishes.
- Consider incremental hydration (`@defer (hydrate on …)`) to keep interactive-only JS off the
  critical path.

**Audit:** Flag direct `window`/`document`/`localStorage` access outside `afterNextRender()` or an
explicit platform check.

## Preloading

Lazy loading defers the download; preloading warms it before the user clicks. Use a custom
preloading strategy that preloads routes marked in route `data`, rather than
`PreloadAllModules` — preloading everything is just eager loading with extra steps.

For in-template deferral, `@defer (prefetch on hover)` gives the same effect at component
granularity.

## Titles

Every route sets a `title`. It is the accessible page name, the browser tab, and the history entry.

```ts
{ path: 'invoices', title: 'Invoices', loadChildren: ... }
```

**Audit:** Flag routes without a `title`.
