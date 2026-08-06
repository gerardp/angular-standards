# Security

The frontend is not a trust boundary. Everything here reduces attack surface and protects users —
none of it substitutes for server-side enforcement.

## The rule that governs the rest

**Anything the client checks, the server must check again.** Guards, disabled buttons, hidden menu
items, and client-side validation are user experience. A user with devtools can call any endpoint
with any payload.

**Audit:** Flag any PR whose description implies a permission is enforced by a guard or by hiding
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

**Audit:** Flag `localStorage`/`sessionStorage` containing anything named token, jwt, auth,
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
    shareReplay({ bufferSize: 1, refCount: false }),
    finalize(() => (this.refresh$ = undefined)),
  );
  return this.refresh$;
}
```

Rules:

- One refresh in flight, shared by all waiters.
- A failed refresh clears the session and redirects to login. **Never retry a failed refresh** —
  that is an infinite loop against your own auth server.
- The refresh request itself must never be intercepted into another refresh.

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

**Audit:** Flag manual `Authorization` headers constructed outside the auth interceptor.

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

**Audit:** Flag every `bypassSecurityTrust*` call and every `[innerHTML]` binding. Each needs a
justification comment naming the sanitisation step.

## Content Security Policy

Set a CSP header at the server or CDN. Target:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' <api-origin>;
frame-ancestors 'none';
base-uri 'self';
object-src 'none';
```

`script-src` must not include `'unsafe-inline'` or `'unsafe-eval'`. If a bootstrap inline script is
unavoidable, use a per-response nonce.

For a decade-long app, also consider a **Trusted Types** policy — it turns DOM XSS sinks into
runtime errors rather than vulnerabilities.

**Audit:** Flag `'unsafe-inline'` or `'unsafe-eval'` in `script-src`.

## Input validation

Validate at the boundary, once, and narrow the type as you do — see
[data-access.md](data-access.md#validate-what-the-server-sends). A type assertion is not
validation.

Data from URL params, query strings, `postMessage`, and third-party embeds is untrusted the same
way an API response is.

**Audit:** Flag URL/query parameter values used directly in a DOM sink, a redirect target, or an
HTTP path without validation. Open-redirect via an unvalidated `returnUrl` is the classic instance.

## Secrets

**Nothing secret ships in the client bundle.** `environment.ts` is not a secret store — the bundle
is public, and `.env` files bundled by the build are public too.

If a value would grant access when leaked, it lives on the server and the client calls an endpoint.
Publishable keys designed for client use (analytics site IDs, Stripe publishable keys) are fine.

**Audit:** Flag anything matching secret/private/apiKey/password/token patterns in
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

**Audit:** Flag `console.log` of request/response objects, and error reporter setup without a
scrubbing hook.
