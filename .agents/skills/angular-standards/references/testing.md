# Testing

**Vitest** for unit and component tests — the Angular CLI default since v22. **Playwright** for
E2E. Karma, Jasmine, and Protractor are banned.

Framework detail: `angular-developer/references/testing-fundamentals.md`,
`component-harnesses.md`, `router-testing.md`, `e2e-testing.md`.

## Test environment

The default `ng test` environment is Node.js plus `jsdom`. It proves DOM structure, events and
Angular behaviour; it does **not** prove layout, painting or a browser-only API. Keep those tests in
the existing Playwright suite. Do not add Vitest browser mode for a single case — it adds another
provider and another test environment for Playwright to cover twice.

Keep normal test configuration in the `angular.json` test target. A custom `runnerConfig`, Vitest
plugin or `vitest.config.ts` is allowed only when a documented, current limitation of the Angular
builder blocks the test. Record that limitation and the condition for deleting the custom config.
Angular does not support the contents of a custom runner config or its third-party plugins.

**Audit (review):** Flag tests that claim to verify layout, rendering or browser-only APIs under
`jsdom`, and custom Vitest configuration with no documented Angular CLI limitation and removal
condition.

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

- Trigger changes through the same public notification surface production uses: `.set()` a signal,
  call `fixture.componentRef.setInput(...)` for an input, or set a DOM control value and dispatch its
  real event.
- Await real promises and use `await fixture.whenStable()` after triggering the work.
- Use `afterNextRender` for DOM-dependent assertions.
- Never `setTimeout` to "wait for" something — that is a flaky test with a delay.
- Do not use `fixture.detectChanges()` as a waiting primitive after an interaction. It forces a
  render and can hide a missing production notification. It remains valid for an explicit initial
  render or a test whose subject is change detection itself.
- Use `vi.useFakeTimers()` only when elapsed time is the behaviour — debounce, retry, interval or
  expiry — and restore real timers after the test. Promises, Observables and change detection use
  native `await`, `firstValueFrom()` and `whenStable()` instead.

**Audit (partial):** Flag `fakeAsync`, `tick`, and `setTimeout` used for sequencing in tests.
*Lint covers:* `fakeAsync` and `tick`, in `*.spec.ts` files only.
*You check:* `setTimeout` used for sequencing; `detectChanges()` used to force an update after an
interaction; fake timers used when time is not the behaviour, or not restored. These calls are not
wrong on their face, so the intent needs review.

## Dependency substitution

Override providers in `TestBed`. Do not mock modules.

```ts
TestBed.configureTestingModule({
  providers: [
    InvoicesStore,
    { provide: InvoiceApiService, useValue: fakeInvoiceApi },
    provideHttpClientTesting(),
  ],
});
```

Keep simple, local, deterministic dependencies real. Substitute boundaries with side effects or
unpredictable behaviour: network, storage, time, randomness, authentication SDKs and slow external
systems. Every fake makes the test less like production, so isolation needs a reason.

Prefer a small hand-written fake over a mocking framework. Anchor it to the surface the test
consumes — `satisfies Pick<InvoiceApiService, 'create'>` — so it fails to compile when the service
changes, which is exactly the signal you want. The provider line will not do this for you:
`ValueProvider` types both `provide` and `useValue` as `any`
([architecture.md](architecture.md#abstractions-are-for-real-seams-not-for-testability)).
Auto-mocks silently keep passing while the real code has moved on. Over ten years this difference
compounds enormously.

When substitution exists to stop a side effect, replace the provider completely. Do not subclass
the real service or partially spy on its instance: an unoverridden method can execute production
code and turn a unit test into an accidental network, storage or clock test.

**Audit (review):** Flag an auto-mock or fake with no `satisfies Pick<...>` compile-time anchor;
unnecessary substitution of a simple deterministic local dependency; and partial
spies/subclasses that can still execute the real side effect.

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

The generated `should create` assertion only proves that Angular constructed the component. Replace
or delete it once the component has a real behaviour test; it does not satisfy the requirement to
test a behaviour change. Do not call `TestBed.compileComponents()` unless the tested tree contains
an `@defer` block.

Do not use `NO_ERRORS_SCHEMA` to make a shallow test compile: it also hides misspelled or forgotten
elements and attributes. Render deterministic children normally; replace only a child with an
actual side effect, using a minimal typed fake component.

A DOM-affecting directive is tested through a minimal host component, a real host element and real
events. Calling the directive class or its handler directly does not prove that Angular attached
the directive, bound its inputs or updated the host.

Create a component harness only for a shared interactive widget exercised by several tests. A
one-off page component does not need its own abstraction over the DOM.

**Audit (review):** Flag smoke-only `should create` specs, `compileComponents()` with no `@defer`,
`NO_ERRORS_SCHEMA`, DOM directive tests with no host component, and a new harness used by only one
test/component.

### Testing an `@defer` block

[components.md](components.md#deferred-loading) makes `@defer` mandatory below the fold, so its
states are behaviour like any other and need the same proof. Angular provides the seam:
`deferBlockBehavior` on `TestBed`, `fixture.getDeferBlocks()`, and `DeferBlockFixture.render()`.

**Default to `DeferBlockBehavior.Manual`.** Render the state you want to assert and skip the trigger
entirely:

```ts
import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';

TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
const fixture = TestBed.createComponent(InvoiceDetail);
await fixture.whenStable();

const [chart] = await fixture.getDeferBlocks();
await chart.render(DeferBlockState.Complete);

expect(fixture.nativeElement.textContent).toContain('Revenue');
```

`Placeholder`, `Loading`, `Complete` and `Error` are all reachable this way, and the error branch is
the one that never gets tested otherwise. Nested blocks work the same: render the outer, then call
`getDeferBlocks()` on it.

Manual is the default here for the same reason the rest of this file bans fake timers for
sequencing. `on viewport` needs `IntersectionObserver` and `on idle` needs `requestIdleCallback`;
under `Playthrough` you would mock both, and the `@placeholder (minimum 300ms)` this project
mandates turns every assertion into a timer question. `render()` answers it directly instead.

Use `DeferBlockBehavior.Playthrough` only when the trigger *is* the behaviour under test — an
`on interaction` block where the point is that clicking the placeholder loads the content. Then
drive it with a real DOM event and `await fixture.whenStable()`, not `tick()`.

**Import `DeferBlockState` from `@angular/core/testing`.** Circulating examples use
`ɵDeferBlockState`, because it was private when they were written and is public now. The `ɵ` form
is banned — see [longevity.md](longevity.md#banned-apis).

**Audit (review):** Flag an `@defer` block whose `@error` or `@loading` branch has no test. Flag
`IntersectionObserver` or `requestIdleCallback` mocked in a spec where `DeferBlockBehavior.Manual`
removes the need. Flag `Playthrough` used where no trigger is being asserted.

## Router tests

Use real route definitions with `provideRouter(...)` and `RouterTestingHarness`. Do not mock
Angular's `Router`; exercising the real router is both smaller and more faithful than reproducing
its behaviour in a fake.

**Audit (review):** Flag a mocked `Router` where `provideRouter` and `RouterTestingHarness` can prove
the route, guard, redirect or navigation behaviour.

## HTTP tests

Use `provideHttpClientTesting` and `HttpTestingController`. Assert the request as well as the
response — URL, method, and params are part of the contract.

`provideHttpClientTesting()` is sufficient by default. Add `provideHttpClient(...)` only when the
test configures a feature such as an interceptor, and put it first so the testing provider replaces
the backend last:

```ts
providers: [
  provideHttpClient(withInterceptors([authInterceptor])),
  provideHttpClientTesting(),
]
```

Always `httpMock.verify()` in `afterEach` so unexpected requests fail the test.

**Audit (review):** Flag `provideHttpClient()` added with no feature configuration, either HTTP
provider in the wrong order, request tests that omit the method and full URL (including params when
present), and suites that do not call `verify()`.

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
