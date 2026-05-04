# Skill: admin-web-shared-components

Use shared primitive components from `@gitiempo/web-shared` when building or reviewing form UI in `apps/admin-web` or `apps/user-web`. This skill documents the available primitives, their props, and when to use them instead of raw PrimeVue or inline markup.

---

## Available Shared Components

### `AppInput`

A labeled text-input field wrapper that matches the GiTiempo design spec:

- Label: `fontSize:13`, `fontWeight:500`, `color:$text-dark`
- Input: `height:34px`, `border:$color-divider`, `borderRadius:$radius-sm`, `padding:[0,12]`
- Supports helper text and error message below the input

**Import**

```ts
import { AppInput } from '@gitiempo/web-shared';
```

**Props**

| Prop          | Type      | Required | Description                                         |
| ------------- | --------- | -------- | --------------------------------------------------- |
| `id`          | `string`  | ✅       | Wires `<label for>` for accessibility               |
| `label`       | `string`  | ✅       | Label text displayed above the input                |
| `modelValue`  | `string`  | ✅       | v-model value                                       |
| `placeholder` | `string`  | —        | Input placeholder text                              |
| `maxlength`   | `number`  | —        | Max character count                                 |
| `type`        | `string`  | —        | Input type (default: `'text'`)                      |
| `disabled`    | `boolean` | —        | Disables the input                                  |
| `error`       | `string`  | —        | Error message shown below input (red)               |
| `helper`      | `string`  | —        | Helper text shown below input when no error (muted) |

**Emits**: `update:modelValue` (string)

**Usage example**

```vue
<AppInput
  id="project-name"
  v-model="projectName"
  label="Project name"
  placeholder="Enter project name"
  :maxlength="255"
  :disabled="isSubmitting"
  :error="errors.projectName"
/>
```

**When to use `AppInput`**

- Any labeled text input in a form — always prefer `AppInput` over inline `<label>` + `<InputText>`
- When you need helper text or inline error messaging under the field

**When NOT to use `AppInput`**

- Inputs without a label (use `InputText` directly)
- Non-text inputs where PrimeVue has a dedicated component — use `AppFormField` to wrap them instead
- Inline table cell edit inputs — no label needed there

---

### `AppFormField`

A label-above-slot wrapper for any form control (`Select`, `MultiSelect`, `DatePicker`, etc.). Provides the same consistent label styling as `AppInput` but accepts any child via the default slot.

- Supports two sizes: `"md"` (standard forms, `fontSize:13`) and `"sm"` (compact inline forms, `fontSize:12`)
- Both sizes use `fontWeight:500` and `$color-text-dark`
- Gap between label and control: `6px`

**Import**

```ts
import { AppFormField } from '@gitiempo/web-shared';
```

**Props**

| Prop    | Type           | Required | Description                                                                 |
| ------- | -------------- | -------- | --------------------------------------------------------------------------- |
| `label` | `string`       | ✅       | Label text displayed above the control                                      |
| `size`  | `'sm' \| 'md'` | —        | Label size. `'md'` = 13px (default), `'sm'` = 12px for compact inline forms |

**Usage example — standard form**

```vue
<AppFormField label="Visibility">
  <Select
    v-model="visibility"
    :options="visibilityOptions"
    option-label="label"
    option-value="value"
    class="w-full"
  />
</AppFormField>
```

**Usage example — compact inline edit**

```vue
<AppFormField label="Select members" size="sm" class="min-w-0 flex-1">
  <MultiSelect
    v-model="editingMembers"
    :options="assignableMembers"
    option-label="label"
    option-value="userId"
    display="chip"
    class="w-full"
  />
</AppFormField>
```

**When to use `AppFormField`**

- Labeled `Select`, `MultiSelect`, `DatePicker`, `Textarea`, or any non-text control
- Use `size="sm"` for compact inline-edit rows (design: `fontSize:12`)
- Use `size="md"` (default) for standard form cards (design: `fontSize:13`)

**When NOT to use `AppFormField`**

- Text inputs — use `AppInput` instead (it handles `v-model`, `error`, and `helper` text)
- Controls that need no visible label

---

### `AppSelect`

A PrimeVue `Select` wrapper that enforces design-spec dimensions identical to `AppInput`:

- Height: `34px`
- Border: `1px $color-divider`, `borderRadius: 6px`
- Label padding: `px-3`, `fontSize:14px`, `fontWeight:500`, `color:$text-dark`

Use `AppSelect` inside `AppFormField` for labeled dropdown fields.

**Import**

```ts
import { AppSelect } from '@gitiempo/web-shared';
```

**Props**: all standard PrimeVue `Select` props are forwarded transparently via `v-bind="$attrs"`.

**Usage example**

```vue
<AppFormField label="Visibility">
  <AppSelect
    v-model="projectVisibility"
    :options="visibilityOptions"
    option-label="label"
    option-value="value"
    :disabled="isSubmitting"
  />
</AppFormField>
```

**When to use `AppSelect`**

- Any labeled dropdown (`Select`) in a form — prefer `AppSelect` over raw `Select` when a form must match `AppInput` height
- Always pair with `AppFormField` to get the label

**When NOT to use `AppSelect`**

- `MultiSelect` — use raw `MultiSelect` inside `AppFormField` (the compact inline edit style is intentionally different)
- Dropdowns inside tables or popovers where the 34px height constraint doesn't apply

---

## Conventions

- **Text input with label = `AppInput`** — never write `<div class="flex flex-col gap-1.5"><label ...><InputText ...>` by hand
- **Select / MultiSelect / DatePicker with label = `AppFormField`** — never write the label div boilerplate by hand
- **Error state**: pass `:error="errors.fieldName"` on `AppInput`; `AppFormField` has no error prop (validation lives on the control itself or beside it)
- **Disabled state**: pass `:disabled="isSubmitting"` to `AppInput` and to the PrimeVue control inside `AppFormField`
- **Labels**: sentence-case only (`Project name`, not `PROJECT NAME` or `Project Name`)
- **Label font size**: `AppInput` and `AppFormField size="md"` use 13px; `AppFormField size="sm"` uses 12px for compact inline forms

## Adding New Shared Components

A component belongs in `packages/web-shared/src/components/` when:

1. It is used in **both** `apps/admin-web` and `apps/user-web` (or is designed to be)
2. It has stable props/emits (no app-specific routing, stores, or API calls)
3. It wraps a PrimeVue primitive with design-system-correct defaults

Export it from `packages/web-shared/src/components/index.ts` and document it in this skill file.
