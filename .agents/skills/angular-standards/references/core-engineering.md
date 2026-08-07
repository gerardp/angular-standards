# Core engineering

Baseline rules that are not Angular-specific.

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

**Audit:** Flag any PR that weakens a `tsconfig` strictness flag without a corresponding entry in
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

**Audit:** Flag `any`, `as` assertions on external data, and `!` assertions without a comment.

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

- One reason to exist. If you need "and" to describe it, split it.
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

**Audit:** Flag commented-out blocks of code and comments that restate the line below them.

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

**Audit:** Flag string concatenation producing user-facing sentences, manual date/number
formatting, and physical CSS direction properties (`ml-*`, `mr-*`, `left-*`, `text-left`) in new
code.
