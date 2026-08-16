# Testing

**Vitest** for unit and component tests — the Angular CLI default since v22. **Playwright** for
E2E. Karma, Jasmine, and Protractor are banned.

Framework detail: `angular-developer/references/testing-fundamentals.md`,
`component-harnesses.md`, `router-testing.md`, `e2e-testing.md`.

## Tests are part of the change

Every behaviour change must add or update the smallest test that proves the new promise. Every bug
fix needs a regression test that fails without the fix and passes with it. Use the lowest test tier
that can prove the behaviour; most changes do not need an E2E test.

A documentation-only change or behaviour-preserving refactor does not need a new test, but the
existing suite must still pass.

**Audit (review):** Flag behaviour changes with no added or updated test, and bug fixes with no regression
test. Do not demand a new test for documentation-only changes or behaviour-preserving refactors.

## What to test, in priority order

Over ten years, tests are the thing that lets you upgrade fearlessly. Their value is proportional
to how much behaviour they pin down per line of test code.

1. **Pure functions in `util/`** — cheapest tests in the codebase, highest density of logic.
   Should be near-total coverage.
2. **Services and stores** — the orchestration layer is where the behaviour lives. This is the
   highest-value tier.
3. **DTO mapping in `data-access/`** — mapping bugs are silent and reach production. Test the
   edge cases: nulls, missing fields, timezone boundaries.
4. **Component behaviour** — user-visible outcomes, not implementation.
5. **E2E** — a handful of critical paths only.

**Do not chase a coverage number.** A test that asserts a signal was set is coverage without
value; it will break during a refactor that changed nothing a user can see. Test what the code
promises, not how it currently keeps the promise.

## Test behaviour, not implementation

```ts
// Bad — asserts a private detail; breaks on any refactor
expect(component['_isLoading']()).toBe(true);

// Good — asserts what a user experiences
const status = fixture.nativeElement.querySelector('[role="status"]');
expect(status?.textContent).toContain('Loading invoices');
```

**Query by role and accessible name, not by CSS class or test id.** It tests accessibility and
behaviour at once, and it survives markup changes.

Angular Testing Library gives you `screen.getByRole(...)` and reads better than raw
`querySelector`. It is not currently a dependency of this project — if you want it, apply the
dependency policy in [longevity.md](longevity.md#3-dependency-policy) and adopt it deliberately.
Until then, the examples here use native queries and component harnesses.

**Audit (review):** Flag tests reading private members, and queries by CSS class or test-id where a role
query would work.

## Zoneless testing

The app is zoneless. `fakeAsync`/`tick` were built around Zone.js and are the wrong tool here.

- Await real promises.
- Use `await fixture.whenStable()` after triggering async work.
- Use `afterNextRender` for DOM-dependent assertions.
- Never `setTimeout` to "wait for" something — that is a flaky test with a delay.

**Audit (partial):** Flag `fakeAsync`, `tick`, and `setTimeout` used for sequencing in tests.
*Lint covers:* `fakeAsync` and `tick`, in `*.spec.ts` files only.
*You check:* `setTimeout` used for sequencing — it has no rule, because a `setTimeout` in a test is not
wrong on its face; using one to wait for change detection is. That judgement is yours.

## Dependency substitution

Override providers in `TestBed`. Do not mock modules.

```ts
TestBed.configureTestingModule({
  providers: [
    InvoicesStore,
    { provide: InvoiceApiService, useValue: fakeInvoiceApi },
    provideHttpClient(),
    provideHttpClientTesting(),
  ],
});
```

Prefer a small hand-written fake over a mocking framework. Anchor it to the surface the test
consumes — `satisfies Pick<InvoiceApiService, 'create'>` — so it fails to compile when the service
changes, which is exactly the signal you want. The provider line will not do this for you:
`ValueProvider` types both `provide` and `useValue` as `any`
([architecture.md](architecture.md#abstractions-are-for-real-seams-not-for-testability)).
Auto-mocks silently keep passing while the real code has moved on. Over ten years this difference
compounds enormously.

## Service and store tests

The highest-value tests. No DOM needed.

```ts
it('re-fetches when the filter changes', async () => {
  const store = TestBed.inject(InvoicesStore);
  store.setFilter({ status: 'overdue' });
  await TestBed.inject(ApplicationRef).whenStable();
  expect(store.invoices()).toHaveLength(2);
});
```

Read signals directly — for signal-based state there is nothing to subscribe to.

When the API under test genuinely returns an `Observable` (a mutation method, an RxJS pipeline in a
service), testing it by consuming that Observable is correct. Prefer `await firstValueFrom(obs)`
over a manual `subscribe` with assertions in the callback, because a failed expectation inside a
subscribe callback can pass silently.

**Audit (review):** Flag `.subscribe(` used to read signal-backed state, and any `subscribe` whose
assertions could be missed because the callback never runs.

## Component tests

Test through the rendered output and user interaction. Use component harnesses where they exist —
they are stable against markup changes in a way that raw DOM queries are not.

Presentational components in `ui/` are the easiest thing in the codebase to test: set inputs, read
the DOM, assert outputs emitted. There is no reason for them to be untested.

## HTTP tests

Use `provideHttpClientTesting` and `HttpTestingController`. Assert the request as well as the
response — URL, method, and params are part of the contract.

Always `httpMock.verify()` in `afterEach` so unexpected requests fail the test.

## Hygiene

The Angular test setup resets `TestBed` between tests already. **Do not add a boilerplate
`afterEach(() => TestBed.resetTestingModule())` to every spec** — it is noise that makes real
setup harder to see. Add it only where you have a demonstrated isolation problem, with a comment
naming the leak.

The rules that do apply everywhere:

- No shared mutable state between tests. Module-level `let` holding a fixture is the usual culprit.
- No conditionals in tests. A test with an `if` is two tests.
- One behaviour per `it`. The name states the behaviour: `it('cancels the previous request when
  the filter changes')`.
- No tests against real network, real time, or real randomness. Inject a clock.

**Audit (review):** Flag tests containing `if`/`try`, module-level mutable state shared across tests, and
any real network call.

## E2E

Playwright, and few. E2E tests are the slowest and flakiest tier — reserve them for paths where
failure is unacceptable:

- Sign in / sign out
- The primary business transaction
- Payment, if there is one

Everything else belongs in a faster tier.

Rules: use accessible-role selectors, never CSS chains. Never `waitForTimeout`. Each test sets up
and tears down its own data.

## CI gate

Every PR must pass:

```bash
ng build                                  # includes template type checking
ng test                                   # Vitest
node scripts/check-eslint-config.mjs      # the layer rules are actually still composed
ng lint                                   # architecture rules from eslint.config.js
npx playwright test
npm audit --audit-level=high
```

Keeping the skills current is a scheduled task, not a CI gate — `npx skills update` during the
Angular upgrade PR, and quarterly. Failing a build because upstream shipped a doc change blocks
work that has nothing to do with it.

A red build is never merged, and a flaky test is fixed or deleted — never retried into green. A
test suite nobody trusts is worse than no suite, because it stops being read.
