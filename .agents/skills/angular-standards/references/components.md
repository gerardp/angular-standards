# Components

Framework API detail lives in `angular-developer/references/components.md`,
`inputs.md`, `outputs.md`, `host-elements.md`. This file states the house rules on top.

## Shape

```ts
@Component({
  selector: 'app-invoice-list',
  imports: [HlmButton, InvoiceRow],
  templateUrl: './invoice-list.html',
})
export class InvoiceList {
  private readonly invoices = inject(InvoiceService);

  readonly status = input.required<InvoiceStatus>();
  readonly selected = output<InvoiceId>();

  protected readonly rows = computed(() =>
    this.invoices.all().filter((i) => i.status === this.status()),
  );

  protected select(id: InvoiceId): void {
    this.selected.emit(id);
  }
}
```

Rules visible in that example, all mandatory:

- **Standalone.** Never `NgModule`. `standalone: true` is the default since v19 — do not write it.
- **No `changeDetection` line.** OnPush is the default in v22+. Adding `OnPush` explicitly is noise;
  `Eager` — and the `Default` it supersedes — is banned, see
  [longevity.md](longevity.md#banned-apis).
- **`inject()` in field initialisers.** Never constructor parameter injection.
- **`readonly` on every injected dependency, input, output, and computed.**
- **`protected` for members the template uses, `private` for internals, `readonly` public only for
  the component's API.** A `public` member that the template does not use is a design smell.
- **Signal inputs and outputs only.** `input()`, `input.required()`, `model()`, `output()`. The
  `@Input()`/`@Output()` decorators are banned — see [longevity.md](longevity.md).
- **Import the component, not a module.** `HlmButton`, never `HlmButtonModule`.

## Naming

Follow the current Angular style guide (v20+), which dropped the type suffix:

| Thing | File | Class |
| --- | --- | --- |
| Component | `invoice-list.ts` | `InvoiceList` |
| Service | `invoice-service.ts` | `InvoiceService` |
| API service | `invoice-api.service.ts` | `InvoiceApiService` |
| Directive | `autofocus.ts` | `Autofocus` |
| Pipe | `relative-date-pipe.ts` | `RelativeDatePipe` |
| Routes | `invoices.routes.ts` | — |

The `*-api.service.ts` suffix is deliberate: it makes "no component imports an API service"
checkable by a lint rule on the filename. Do not rename it away.

Generate with the CLI so this stays consistent: `ng generate component features/invoices/invoice-list`.

## Host bindings

Use the `host` object. `@HostBinding` and `@HostListener` are banned.

```ts
@Component({
  selector: 'app-panel',
  host: {
    'class': 'block rounded-lg border',
    '[class.opacity-50]': 'disabled()',
    '[attr.aria-busy]': 'loading()',
    '(keydown.escape)': 'dismiss()',
  },
})
```

Put static classes in `host`, not on every usage of the component in a parent template. The
component owns its own base appearance.

## Queries

`viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()` — signal-based, typed,
available immediately in `afterNextRender`. The decorator equivalents are banned.

```ts
private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('field');
```

## Templates

- **No logic in the template.** No arithmetic, no chained ternaries, no method calls that compute.
  Move it to a `computed()`. A template expression should read as a noun.
- **Method calls in templates are only for event handlers.** `(click)="save()"` is fine;
  `{{ formatTotal(x) }}` is not — that is a `computed` or a pipe.
- **Built-in control flow only**: `@if`, `@for`, `@switch`, `@let`. Structural directives are
  banned.
- **`@for` always needs `track`.** Track a stable identity (`track item.id`), never `$index` unless
  the list is genuinely positional and immutable.
- **`@empty` instead of a sibling `@if (items().length === 0)`.**

```html
@for (invoice of rows(); track invoice.id) {
  <app-invoice-row [invoice]="invoice" (selected)="select($event)" />
} @empty {
  <p class="text-muted-foreground">No invoices.</p>
}
```

## Thin handlers

Event handlers are 1–3 lines: call a method, emit an output, set a local signal. If a handler grows
`try/catch`, loading flags, or sequencing, that logic belongs in the service or store — the
component is doing someone else's job.

**Audit:** Flag handlers longer than ~5 lines, and any handler containing `await` of an I/O call.

## Presentational components (`ui/`)

Components under `ui/` are pure projection:

- Inject nothing. No services, no router, no I/O.
- All data in via `input()`, all events out via `output()`.
- No knowledge of domain workflows — an `app-user-card` renders a user, it does not know how users
  are saved.

This is what makes them reusable and trivially testable. A component in `ui/` that injects
something has failed the definition and belongs in a feature instead.

**Audit:** Flag any `inject()` call inside `src/app/ui/`.

## Splitting

Split a component when it has more than one reason to change — typically when the template covers
two independent interactions (a filter bar and a results table), not when the file crosses a line
count. A long file holding one coherent view is fine.

**Audit:** Flag components whose template contains two or more `@if` branches switching between
what are effectively different screens.

## Inheritance

**Do not `extends` a class carrying `@Component` or `@Directive` in app code.** Compose instead.

Inheritance works — that is the problem. A subclass inherits the union of every ancestor's inputs,
outputs and host bindings, and a base that uses `inject()` in field initialisers needs no `super()`
forwarding at all. So the coupling is real and invisible:

- **The public API is not in the file.** A subclass's inputs and outputs come from ancestors it does
  not name. Rename an input on the base and every subclass's template contract changes silently.
- **Host bindings accumulate.** Two levels down, nothing in the subclass says what ends up on the
  host element.
- **Lifecycle hooks override, they do not chain.** A subclass declaring `ngOnInit` replaces the
  base's unless it calls `super.ngOnInit()`. This is the one case that genuinely breaks, and it
  breaks quietly.
- **The base is a fan-out point on upgrade.** You cannot change it without auditing every subclass
  — exactly the coupling the layer rules exist to prevent.

`hostDirectives` buys the same reuse with the composition written down: the directive is named in
the metadata, and only the inputs listed there enter the component's API.

The three replacements, in order:

| Sharing | Use |
| --- | --- |
| Host behaviour — bindings, listeners, a11y wiring | `hostDirectives` on the consumer |
| Markup around a variable middle | Content projection (`<ng-content>`) |
| Pure logic, no template, no host | A plain function beside its consumer — promoted to `util/` only on a second, cross-feature caller ([architecture.md](architecture.md#where-does-this-file-go)) |

```ts
// Wrong — trackingId is part of InvoicePanel's public API without appearing anywhere in it.
@Directive({ host: { '[attr.data-tracking-id]': 'trackingId()' } })
abstract class TrackedPanel {
  readonly trackingId = input.required<string>();
}

@Component({ selector: 'app-invoice-panel' /* ... */ })
export class InvoicePanel extends TrackedPanel {}

// Right — a concrete directive, composed, with the contributed input named at the call site.
@Directive({
  selector: '[appTracked]',
  host: { '[attr.data-tracking-id]': 'trackingId()' },
})
export class TrackingBehavior {
  readonly trackingId = input.required<string>();
}

@Component({
  selector: 'app-invoice-panel',
  hostDirectives: [{ directive: TrackingBehavior, inputs: ['trackingId'] }],
  // ...
})
export class InvoicePanel {}
```

A `hostDirectives` entry has to be a concrete, instantiable directive — the API takes a `Type`, so
an abstract base cannot be composed, and an input is only exposed if the directive declares it.

This is the same move Spartan makes: Helm composes Brain by applying its directives, never by
extending them — see [spartan-ui.md](spartan-ui.md).

**Audit:** Flag `extends` on any class decorated with `@Component` or `@Directive`, and any
`@Directive()`-decorated abstract base class in app code. Generated Helm code is exempt.

## Deferred loading

Use `@defer` for below-the-fold and interaction-gated content:

```html
@defer (on viewport) {
  <app-activity-chart [data]="chartData()" />
} @placeholder (minimum 300ms) {
  <div class="h-64 animate-pulse rounded-lg bg-muted"></div>
}
```

Always give `@placeholder` a `minimum` so it cannot flash. See
[routing.md](routing.md) for route-level lazy loading.

## Accessibility

Non-negotiable, and cheaper to do now than to retrofit:

- Every interactive element is a real `<button>`, `<a>`, or `<input>` — never a `<div>` with a
  click handler.
- Every form control has an associated `<label>`.
- Every image has `alt`. Decorative images get `alt=""`.
- Focus is visible. Never remove the focus ring without providing a replacement.
- State conveyed by colour is also conveyed by text or icon.

Spartan brain primitives handle keyboard interaction and ARIA wiring for composite widgets — use
them rather than hand-rolling a listbox. See [spartan-ui.md](spartan-ui.md).

**Audit:** Flag `(click)` on a non-interactive element, inputs without labels, and `outline: none`
without a replacement focus style.
