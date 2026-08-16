# Core engineering

Baseline rules that are not Angular-specific.

## Before you write it

Stop at the first rung that holds.

1. **Does this need to exist?** Speculative code has no user to validate it and no test that
   proves it wrong. Promote a helper on the second consumer, not the first
   ([architecture.md](architecture.md#where-does-this-file-go)); add a store when the criteria are
   met, not in anticipation ([reactivity-and-state.md](reactivity-and-state.md#when-to-add-a-store)).
2. **Is it already in this repo?** Search before you write. `util/`, `ui/` and `core/` only pay for
   themselves if the second consumer looks first — a duplicate helper costs twice on every future
   change, and the second copy is the one that rots.
3. **Does the web platform do it?** `Intl.*`, `<dialog>`, `popover`, `:has()`, container queries,
   CSS transitions. See [longevity.md](longevity.md#4-prefer-the-boring-standard-thing).
4. **Does Angular do it?** HTTP-into-signals, forms, lazy loading, accessibility primitives. This is
   question 1 of the dependency policy ([longevity.md](longevity.md#3-dependency-policy)).
5. **Does something already installed do it?** `@angular/cdk` and `@spartan-ng/brain` are already in
   the tree and already on the upgrade budget; a new package is a new bet
   ([spartan-ui.md](spartan-ui.md#composite-widgets-use-brain)).
6. **Is it one line?** Then it is one line, inline — no wrapper, no file of its own.
7. Only then write it, as the minimum that works.

The order is the same one [longevity.md](longevity.md#4-prefer-the-boring-standard-thing) argues
for: platform outlives framework, framework outlives library. Rungs 3–5 are where a 10-year codebase
is won, and they are the ones an agent skips — writing the helper is faster than finding out the
platform already ships it.

**The ladder governs indirection you are adding for yourself, never a boundary the standards
require.** A data-access service read by one component ([architecture.md](architecture.md#the-one-rule)),
a wrapper isolating a risky dependency ([longevity.md](longevity.md#isolate-what-you-cannot-avoid)),
a layer the dependency direction mandates — these are already a "yes" at rung 1. They exist so the
*next* change is possible, and their call-site count says nothing about whether they should.

**Audit (review):** Flag a new `util/` helper that duplicates a JS built-in, an `Intl` capability, or a
function that already exists elsewhere in the repo. Flag indirection whose only justification is
future reuse — generic helper, base class, pass-through layer — at a single call site. Never flag a
boundary these standards require.

## TypeScript configuration

Strict everything. These are set once in `tsconfig.json` and never relaxed — turning a flag off to
unblock a change trades a decade of safety for an afternoon.

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "angularCompilerOptions": {
    "strictTemplates": true,
    "strictInjectionParameters": true,
    "typeCheckHostBindings": true,
    "extendedDiagnostics": { "defaultCategory": "error" }
  }
}
```

`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are the two people disable first. Do
not. They catch the class of bug that survives to production.

**Audit (review):** Flag any PR that weakens a `tsconfig` strictness flag without a corresponding entry in
`AGENTS.local.md`.

## Types

- **`any` is banned.** Use `unknown` at boundaries and narrow it. If you genuinely need `any`, it
  needs an inline comment explaining why.
- **No type assertions to silence the compiler.** `x as Foo` is a claim you are making without
  proof. Validate instead — see [data-access.md](data-access.md#validate-what-the-server-sends).
- **`readonly` by default** on interface fields and arrays. Mutability is opt-in.
- **Prefer union types over enums.** `type Status = 'draft' | 'sent' | 'paid'` erases to nothing,
  works with `satisfies`, and does not create a runtime object.
- **Brand IDs that must not be mixed up.** `type InvoiceId = string & { readonly __brand: 'InvoiceId' }`
  makes passing a `UserId` where an `InvoiceId` belongs a compile error.
- **Never `!` non-null assertion** except immediately after a check the compiler cannot see, with a
  comment.

**Audit (partial):** Flag `any`, `as` assertions on external data, and `!` assertions without a comment.
*Lint covers:* `any` (`no-explicit-any`, plus `template/no-any`) and every `!` assertion
(`no-non-null-assertion`, off in specs).
*You check:* whether an `as` assertion is being applied to external data — the dangerous case, and one
no rule distinguishes from a benign narrowing — and whether a `!` carries the comment that justifies it.
The rule bans `!` outright, so a `!` you decide to keep needs an inline disable *and* the comment.

## Immutability

Treat all state as immutable. Produce new references, never mutate in place. This is not stylistic
— with zoneless change detection and signals, in-place mutation silently fails to render.

```ts
// Wrong
user.roles.push('admin');

// Right
this.user.update((u) => ({ ...u, roles: [...u.roles, 'admin'] }));
```

## Naming

- Files: `kebab-case.ts`. Directories: `kebab-case`.
- Classes and types: `PascalCase`. Functions, variables, signals: `camelCase`.
- Booleans read as predicates: `isLoading`, `hasPermission`, `canSubmit`. Not `loading`, `flag`.
- Functions are verbs: `loadInvoices()`. Signals and computed are nouns: `invoices`, `total`.
- Private writable signal backing a public readonly one: `_filter` / `filter`. That underscore is
  the only place a leading underscore is allowed.
- No abbreviations except universally understood ones (`id`, `url`, `http`, `api`).

See [components.md](components.md#naming) for the Angular file/class suffix conventions.

## Functions

- **One coherent job, one reason to change.** Split when a unit holds concerns that independent
  requirements or actors would change separately — not because its description contains "and", and
  not because it has more than one caller. A verb count is not a responsibility count:
  `InvoiceApiService` loading, creating and voiding invoices is one job, invoice transport
  ([data-access.md](data-access.md#one-service-per-backend-area)). Splitting per verb produces a
  folder of one-method classes that always change together.
- Early return over nested conditionals.
- Pure by default. Anything in `util/` must be pure — no DI, no Angular imports, no side effects.
- Parameters: three or fewer positional, then take an options object.

## Comments

Comment **why**, never **what**. The code says what it does.

```ts
// Bad: increments the retry counter
retries++;

// Good: the payment provider rate-limits bursts, so back off rather than fail the whole batch
retries++;
```

Delete commented-out code. Version control remembers it.

**Audit (review):** Flag commented-out blocks of code and comments that restate the line below them.

## Error handling

- Never swallow an error. An empty `catch {}` is banned.
- Never `console.log` as error handling. Report it or rethrow it.
- Fail loudly in development, degrade gracefully in production — that is what the global
  `ErrorHandler` is for.
- Error messages name what failed and what the user can do, never expose internals.

## Accessibility baseline

Not optional and not a later phase. Retrofitting accessibility into a mature app costs an order of
magnitude more than building with it.

- Semantic HTML first. A `<div>` with a click handler is a bug.
- Every interactive element reachable and operable by keyboard.
- Visible focus indicator everywhere.
- Colour contrast meets WCAG AA (4.5:1 body text, 3:1 large text and UI boundaries).
- `lang` set on `<html>`; `dir` set when the locale requires it.
- Respect `prefers-reduced-motion` — see
  [templates-and-styling.md](templates-and-styling.md#motion).

## Internationalisation readiness

Even if the app ships in one language, do not foreclose the option — retrofitting i18n across a
mature codebase is one of the most expensive refactors there is.

- **Never concatenate translated fragments.** `'Found ' + n + ' results'` cannot be translated into
  languages with different word order or plural rules. Use one parameterised message.
- **Format dates, numbers, and currency through `DatePipe`, `CurrencyPipe`, `DecimalPipe`, or
  `Intl.*`.** Never with string templates or manual `toFixed`.
- **Use CSS logical properties** — `margin-inline-start`, not `margin-left`. Tailwind's `ms-*`/`me-*`
  utilities do this for you; prefer them over `ml-*`/`mr-*`.
- **Do not bake text into images.**

Decide the i18n strategy before the app grows past a handful of screens and record it in
`AGENTS.local.md`. Compile-time (`@angular/localize`) has zero runtime cost but one build per
locale; runtime libraries allow a user-facing switcher. Both are viable; choosing late is what
hurts.

**Audit (review):** Flag string concatenation producing user-facing sentences, manual date/number
formatting, and physical CSS direction properties (`ml-*`, `mr-*`, `left-*`, `text-left`) in new
code.
