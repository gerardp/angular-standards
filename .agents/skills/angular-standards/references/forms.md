# Forms

**Signal Forms only.** Stable since v22. Reactive Forms and template-driven forms are not used in
this codebase.

Full API surface: `angular-developer/references/signal-forms.md` — read it before
writing a form. It is the largest reference for a reason; the API has sharp edges this file only
summarises.

## Shape

```ts
import { form, submit, required, email, minLength, FormField } from '@angular/forms/signals';

@Component({
  imports: [FormField, HlmInput, HlmButton],
  templateUrl: './signup-form.html',
})
export class SignupForm {
  private readonly accounts = inject(AccountService);

  protected readonly model = signal({
    email: '',
    password: '',
    company: '',
  });

  protected readonly signupForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email' });
    minLength(path.password, 12, { message: 'Use at least 12 characters' });
  });

  protected onSubmit(): void {
    submit(this.signupForm, async () => {
      await this.accounts.signUp(this.model());
    });
  }
}
```

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
handler. All of `required`, `email`, `min`, `max`, `minLength`, `maxLength`, `pattern` come from
`@angular/forms/signals`.

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

**5. The submit callback must be `async` and return a Promise.** `submit()` marks every field
touched, runs validation, and only invokes the callback if the form is valid.

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

## Submission and I/O

The submit callback delegates. It does not perform HTTP itself:

```ts
// Wrong — component doing I/O, violates the architecture rule
submit(this.form, async () => {
  await firstValueFrom(this.http.post('/api/signup', this.model()));
});

// Right — service owns the call
submit(this.form, async () => {
  await this.accounts.signUp(this.model());
});
```

`submit()` already guards against re-entry while the callback is pending, so you do not need a
manual `isSubmitting` flag for double-submit protection. Read the form's own pending state for
button UI.

**Audit:** Flag `HttpClient` or `httpResource` inside a `submit()` callback. Flag hand-rolled
`isSubmitting` signals.

## Server-side validation

Use `validateHttp` in the schema for server-checked rules (uniqueness, availability) rather than
handling them in the submit callback. It keeps the error attached to the field, which is where the
template expects it.

For errors that only surface on submit (a conflict, a payment decline), surface them from the
service as a signal the template renders near the form — not as a `window.alert`, and not thrown
away.

## Accessibility

- Every control has a `<label for>` or is wrapped in a `<label>`.
- Error messages are associated via `aria-describedby` and announced — Spartan's form field helm
  components wire this up; use them rather than hand-rolling. See [spartan-ui.md](spartan-ui.md).
- Do not rely on colour alone to indicate an invalid field.
- Show validation errors after `touched()`, not on every keystroke from an untouched field.

**Audit:** Flag inputs without an associated label. Flag error text rendered without
`aria-describedby` wiring.

## Large forms

Split by schema, not by component alone. Extract reusable rule groups with `schema()` and compose
them with `applyWhen` / `applyEach`. A form component whose template covers three unrelated
sections should become three child components sharing one parent-owned model signal.
