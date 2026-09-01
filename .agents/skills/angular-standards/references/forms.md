# Forms

**Signal Forms only.** Stable since v22. Reactive Forms and template-driven forms are not used in
this codebase.

Full API surface: `angular-developer/references/signal-forms.md` — read it before
writing a form. It is the largest reference for a reason; the API has sharp edges this file only
summarises.

Most Angular and Spartan material still defaults to Reactive Forms, so a copied example is the
likeliest way this rule gets broken. Port the example; do not port its forms API.

**Audit (review):** Flag `FormControl`, `FormGroup`, `FormArray`, `FormBuilder`, `formControlName`,
`formGroup`, `ngModel` or `ReactiveFormsModule` in any new or changed code, including code adapted
from an upstream skill's example.

## Shape

```ts
import { form, required, email, minLength, FormField, FormRoot } from '@angular/forms/signals';

@Component({
  imports: [FormField, FormRoot, HlmInput, HlmButton],
  templateUrl: './signup-form.html',
})
export class SignupForm {
  private readonly accounts = inject(AccountService);

  protected readonly model = signal({
    email: '',
    password: '',
    company: '',
  });

  protected readonly signupForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Email is required' });
      email(path.email, { message: 'Enter a valid email' });
      minLength(path.password, 12, { message: 'Use at least 12 characters' });
    },
    {
      submission: {
        action: async (field) => {
          const result = await this.accounts.signUp(field().value());
          if (result.ok) return;
          return { kind: 'taken', message: result.message, fieldTree: field.email };
        },
      },
    },
  );
}
```

```html
<form [formRoot]="signupForm">
  <input hlmInput [formField]="signupForm.email" />
  <button hlmBtn type="submit" [disabled]="signupForm().submitting()">Create account</button>
</form>
```

No `(submit)` handler, no `novalidate`, no `preventDefault()` — `[formRoot]` sets all three.

## Rules

**1. Never `undefined`, never optional properties. `null` is allowed on leaf values only.**

This is the single most common source of Signal Forms bugs, and it is more precise than "no empty
values":

- **`undefined` is banned outright.** It signifies the *absence* of a field rather than an empty
  value, which breaks the model-driven approach.
- **Optional properties (`field?: string`) are banned**, because they implicitly allow `undefined`.
- **`null` is legitimate for a leaf value whose control understands it as "empty".** The canonical
  case is a date input: `birthday: Date | null`. For a custom control, `null` is usually the right
  "empty" representation.
- **Text inputs still use `''`, numbers `0`, arrays `[]`** — because that is what those controls
  understand as empty, not because `null` is forbidden.

```ts
interface UserFormModel {
  name: string;            // '' when empty — a text input understands ''
  age: number;             // 0
  hobbies: string[];       // []
  birthday: Date | null;   // null — a date input understands null as empty
  nickname?: string;       // ✗ BANNED: optional implies undefined
}
```

> **Divergence from the upstream skill.** `angular-developer/references/signal-forms.md`
> states "NEVER use null or undefined as initial values". That overstates the rule: Angular's own
> Signal Forms documentation permits `null` for leaf values whose control treats it as empty, and
> bans only `undefined` and optional properties. **This file wins** — see the precedence order in
> [SKILL.md](../SKILL.md). Re-check this after the next `npx skills update` in case upstream
> corrects it.

**2. Validation lives in the schema function**, never in the template and never in the submit
handler. All of `required`, `email`, `min`, `max`, `minDate`, `maxDate`, `minLength`, `maxLength`,
`pattern` come from `@angular/forms/signals`.

**3. `when` is only available on `required`.** Other validators do not take it. For conditional
validation of other kinds, use `applyWhen` in the schema.

**4. Call the field to read its state.** This is the API's sharpest edge:

```ts
signupForm.email          // FormField — structure. No state signals here.
signupForm.email()        // FieldState — now you can read signals
signupForm.email().touched()
signupForm.email().valid()
signupForm.email().errors()
```

Same in templates: `@if (form.email().touched() && !form.email().valid())`.

**5. Submission is configured on the form, not wired in the template.** Pass `submission.action`
as `form()`'s third argument and bind `[formRoot]`. The action is `async`; Angular marks every
interactive field touched, checks validation, and only then runs it. See
[Submission](#submission-and-io) for the two shapes and when the standalone `submit()` is correct.

**6. Never set these attributes on an element bound with `[formField]`:** `min`, `max`, `value`,
`[value]`, `[attr.min]`, `[attr.max]`, `[disabled]`, `[readonly]`. `[formField]` owns them; setting
them manually causes conflicts.

The one exception: static `value` on `<input type="radio">` and `<input type="checkbox">` is
required — it identifies which option the control represents.

**7. Disabled / readonly / hidden are schema rules, not template bindings:**

```ts
disabled(path.password, { when: ({ valueOf }) => !valueOf(path.createAccount) });
hidden(path.shippingAddress, { when: ({ valueOf }) => valueOf(path.sameAsBilling) });
```

## Debouncing input

**Debounce a form field with `debounce()` from `@angular/forms/signals`, in the schema.** Not with
RxJS, and not in the component:

```ts
protected readonly searchForm = form(this.model, (path) => {
  debounce(path.query, 300);
});
```

It is a schema rule like `disabled` and `hidden`, and it delays the **model update** — so the
expensive `computed`, the validation pass and the `httpResource` keyed off that value all stop
running per keystroke, from one line.

**Two names, one letter apart, three different answers.** This is the most likely thing on this page
to be got wrong, because the wrong one is the one with a lint rule pointing at it:

| Debounce a… | Use | Status |
| --- | --- | --- |
| Signal Forms field | `debounce()` from `@angular/forms/signals` | **Stable.** The rule above |
| plain signal feeding a resource | `debounceTime` into `toSignal()` in a service | [reactivity-and-state.md](reactivity-and-state.md#debouncing-stays-in-rxjs-for-now) |
| — | `debounced()` from `@angular/core` | **Banned** — experimental, [longevity.md](longevity.md#banned-apis) |

The ban on `debounced()` is about that API's maturity. It says nothing about `debounce()`, which is
part of the stable Signal Forms surface and is the right answer whenever the value being debounced
is a form field.

**Do not hand-roll the data-loss guard.** `debounce()` already syncs the pending value immediately
when the field is marked touched — which includes blur — and `submit()` marks every field touched
before validating, so a submit flushes every debounced field first. A user can type, tab away and
submit without waiting out the timer. Hand-rolled debouncing around `[formField]` is where the
"submitted the value before last" bug comes from, and it is the bug this rule exists to remove.

**Audit (review):** Flag `debounceTime`, `setTimeout` or any hand-rolled timer used to delay a
`[formField]`-bound value. Flag a `debounce()` delay added *alongside* a manual flush on blur or
submit — the rule already guarantees both, and the manual version can only disagree with it.

## Submission and I/O

> **Upstream gap.** `angular-developer/references/signal-forms.md` documents none of this —
> not `FormRoot`, not `submission`, not `ignoreValidators`, `onInvalid` or `submitting()`. The
> "full API surface" pointer at the top of this file has a hole exactly here, so this section is
> the source, verified against Angular's `guide/forms/signals/form-submission`. Re-check after the
> next `npx skills update` in case upstream fills it in.

**Two shapes, and the choice is not a preference:**

| Situation | Use |
| --- | --- |
| A real `<form>` element — the ordinary case | `[formRoot]` + `submission.action` on `form()` |
| Wizard step, auto-save, or a trigger outside the `<form>` | `submit(theForm, async (field) => …)` directly |

`[formRoot]` exists because it does three things a hand-written handler has to remember: it sets
`novalidate`, prevents the browser's default navigation, and calls `submit()`. A `(submit)`
handler that reimplements those is three chances to get it wrong for no gain.

**The action delegates. It does not perform HTTP itself:**

```ts
// Wrong — component doing I/O, violates the architecture rule
action: async (field) => {
  await firstValueFrom(this.http.post('/api/signup', field().value()));
},

// Right — service owns the call
action: async (field) => {
  await this.accounts.signUp(field().value());
},
```

**Never hand-roll `isSubmitting`.** `submit()` guards re-entry while the action is pending, and
`form().submitting()` is the signal for the button. Both shapes get this; neither needs help.

### Submit-time errors belong on the field

A conflict, a declined payment, a username taken between validation and submit — **return it from
the action**. Do not surface it as a separate service signal rendered beside the form:

```ts
action: async (field) => {
  const result = await this.accounts.signUp(field().value());
  if (result.ok) return;                                   // null/undefined = success
  return { kind: 'taken', message: result.message, fieldTree: field.email };
},
```

Return an array to report on several fields. Omit `fieldTree` and the error lands on the submitted
field.

Two reasons this is the rule and not a style choice. It puts submit errors in the same `errors()`
signal as validation errors, so the template renders one thing rather than two — which is what the
`validateHttp` rule below already asks for. And **submission errors auto-clear when the user edits
the field**, unlike validation errors, which recompute. A parallel signal has to be cleared by
hand, and the bug is always the same: a stale "email already taken" sitting under a field the user
already corrected.

### `ignoreValidators` when the form uses async validation

**A form with `validateHttp` or `validateAsync` sets `ignoreValidators: 'none'`.** The default is
`'pending'`, and it does not mean what it sounds like: pending async validators **do not block
submission**. If nothing has failed *yet*, the action runs while the uniqueness check is still in
flight.

| Value | Behaviour |
| --- | --- |
| `'pending'` | Submits if nothing has failed, even with validators in flight — **the default** |
| `'none'` | Submits only when every validator has passed |
| `'all'` | Submits regardless of validation state — draft-saving only |

So the two rules this file already gives you combine into a race unless you opt out: this file
prescribes `validateHttp` for server-checked uniqueness, and the default lets the user submit
before it answers. Set `'none'` on any form that has one.

**Audit (partial):** Flag `HttpClient` or `httpResource` inside a `submission.action` or `submit()`
callback. Flag hand-rolled `isSubmitting` signals. Flag a form with `validateHttp`/`validateAsync`
and no `ignoreValidators: 'none'`. Flag a submit-time server error surfaced as a service signal
instead of returned from the action. Flag a `(submit)` or `(ngSubmit)` handler on a `<form>` whose
form is bound with `[formRoot]`.
*Lint covers:* the I/O imports, and only when the callback lives in a **component** — that is where
`IO_PATHS` applies.
*You check:* everything else here. The same I/O in a callback that lives in a service (allowed to
import it, still the wrong place for this), the `isSubmitting` signals, the `ignoreValidators`
default, the error-routing rule, and the redundant submit handler — none of them has a rule.

## Server-side validation

Use `validateHttp` in the schema for server-checked rules (uniqueness, availability) rather than
handling them in the submit callback. It keeps the error attached to the field, which is where the
template expects it. A form that uses it must also set `ignoreValidators: 'none'` — see
[above](#ignorevalidators-when-the-form-uses-async-validation), because the default will submit
without waiting for the answer.

Errors that only surface at submit time — a conflict, a payment decline — are
[returned from the action](#submit-time-errors-belong-on-the-field), which routes them to the same
place. Never a `window.alert`, and never thrown away.

## Accessibility

- Every control has a `<label for>` or is wrapped in a `<label>`.
- Error messages are associated via `aria-describedby` and announced — Spartan's form field helm
  components wire this up; use them rather than hand-rolling. See [spartan-ui.md](spartan-ui.md).
- Do not rely on colour alone to indicate an invalid field.
- Show validation errors after `touched()`, not on every keystroke from an untouched field.
- **Move focus to the first invalid control when a submit fails.** Use the `submission.onInvalid`
  callback — it runs after every interactive field is marked touched, so the errors are already
  rendered when it fires:

  ```ts
  onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
  ```

  Without it, a keyboard or screen-reader user presses submit, nothing appears to happen, and the
  error that explains why is somewhere above the viewport.

**Audit (partial):** Flag inputs without an associated label. Flag error text rendered without
`aria-describedby` wiring.
*Lint covers:* **neither of these.** `label-has-associated-control` fires on a `<label>` that
references no control — it cannot see an `<input>` that has no label in the first place, which is
the case this rule is about. Verified against this config.
*You check:* both, by hand. Every control needs a label you can point at, and every error message
needs `aria-describedby` from the control to the message — `valid-aria` checks that an attribute is
spelled correctly and valid for its role, never that a required wiring is absent.

## Large forms

Split by schema, not by component alone. Extract reusable rule groups with `schema()` and compose
them with `applyWhen` / `applyEach`. A form component whose template covers three unrelated
sections should become three child components sharing one parent-owned model signal.
