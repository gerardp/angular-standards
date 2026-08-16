# Data access

Everything that crosses the network boundary. Lives in `src/app/data-access/`.

Framework detail: `angular-developer/references/http-client.md`, `resource.md`.

## Reads use `httpResource`, mutations use `HttpClient`

This is the split, and it follows from how the two behave. `httpResource` is **eager and
reactive** — it fires when its request signal changes and cancels the in-flight request
automatically. That is exactly right for reads and exactly wrong for a `POST` you only want to
happen when a button is pressed.

```ts
@Injectable({ providedIn: 'root' })
export class InvoiceApiService {
  private readonly http = inject(HttpClient);

  /** Reactive read. Re-fetches when `filter` changes; cancels the superseded request. */
  invoices(filter: Signal<InvoiceFilter>) {
    return httpResource(
      () => ({ url: '/api/invoices', params: { status: filter().status } }),
      { parse: parseInvoices, defaultValue: [] },   // unknown -> Invoice[]
    );
  }

  /** Read by id. `undefined` request = no fetch, which is how you express "not yet". */
  invoice(id: Signal<InvoiceId | null>) {
    return httpResource(
      () => (id() ? `/api/invoices/${id()}` : undefined),
      { parse: parseInvoice },                      // unknown -> Invoice
    );
  }

  /** Mutation. Cold — nothing happens until the caller subscribes. */
  create(draft: InvoiceDraft): Observable<Invoice> {
    return this.http.post<unknown>('/api/invoices', toCreateDto(draft)).pipe(map(parseInvoice));
  }
}
```

**Do not pass a DTO generic when you use `parse`.** The return type of `parse` determines the
resource's value type, so `httpResource<InvoiceDto[]>(…, { parse: … })` claims one type and
produces another. Omit the generic and let it infer from the parser — which also means the parser
takes `unknown` and must validate, exactly as the boundary rule requires.

Returning `undefined` from the request function is the idiomatic way to say "do not fetch yet" —
use it instead of a separate `enabled` flag.

**Audit (review):** Flag `httpResource` used for a `POST`/`PUT`/`PATCH`/`DELETE`. Flag `HttpClient.get`
where a reactive `httpResource` is what was wanted (i.e. the result is re-fetched manually when
some signal changes).

## Map DTOs at the boundary

The server's wire format is not your domain model, and the two must be free to change
independently. Map once, in the service, in the `parse` function.

```ts
// data-access/invoice.model.ts
export type InvoiceId = string & { readonly __brand: 'InvoiceId' };

export interface Invoice {
  readonly id: InvoiceId;
  readonly issuedAt: Date;        // Date, not string
  readonly totalCents: number;    // integer cents, never float euros
  readonly status: InvoiceStatus;
}

interface InvoiceDto {
  id: string;
  issued_at: string;              // wire format: snake_case ISO string
  total: string;
  status: string;
}

export function toInvoice(dto: InvoiceDto): Invoice { /* ... */ }
```

Rules:

- **No DTO type ever leaves `data-access/`.** Components and features see domain models only.
- **Dates become `Date` at the boundary.** Never pass ISO strings around the app.
- **Money is integer minor units.** Never a float, never a formatted string.
- **Server enum strings are narrowed to a union type** at the boundary, not checked with `string`
  comparisons in templates.

**Audit (review):** Flag any `Dto`-suffixed type imported outside `src/app/data-access/`. Flag `new Date(...)`
on a server value anywhere except a mapping function.

## Validate what the server sends

External data is untrusted input, including from your own backend. A type assertion is a comment,
not a check — `response as Invoice[]` proves nothing at runtime.

For anything that drives money, permissions, or destructive actions, validate the shape in `parse`
and fail loudly. Hand-written guards are fine and add no dependency:

```ts
function toInvoice(dto: unknown): Invoice {
  if (!isInvoiceDto(dto)) throw new Error('Malformed invoice from API');
  return { /* ... */ };
}
```

If validation grows past a handful of shapes, a schema library becomes worth its cost — apply the
dependency policy in [longevity.md](longevity.md#3-dependency-policy) first, and keep it confined
to `data-access/`.

## One service per backend area

- One `*-api.service.ts` per resource or backend area. `InvoiceApiService`, not `ApiService`.
- Name methods after the operation: `loadOverdueInvoices()`, not `getData()`.
- `providedIn: 'root'` — these are stateless.
- **No application state in an API service.** No loading flags of its own, no caching policy, no
  "currently selected" fields. It maps and transports. `httpResource` already carries
  `isLoading`/`error`/`value` for the caller to read.

**Audit (review):** Flag a writable `signal` field on any `*-api.service.ts`. Flag a service named exactly
`ApiService` or with a `getData`-style method name.

## HTTP configuration

All of it in `app.config.ts`, once:

```ts
provideHttpClient(
  withInterceptors([authInterceptor, errorInterceptor]),
  withXsrfConfiguration({ /* see security.md */ }),
)
```

**Do not add `withFetch()`.** `FetchBackend` is the default since v22 and `withFetch()` is now
deprecated outright — see [longevity.md](longevity.md#banned-apis). `provideHttpClient()` is still
required, to configure interceptors and XSRF.

Interceptors are **functional** (`HttpInterceptorFn`). Class-based interceptors and
`HttpClientModule` are banned — see [longevity.md](longevity.md).

## Progress events

`reportProgress` is deprecated in v22. Ask for the direction you actually want:

```ts
this.http.get('/api/exports/large.csv', { reportDownloadProgress: true, observe: 'events' });
```

Ask only where a progress indicator is genuinely rendered. The request emits an event per chunk, so
this is not a free flag to leave on.

**Download progress works on the default Fetch backend. Upload progress is unavailable on it — and
it fails loudly, not quietly.** Angular's wording on `reportUploadProgress`: *"When set to `true` a
request emited against the `FetchBackend` will throw an error."* So it is not a flag you can set
speculatively and discover later; on the default backend it breaks the request.

### If you need a real upload percentage

`withXhr()` is the only way to get one, and it is an **application-wide switch, not a per-request
option**:

```ts
// browser configuration only — see the constraint below
provideHttpClient(
  withXhr(),
  withInterceptors([authInterceptor, errorInterceptor]),
)
```

```ts
this.http.post('/api/documents', file, { reportUploadProgress: true, observe: 'events' });
```

`withXhr()` itself is stable and is not on a deprecation clock. The constraint is *where it runs*:
Angular says XHR support **on the server** is deprecated and intended to be removed in v23, and the
underlying `xhr2` does not safely handle redirects — it can forward an `Authorization` header to a
host you did not choose. It must not reach the SSR environment.

That does not happen by itself. Under SSR, `app.config.ts` is the *shared* config — the server
config merges on top of it — so `withXhr()` written there applies on the server too. Adopting it
means confining it to the browser configuration and verifying what the server actually resolves.
Nothing fails at build time if you get this wrong.

So treat it as a decision with a cost, not a convenience:

- **First ask whether transport progress is the requirement.** An indeterminate indicator, or a
  status endpoint the client polls, keeps the app on Fetch. Neither is free — a status endpoint is
  backend work, and neither reports bytes on the wire — but the transport choice is the expensive
  half, and it is the one you cannot undo per screen.
- **If a percentage is genuinely required**, adopt `withXhr()` deliberately and record it in
  `AGENTS.local.md`. The removal condition is *the percentage requirement disappears, or Fetch gains
  upload progress* — not a version number. Nothing here expires on a schedule.
- **Do not build a second `HttpClient` on `HttpXhrBackend`** as an "isolated" workaround. It skips
  the interceptor chain, so `errorInterceptor`, auth and XSRF stop applying to exactly the requests
  that carry user file uploads. See [security.md](security.md).

**Audit (review):** Flag `reportProgress`. Flag `reportUploadProgress` in a project with no `withXhr()` —
that request throws against the default backend. Flag `withXhr()` with no `AGENTS.local.md` entry,
or reachable from the server config. Flag a manually constructed `HttpClient`.

## Errors

Normalise once, in an interceptor, into a domain error type. Components must never parse an
`HttpErrorResponse`.

```ts
// core/http/error-interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => throwError(() => toAppError(err))),
  );
```

Where each layer handles what:

| Layer | Responsibility |
| --- | --- |
| Interceptor | Normalise transport errors into `AppError`. Retry idempotent GETs on network failure. |
| Service / store | Decide what the error means for this feature; expose it as a signal. |
| Component | Render it. Never inspect status codes. |
| Global `ErrorHandler` | Last-resort net: log/report anything unhandled. |

`httpResource` exposes `error()` directly — read that signal rather than inventing a parallel error
field.

**Audit (review):** Flag `HttpErrorResponse` or `error.status` referenced outside `core/` and
`data-access/`.

## Caching

Do not build a cache until you have measured a need. `httpResource` cancels a superseded request
when its dependencies change — note that this is cancellation, not deduplication or caching across
resources. When you do need one, it goes in the service behind the same method signature so callers
never learn about it.
