# Longevity

The controlling constraint for this codebase: **it must still be maintainable in 10 years.**

That is not achieved by picking the right framework once. Angular ships a major every ~12 months
and supports each for 24 months (12 active + 12 LTS). Over 10 years this app will cross roughly ten
majors. Durability comes from *never falling off the upgrade path*, not from choosing well in 2026.

Three rules follow from that, and they outrank convenience every time.

---

## 1. Never use a deprecated API

Angular's policy: a deprecated API survives **at least one more major** (~12 months), then may be
removed in any subsequent major. Writing a deprecated API today is scheduling migration work for
someone in 2028.

### Banned APIs

Do not write these. If you find them, migrate them.

| Banned | Use instead | Status |
| --- | --- | --- |
| `*ngIf`, `*ngFor`, `*ngSwitch` | `@if`, `@for`, `@switch` | Deprecated v20; eligible for removal from v22 |
| `NgIf`, `NgFor`, `NgForOf`, `NgSwitch` imports | built-in control flow (no import needed) | Same |
| `CommonModule` import for control flow | nothing — control flow is built into the compiler | Same |
| `@angular/animations` DSL (`trigger`, `state`, `style`, `transition`, `animate`) | native CSS + `animate.enter` / `animate.leave` | Deprecated |
| `BrowserAnimationsModule`, `provideAnimations()` | native CSS transitions/keyframes | Deprecated |
| `NgModule` for app code | standalone components, `bootstrapApplication` | Legacy |
| `HttpClientModule` | `provideHttpClient()` | Deprecated |
| `withFetch()` | nothing — `FetchBackend` is the default since v22 | Deprecated v22 |
| `reportProgress` request option | `reportUploadProgress` / `reportDownloadProgress` — [data-access.md](data-access.md#progress-events) | Deprecated v22 |
| `withIncrementalHydration()` | nothing — on by default with `provideClientHydration()` — [routing.md](routing.md#incremental-hydration-is-on-by-default) | Deprecated v22; removal intended v24 |
| `$safeNavigationMigration(…)` in a template | fix the type or the condition, then delete the wrapper | Migration aid, documented as temporary — see below |
| `RouterModule.forRoot/forChild` | `provideRouter()` | Legacy |
| `platformBrowserDynamic().bootstrapModule()` | `bootstrapApplication(App, appConfig)` | Legacy |
| `@Input()` / `@Output()` decorators | `input()`, `input.required()`, `output()` | Superseded |
| `@ViewChild` / `@ViewChildren` / `@ContentChild` / `@ContentChildren` | `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()` | Superseded |
| `@HostBinding` / `@HostListener` | `host: {}` in the component decorator | Superseded |
| Constructor parameter injection | `inject()` in field initialisers | Superseded |
| `ChangeDetectionStrategy.Default` | no `changeDetection` line at all — OnPush is the v22 default | Deprecated v22, superseded by `Eager` |
| `ChangeDetectionStrategy.Eager` | same — no `changeDetection` line | **Project policy**, not deprecated. `Eager` is `Default`'s stable successor; opting a component out of OnPush is banned here |
| Zone.js / `provideZoneChangeDetection()` | zoneless (the default since v21) | **Project policy**, not deprecated — the API is still stable |
| Karma + Jasmine | Vitest (the v22 CLI default) | Replaced |
| Protractor | Playwright | Removed years ago |
| `signal.mutate()` | `.set()` / `.update()` with a new reference | Never shipped as stable; does not exist |
| `entryComponents`, `ViewEncapsulation.Native` | — | Already removed |

**Audit:** Flag any occurrence of a banned API. Every one is a build failure waiting for a future
major.

### `Eager` arrives by migration, not by hand

`Eager` was added in v21.2 as an alias of `Default`, and in v22 it became the successor while
`Default` was deprecated. The v22 `ng update` migration rewrites every component that had no
`changeDetection` line — or an explicit `Default` — to `ChangeDetectionStrategy.Eager`, so that a
pre-v22 app keeps its pre-v22 behaviour across the upgrade.

That is correct as a compatibility default and wrong as an end state. On an upgrade PR it means the
diff *adds* a banned line to files nobody touched. Delete those lines in the same PR: without the
line the component is OnPush, which is the entire point of the v22 default. A component that
genuinely breaks once the line is gone has state that is not in a signal — fix that, do not keep
the `Eager`.

Worth knowing because it inverts the usual assumption: a banned API can arrive in the codebase
without anyone typing it. It is not the only one.

### `$safeNavigationMigration` arrives the same way

In v22 the safe navigation operator changed to match JavaScript: a broken `?.` chain now evaluates
to `undefined`, where Angular templates previously produced `null`. The `ng update` migration wraps
affected expressions in `$safeNavigationMigration(…)` to preserve the old result, and Angular's own
documentation calls it a **"temporary migration aid only"** that may be removed in a future version.

Same shape as `Eager`, worse failure mode: it lands in templates nobody edited, and it silently pins
them to semantics the framework has already left.

Removing it is not a find-and-replace. Each call marks a place where an expression was typed as
nullable *and* something downstream cared about `null` specifically — a `=== null` check, a `??`
fallback, an input whose component distinguishes the two. Fix the type or the condition so the
expression is correct under `undefined`, then delete the wrapper. Where a template genuinely needs
`null`, `?? null` says so explicitly and survives the removal.

The v22 compiler also reports `nullishCoalescingNotNullable` and `optionalChainNotNullable` on
expressions whose left-hand side was never nullable. That is the same information from the other
direction — a `?.` or `??` that was always dead code. Delete the operator; do not silence the
diagnostic.

**Audit:** Flag any surviving `$safeNavigationMigration(` in a template. An upgrade PR may introduce
them; it must not merge with them.

### "Superseded" vs "deprecated"

Some rows above (decorators, constructor DI) are not formally deprecated and will not break next
year. They are banned here anyway: the framework's whole direction is signal-based, every new API
assumes it, and a codebase that mixes both styles is one an agent will keep writing inconsistently.
Pick one style and hold it for a decade.

### Do not build on Developer Preview

As of v22, **Angular Aria is Developer Preview.** Developer Preview APIs can change shape or
disappear without the deprecation guarantee.

- Do not build core, hard-to-replace UX on a Developer Preview API.
- Spartan NG brain primitives cover the same accessible-primitive need and are 1.0/stable — prefer
  them. See [spartan-ui.md](spartan-ui.md).
- Revisit when Aria goes stable. Record the decision in `AGENTS.local.md` if it changes.

**Stable and safe to build on as of v22.1:** Signals, `computed`, `linkedSignal`, `resource` /
`rxResource` / `httpResource`, Signal Forms, standalone components, built-in control flow,
`@defer`, zoneless change detection, `inject()`, functional guards/interceptors/resolvers.

---

## 2. Upgrade on a schedule, not on demand

Known dates:

| Version | Released | Active until | LTS ends |
| --- | --- | --- | --- |
| v22 | June 2026 (v22.1: July 2026) | June 2027 | June 2028 |
| v23 | ~June 2027 | ~June 2028 | ~June 2029 |
| v24 | ~June 2028 | ~June 2029 | ~June 2030 |

**Rule: upgrade to each new major within its first 9 months.** The hard invariant behind that
number: **never let this app sit on a version that has entered LTS.** LTS starts at 12 months, so 9
leaves a 3-month buffer for the upgrade itself to slip without breaking the invariant.

Why 9 and not 6: the ecosystem needs time. A UI library's peer range is typically widened within
weeks-to-months of an Angular major, not on release day. Upgrading at month 3 means waiting on
someone else's release; upgrading at month 9 means the compatible versions already exist and the
upgrade is a `package.json` bump. Nine months is late enough for the ecosystem and early enough to
stay off LTS.

The reason there is a deadline at all is compounding. `ng update` ships automated migrations that
rewrite deprecated APIs for you — but each major only carries migrations for roughly the previous
one. Skip two majors and the migrations no longer apply; you are hand-editing. One upgrade a year
is a routine afternoon. Three at once is a project.

### Check the dependency ceilings first

Before planning an upgrade, check whether the dependencies that gate it have caught up. A peer
range is a snapshot, not a verdict — libraries widen them, so the question is always *has it
happened yet*, never *will it*.

| Dependency | Angular peer range | Last checked |
| --- | --- | --- |
| `@spartan-ng/brain` 1.3.1 | `>=21.0.0 <23.0.0` | 2026-08-06 |
| `@angular/cdk` | tracks Angular exactly | — |

Read the ranges off npm rather than trusting this table:

```bash
npm view @spartan-ng/brain peerDependencies
npm view @spartan-ng/brain@latest version
```

If a ceiling has not moved by month 9, that is the signal to escalate — not to skip the upgrade.
Options in order: check for a prerelease or a `--legacy-peer-deps`-free beta, open or upvote the
compatibility issue upstream, or invoke the exit-cost answer you gave when the dependency was
adopted. A dependency that blocks two consecutive majors has failed question 3 of the dependency
policy and should be replaced.

**Audit:** Flag a dependency whose Angular peer ceiling is below the current major with no tracking
issue linked in `AGENTS.local.md`.

### Check the toolchain too, not just the libraries

Angular pins Node, TypeScript and RxJS to explicit ranges, and the TypeScript range is narrow enough
to matter on its own: a routine TypeScript minor bump is an Angular-breaking change. Read the ranges
off <https://angular.dev/reference/versions> — never off a release summary.

| | Angular 21 | Angular 22 |
| --- | --- | --- |
| Node.js | `^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0` | `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0` |
| TypeScript | `>=5.9.0 <6.0.0` | `>=6.0.0 <6.1.0` |
| RxJS | `^6.5.3 \|\| ^7.4.0` | `^6.5.3 \|\| ^7.4.0` |

Rows as published for the `.0.x` release of each major; later minors sometimes widen them, so check
the page rather than this table.

Read the v22 Node row carefully, because it is the one third-party summaries get wrong. It is not
"Node 22 or newer": it is three specific minors with patch floors, and Node 20 — still inside its
own LTS window when v22 shipped — is not one of them, while 24 and 26 are. Compressing that to
"requires Node 22" loses both halves.

CI images, `.nvmrc` and any `engines` field are part of the upgrade PR, not a follow-up.

**Audit:** Flag a CI image, `.nvmrc` or `engines` field naming a Node or TypeScript version outside
the published range for the Angular major in `package.json`.

### Upgrade procedure

```bash
ng update                                              # lists what is out of date, changes nothing
git switch -c chore/angular-23                         # upgrade on its own branch, always
ng update @angular/core@23 @angular/cli@23 --create-commits
ng build && ng test                                    # must be green before merging
```

Two things to know about this command:

- **`ng update` has no `--dry-run`.** The way to inspect what it did is `--create-commits` (`-C`),
  which puts the update and each migration in its own commit so you can read them individually and
  revert selectively. Run it on a branch.
- **Never use `@next`.** It is the prerelease channel, not a preview mechanism — it installs a beta
  or RC into the app. Always name a concrete major.

Then, in the same PR:

1. Read the release notes for newly deprecated APIs; add them to the banned table above.
2. Run any optional modernisation migrations: `ng generate @angular/core:<migration>`.
3. Update the dependency-ceiling table above with the ranges you actually observed.
4. Update the agent skills: `npx skills update` — upstream guidance changes with the framework and
   with Spartan, and a stale skill will have agents writing last year's code.

**Audit:** If `package.json` pins an Angular major that is no longer in its active window, that is
the highest-priority finding in the repo.

---

## 3. Dependency policy

Every dependency is a bet that someone else will still be maintaining it in 10 years. Most of that
bet is unhedged.

Before adding one, answer in the PR description:

1. **What does it do that the framework cannot?** Angular now covers HTTP-into-signals, forms,
   accessibility primitives, animation, and lazy loading natively. Much of the 2020-era Angular
   dependency stack is now redundant.
2. **What is the exit cost?** How many files import it? Can it be isolated behind one of our own
   modules so a future replacement touches one place?
3. **What is its Angular-upgrade track record?** Does it ship a compatible release within weeks of
   each Angular major, or does it lag? A dependency that still has not widened its peer range 9
   months after an Angular major is the thing blocking rule 2.
4. **Who maintains it?** Single-maintainer packages are a real risk at this timescale.

### Standing decisions

| Dependency | Decision | Rationale |
| --- | --- | --- |
| Angular + CLI | Required | The platform. |
| Tailwind CSS v4 | Adopted | Required by Spartan; CSS-first config, no JS config to rot. |
| `@spartan-ng/brain` + helm | Adopted | 1.0/stable. Helm source lives in our repo, so we can maintain it ourselves if upstream stops. See [spartan-ui.md](spartan-ui.md). |
| `@angular/cdk` | Adopted | Spartan peer; maintained by the Angular team. |
| `clsx`, `tw-animate-css` | Adopted (transitively) | Required peers of `@spartan-ng/brain`. Small, single-purpose. |
| `luxon` | **Adopted (transitively)** | Required peer of `@spartan-ng/brain` for its date primitives. See the note below — this is an exception to the date-library rule, not a repeal of it. |
| State management library | **Deferred** | Framework signals + `httpResource` cover current needs. See the graduation criteria in [reactivity-and-state.md](reactivity-and-state.md). Adopt only when those criteria are met, and record it in `AGENTS.local.md`. |
| Date/time library (in our code) | Deferred | Use `Intl.*` and `Temporal` when available. Do not add moment or date-fns. |
| HTTP client library | Banned | `provideHttpClient()` is the client. Never add axios. |
| Utility library (lodash etc.) | Banned | Write the three functions you actually need into `src/app/util/`. |
| Component library other than Spartan | Banned | Two design systems is the most expensive mistake available here. Spartan is a structural bet, not a preference: Helm source lives in our repo, so the component layer survives upstream going quiet. Swapping it is a fork of these standards, not an `AGENTS.local.md` override. |

**Audit:** Flag any new entry in `package.json` `dependencies` whose PR description does not answer
the four questions above.

### The luxon exception

`luxon` arrives as a required peer of `@spartan-ng/brain` — Spartan's date primitives (Calendar,
Date Picker) are built on it. Choosing Spartan means accepting it; there is no configuration that
removes it.

The rule that still holds: **do not use `luxon` in our own code.** Format with `Intl.*` and the
`Date*`/`Number*` pipes, model dates as `Date` at the data-access boundary
([data-access.md](data-access.md#map-dtos-at-the-boundary)), and let `luxon` stay an
implementation detail of Spartan's calendar internals.

The reason for the split: a transitive peer we never import costs one line in `package.json` and
disappears the day Spartan drops it. A date library woven through our own domain code is a
migration. Same package, completely different exit cost.

**Audit:** Flag any `import ... from 'luxon'` outside `src/app/ui/helm/`.

### Isolate what you cannot avoid

When a dependency is genuinely required and genuinely risky, it gets a wrapper of ours and nothing
else imports it directly. One file to rewrite when it dies, not two hundred.

---

## 4. Prefer the boring, standard thing

Over 10 years, web platform standards outlive framework idioms and both outlive libraries. When
there is a choice at equal cost:

- CSS over JS animation. Native CSS transitions survive framework rewrites; the animations DSL
  already did not.
- `Intl.*` over formatting libraries.
- Native `fetch` semantics (the `HttpClient` default) over custom transport layers.
- CSS custom properties and logical properties over preprocessor features.
- Standard `<dialog>`, `popover`, `:has()`, container queries over JS reimplementations.

**Audit:** Flag JS implementations of behaviour the platform now provides natively.
