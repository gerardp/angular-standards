# Components

Framework API detail lives in `.agents/skills/angular-developer/references/components.md`,
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
- **No `changeDetection` line.** OnPush is the default in v22+. Adding it is noise; setting
  `Default` explicitly is banned.
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
