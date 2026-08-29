# Observability

A ten-year application spends most of its life in production, being debugged by people who did not
write it. The rest of these standards are about the code being correct when it ships. This file is
about being able to answer "what happened to that user, on that build, at that time" eighteen months
later.

The rules here are about **invariants, not vendors**. Error reporters and APM products have a
shorter half-life than this codebase — the obvious choice today is an acquisition announcement in
four years. What survives a vendor change is the shape of the data you collect and the seam you
collect it behind.

## What belongs here

Three other files already own parts of this story. Check the boundary before adding a rule:

| Concern | Owner |
| --- | --- |
| Never sending tokens or personal data off-site; source-map upload | [security.md](security.md#logging-and-error-reporting) |
| Bundle budgets, profiling a change before you make it — *lab* measurement | [performance.md](performance.md#budgets-the-only-rule-here-the-build-can-enforce) |
| Normalising transport failures into `AppError` | [data-access.md](data-access.md#errors) |
| Correlating, classifying and measuring what real users hit — *field* measurement | This file |

The lab/field split is the useful one. A budget fails on your machine before merge; a field metric
tells you what a real user on a real device experienced. Neither substitutes for the other, and a
team with only the first is consistently surprised by the second.

## Correlating a frontend error with the request that caused it

**The requirement is joinability.** Given an error report, an engineer must be able to find the
backend request that produced it without guessing from timestamps. How the identifier travels is an
implementation detail; that it travels is the rule.

Do not reach straight for "add a `traceparent` header in an interceptor". That is one implementation,
and on any project that already has tracing it is the wrong one:

- **Continue an existing trace; never mint a competing one.**
  [W3C Trace Context](https://www.w3.org/TR/trace-context/) defines how context propagates across a
  request. Generating a fresh `traceparent` where one already exists does not extend the trace, it
  severs it — leaving two disconnected halves and a debugging session that ends in confusion.
- **If a tracing SDK is installed, propagation is its job.** Hand-rolling the header alongside one
  gives you two sources of trace state that disagree. Configure the SDK; do not race it.
- **`traceparent` is not a CORS-safelisted request header.** Adding it to cross-origin calls triggers
  a preflight and requires the backend to return it in `Access-Control-Allow-Headers`. That is a
  cross-team change with a deployment order, not a frontend-only one — and it is normally discovered
  after deploying, which is the expensive time to discover it.

Whatever carries the identifier, the same value must also reach the error report, or the two cannot
be joined. An id that exists only in the network tab is not correlation.

**Audit (review):** Flag an error reporter configured with no request-correlation identifier. Flag a
hand-written `traceparent` header in a project that already ships a tracing SDK.

## Deciding what to report

Not every error is a defect. A 404 from probing whether an optional record exists is the system
working; the same 404 loading the page the user just navigated to is a defect. **Reportability is a
property of the operation, not of the error.**

So do not add a `reportable` field to `AppError`. That type describes *what failed* and is built at
the boundary, where the calling context does not exist yet. Classification belongs one layer up, and
[data-access.md](data-access.md#errors) already puts it there:

> | Service / store | Decide what the error means for this feature; expose it as a signal. |

Reporting policy is that decision, made where the operation is known — which means an expected error
is **handled there and does not propagate**. That is what keeps the noise out.

The global `ErrorHandler` stays exactly what the same table calls it: the last-resort net that
log/reports anything unhandled. It does not second-guess what it receives. An `AppError` that reaches
it is by definition one nobody handled, and suppressing those is how real defects go missing — the
opposite failure from the one this section is about, and the more expensive one.

So the noise problem is fixed upstream, never at the net. A reporter that fires on expected errors
produces a feed nobody reads, the team mutes it, and the one real defect in the noise ships anyway;
a muted alerting channel is worse than no channel, because it still looks like coverage on a
dashboard. The fix is that the expected 404 never escaped its service in the first place.

**Audit (review):** Flag a `reportable`/`shouldReport` field on the shared error type. Flag a service or store
that lets a known-expected error propagate to the global `ErrorHandler` instead of handling it. Flag
a global `ErrorHandler` that filters or drops errors it receives rather than reporting them.

## Breadcrumbs

Record what makes an error reproducible: route changes, the operation in flight, the build id, and
coarse user actions. Record **identifiers and counts, never contents** — "submitted the invoice form"
is a breadcrumb; the form's values are a data leak.

The scrubbing rules are [security.md](security.md#logging-and-error-reporting)'s and apply in full,
including the required scrubbing hook on the reporter. What this file adds is **defence in depth, not
a substitute**: sanitise at the point of capture *and* keep the hook filtering at the final boundary
before anything leaves the browser.

Both layers earn their place. Capture-time sanitising means sensitive values never enter breadcrumb
state at all, so a later SDK upgrade or a code path that bypasses the hook cannot leak them. The hook
is the backstop for everything the SDK collects on its own, which capture-time code never sees. What
is not acceptable is relying on either one alone.

**Audit (review):** Flag breadcrumb capture that records request or form bodies. Flag PII scrubbing
implemented only as a reporter callback, with no sanitising at the capture site — and flag capture
site sanitising shipped without the reporter hook `security.md` requires.

## Field metrics by route and build

Collect LCP, CLS and INP, attributed to **a route id and a build id**. Without those two dimensions a
metric is a number that moved with no way to find the change that moved it — which is precisely the
slow decay described at the top of [performance.md](performance.md): measured, but not actionable.

On how to collect them there are three defensible answers, and the
[dependency policy](longevity.md#3-dependency-policy) chooses between them:

| Option | Reasonable when |
| --- | --- |
| `PerformanceObserver` directly | Needs are simple and the team accepts owning the attribution logic below |
| An APM SDK already in the project | It is already a dependency and already reports these. A second collector is pure duplication |
| [`web-vitals`](https://github.com/GoogleChrome/web-vitals) | You want correct numbers and neither of the above applies |

Be honest about that first row, because the platform-only path looks cheaper than it is. The browser
emits raw entries; turning them into the metrics as specified takes real logic:

- **CLS** is not the sum of all layout shifts — it is the largest *session window* of them, with the
  windowing rules that implies.
- **INP** requires aggregating across event timing entries for the whole visit, not reading one.
- **LCP** must be finalised when the page is hidden, and reconsidered when the page is restored from
  the back/forward cache.
- **Soft navigations** reset none of this automatically, and this application is one long client-side
  session by design.

That list is why the official library exists, and why it is small. **Neither adopting nor rejecting
it by reflex is acceptable here.** "The platform can already do it" is true of the raw entries and
false of the metrics, and answering question 1 of the dependency policy honestly means saying so
rather than treating the rejection as self-evident.

**Audit (review):** Flag field metrics collected without a route and build dimension. Flag a second metrics
collector added to a project already shipping an APM SDK that reports the same values.

## Reporting must not become a second failure

The reporting boundary never throws or rejects back into the application. A global `ErrorHandler`
must not recurse because the vendor SDK failed while reporting the original error, and a fire-and-
forget reporting promise must not become an unhandled rejection. Contain that failure once inside
the owned reporter service — not with defensive `try`/`catch` repeated at every call site.

```ts
@Injectable({ providedIn: 'root' })
export class ErrorReporter {
  async capture(error: unknown): Promise<void> {
    try {
      await vendorSdk.captureException(error);
    } catch {
      // Reporting is best-effort; never replace the original failure.
    }
  }
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly reporter = inject(ErrorReporter);

  handleError(error: unknown): void {
    void this.reporter.capture(error);
  }
}
```

The `await` inside the adapter contains both a synchronous SDK throw and a rejected promise, so the
handler does not repeat the guard.

**Audit (review):** Flag an unguarded reporter call inside a global `ErrorHandler`, an unguarded vendor
SDK call inside the reporter adapter, or a fire-and-forget reporting promise with no rejection
handling inside the adapter.

## Keeping the provider swappable

Everything above is specified without naming a product, on purpose. Whatever you choose enters the
codebase behind **one concrete service in `core/`** that this project owns, with the vendor SDK
imported in exactly one file. This is [longevity.md](longevity.md#isolate-what-you-cannot-avoid)
applied: the exit cost stays at one file instead of spreading across every feature that ever reported
an error.

**A concrete class, not a contract.** Do not introduce an `interface`, an `abstract class` or an
`InjectionToken` to sit in front of it. The class is already its own injection token, so tests
override it directly, and a TypeScript `interface` cannot be a token at all — see
[architecture.md](architecture.md#abstractions-are-for-real-seams-not-for-testability). One vendor
means one implementation, and a contract with one implementation is the speculative abstraction that
file bans. Add one if and when a second real implementation appears — a server-side no-op for SSR
being the usual first candidate.

The swappability comes from the import being in one file, not from an abstraction layered over it.

Features and services call that service. They do not import the SDK and they do not know its name.

**Audit (review):** Flag an observability or error-reporting SDK imported from more than one file, or from any
file outside `core/`.
