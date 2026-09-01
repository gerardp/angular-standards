# Security

The frontend is not a trust boundary. Everything here reduces attack surface and protects users —
none of it substitutes for server-side enforcement.

## The rule that governs the rest

**Anything the client checks, the server must check again.** Guards, disabled buttons, hidden menu
items, and client-side validation are user experience. A user with devtools can call any endpoint
with any payload.

**Audit (review):** Flag any PR whose description implies a permission is enforced by a guard or by hiding
UI, with no corresponding server-side check.

## Token storage

**Never store access or refresh tokens in `localStorage` or `sessionStorage`.** Both are readable
by any JavaScript on the page. A single XSS — in your code or in any dependency, at any point over
ten years — becomes full account takeover with a persistent, exfiltratable token.

In order of preference:

1. **`httpOnly`, `Secure`, `SameSite=Strict` cookie**, set by the backend. JavaScript cannot read
   it, so XSS cannot steal it. This is the right answer when you control the backend.
2. **In-memory only** — a private signal in a `core/` service, gone on refresh, re-obtained via a
   refresh cookie.

**Audit (review):** Flag `localStorage`/`sessionStorage` containing anything named token, jwt, auth,
session, credential, or key. Flag `JSON.stringify` of an auth object into storage.

## Token refresh

Concurrent 401s must share **one** in-flight refresh. The naive implementation — every failing
request triggers its own refresh — produces a burst that most backends treat as an attack, and
races that log the user out at random.

```ts
// core/auth/session.service.ts — shape, not a drop-in
private refresh$?: Observable<void>;

refreshOnce(): Observable<void> {
  this.refresh$ ??= this.http.post<void>('/api/auth/refresh', {}).pipe(
    finalize(() => (this.refresh$ = undefined)),   // MUST come before shareReplay
    shareReplay({ bufferSize: 1, refCount: false }),
  );
  return this.refresh$;
}
```

**Operator order is load-bearing here.** `finalize` must sit *upstream* of `shareReplay`:

- **Correct (above):** `finalize` is part of the shared pipeline, so exactly one instance exists and
  it fires when the refresh actually completes or errors. The cached `refresh$` is cleared once, at
  the right moment.
- **Wrong (`shareReplay` then `finalize`):** each subscriber gets its own `finalize`, and `finalize`
  fires on **unsubscribe** as well as on complete. One waiter abandoning its request — a cancelled
  navigation, a destroyed component — clears `refresh$` while the shared request is still in flight
  (`refCount: false` keeps it alive). The next 401 sees an empty cache and starts a *second*
  refresh. That is exactly the burst this section exists to prevent, reintroduced by two operators
  in the wrong order.

Rules:

- One refresh in flight, shared by all waiters.
- A failed refresh clears the session and redirects to login. **Never retry a failed refresh** —
  that is an infinite loop against your own auth server.
- The refresh request itself must never be intercepted into another refresh.

**Audit (review):** Flag `finalize` placed after `shareReplay` in any shared-request pipeline.

## HTTP configuration

```ts
provideHttpClient(
  withInterceptors([authInterceptor, errorInterceptor]),
  withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
)
```

`withXsrfConfiguration` implements the double-submit-cookie defence — required if you authenticate
with cookies.

The auth interceptor attaches credentials centrally. No service builds its own auth header.

### The auth interceptor is scoped to your own origin — default deny

**Central attachment plus a second backend is how a bearer token reaches a third party.** The
interceptor chain in `provideHttpClient()` is global: it runs on *every* `HttpClient` request, not
just the ones going to your API. The day someone adds a call to a maps provider, a payment SDK's
REST endpoint or an analytics collector, your access token goes with it — in a header the receiving
company logs.

Nothing warns you. The request succeeds, the feature works, and the token is now in someone else's
log retention.

```ts
const API_ORIGINS = new Set([new URL(environment.apiUrl).origin]);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Default deny: no token leaves for an origin that is not ours.
  if (!API_ORIGINS.has(new URL(req.url, location.origin).origin)) {
    return next(req);
  }
  const token = inject(SessionService).accessToken();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
```

**Compare parsed origins, never string prefixes.** `req.url.startsWith('https://api.example.com')`
also matches `https://api.example.com.attacker.tld` — an attacker-controlled host that your own
check waves through. `new URL(...).origin` compares scheme, host and port as the browser does.

**Default deny, not opt-out.** A `SKIP_AUTH` `HttpContextToken` that callers set on third-party
requests is the tempting shape and it fails open: the next third-party call added by someone who
has not read this file leaks by default. An allowlist fails closed — a new *own* backend fails
loudly with a 401 and gets added deliberately.

`HttpContext`/`HttpContextToken` is still the right tool for per-request decisions **within** your
own origin — skipping the error interceptor's toast on a call that handles its own failures, say.
Use it for that, not for the credential boundary.

**A genuinely separate backend gets its own client, not a shared chain.** Provide
`provideHttpClient(withInterceptors([otherAuthInterceptor]))` in the child injector that owns it. A
child injector's chain replaces the parent's; add `withRequestsMadeViaParent()` if it must also run
the global ones. Do not merge two credential schemes into one interceptor that branches on the URL —
that puts both secrets in one function and makes the branch the only thing standing between them.

**Audit (review):** Flag manual `Authorization` headers constructed outside the auth interceptor. Flag
an auth interceptor with no origin check, or one whose check uses `startsWith`/`includes` on a URL
string rather than a parsed origin. Flag a `SKIP_AUTH`-style opt-out used as the credential
boundary.

## XSS

Angular escapes interpolated values by default. The ways to defeat that are few and all of them are
controlled here.

- **`[innerHTML]` with user-controlled content is banned** unless the HTML is sanitised at the
  boundary with a maintained sanitiser, and the reason is documented in `AGENTS.local.md`.
- **`bypassSecurityTrust*` is banned in feature code.** If it is genuinely needed, it happens once
  in a `core/` service with a comment explaining why the input is trustworthy. Scattering
  `bypassSecurityTrustHtml` through a codebase is the most reliable way to end up with an XSS.
- **Never build a template string from user input and render it.**
- **Never pass user input to `eval`, `new Function`, `setTimeout(string)`.**

**Audit (review):** Flag every `bypassSecurityTrust*` call and every `[innerHTML]` binding. Each needs a
justification comment naming the sanitisation step.

## Content Security Policy

Set a CSP header at the server or CDN. Target:

```
default-src 'self';
script-src 'self' 'nonce-{{nonce}}';
style-src 'self' 'nonce-{{nonce}}';
img-src 'self' data: https:;
connect-src 'self' <api-origin>;
frame-ancestors 'none';
base-uri 'self';
object-src 'none';
```

`script-src` must not include `'unsafe-inline'` or `'unsafe-eval'`. If a bootstrap inline script is
unavoidable, use a per-response nonce.

### `style-src` and `ngCspNonce`

**`'unsafe-inline'` in `style-src` is not the price of using Angular.** It is the directive most
projects ship and never revisit, because removing it looks like it breaks the app: Angular injects
component styles as inline `<style>` elements at runtime, and a policy without `'unsafe-inline'`
drops them — the app loads unstyled, the value goes back, and nobody returns to it. So the weakest
directive in the policy is the one with the strongest story for staying weak, which over ten years
is how it survives every security review.

The framework's own answer is `ngCspNonce`. Angular stamps that nonce onto every style element it
injects, so the policy can name a nonce instead of blanket-allowing inline styles:

```html
<!-- index.html, interpolated per response by the server or CDN -->
<app-root ngCspNonce="{{ nonce }}"></app-root>
```

Use the `CSP_NONCE` injection token instead when the value is only known at runtime — a
programmatic bootstrap, or a shell that receives the nonce from the host page. Same guarantee, same
rules; pick whichever the deployment can actually supply.

**The nonce must be new on every response.** A constant baked into a static `index.html` is
`'unsafe-inline'` with extra steps: an attacker who can read the page can read the nonce, so the
policy grants exactly what it appears to withhold while costing the deployment complexity anyway.
That failure mode is worse than the honest `'unsafe-inline'` it replaced, because the header now
*reads* as strict.

If the deployment genuinely cannot generate a per-response value — a pure static host with no
edge function — keep `'unsafe-inline'` on `style-src` only, never on `script-src`, and record it in
`AGENTS.local.md` with a removal condition naming what would have to change. Which is the same rule
every other deviation obeys: the exception is allowed, the silence is not.

For a decade-long app, also consider a **Trusted Types** policy — it turns DOM XSS sinks into
runtime errors rather than vulnerabilities.

**Audit (review):** Flag `'unsafe-inline'` or `'unsafe-eval'` in `script-src`. Flag `'unsafe-inline'`
in `style-src` with no `AGENTS.local.md` entry and removal condition. Flag a nonce that is a literal
in a committed `index.html`, or otherwise identical across two responses — that is the failure that
looks like compliance.

## Input validation

Validate at the boundary, once, and narrow the type as you do — see
[data-access.md](data-access.md#validate-what-the-server-sends). A type assertion is not
validation.

Data from URL params, query strings, `postMessage`, and third-party embeds is untrusted the same
way an API response is.

**Audit (review):** Flag URL/query parameter values used directly in a DOM sink, a redirect target, or an
HTTP path without validation. Open-redirect via an unvalidated `returnUrl` is the classic instance.

## Secrets

**Nothing secret ships in the client bundle.** `environment.ts` is not a secret store — the bundle
is public, and `.env` files bundled by the build are public too.

If a value would grant access when leaked, it lives on the server and the client calls an endpoint.
Publishable keys designed for client use (analytics site IDs, Stripe publishable keys) are fine.

**Audit (review):** Flag anything matching secret/private/apiKey/password/token patterns in
`src/environments/` or anywhere under `src/`.

## Dependencies

Supply chain is the realistic threat over ten years — you will not review every transitive update.

- `npm audit` in CI; fail the build on high and critical.
- Automated dependency PRs enabled, reviewed rather than auto-merged.
- Lockfile committed, always.
- Apply the dependency policy in [longevity.md](longevity.md#3-dependency-policy). Fewer
  dependencies is a security posture, not just a maintenance one.

## Security headers

Beyond CSP: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying unused features.
Set at the server or CDN, and verify them after every infrastructure change.

## Logging and error reporting

- Never log tokens, passwords, or personal data — including into error reporters.
- Scrub breadcrumbs and request bodies before sending them off-site.
- Upload source maps to the error reporter, never to the public CDN.
- Error messages shown to users say what failed and what to do, never a stack trace or an internal
  identifier.

These rules govern what must never leave the browser. What to do with what legitimately does leave —
correlating a report with the backend request that caused it, deciding which errors are worth
reporting at all, and measuring real-user performance — is
[observability.md](observability.md).

**Audit (review):** Flag `console.log` of request/response objects, and error reporter setup without a
scrubbing hook.
