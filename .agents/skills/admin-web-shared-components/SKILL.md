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
  <AppSelect
    v-model="visibility"
    :options="visibilityOptions"
    option-label="label"
    option-value="value"
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

**Implementation**: uses `defineOptions({ inheritAttrs: false })` and forwards all attributes via `v-bind="$attrs"` directly onto the PrimeVue `Select`. Design constraints are applied via PrimeVue's PT (Pass Through) API — no global CSS overrides:

```ts
:pt="{
  root:     { class: '!h-[34px] !rounded-[6px] !border !border-divider w-full' },
  label:    { class: 'flex items-center h-full px-3 text-[14px] font-medium text-text-dark' },
  dropdown: { class: 'flex items-center px-2 shrink-0' },
}"
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

## Form Field Priority Order

Apply this priority order when choosing how to render a form field in `apps/admin-web` and `apps/user-web`:

1. **`AppInput`** — any labeled text input (`type="text"`, `type="email"`, `type="password"`, etc.)
2. **`AppSelect`** inside `AppFormField`\*\* — any labeled dropdown that must match AppInput's 34px height
3. **`AppFormField` + styled `div`** — read-only display fields that visually match the form grid (e.g. a "Source: Manual" field)
4. **Raw PrimeVue components** — only acceptable for `MultiSelect`, `DatePicker`, `Textarea`, and controls where the 34px height constraint does not apply; always wrap in `AppFormField` for the label

**Never use raw PrimeVue `Select` directly inside a form.** Always use `AppSelect` + `AppFormField`.

### Anti-pattern vs Correct pattern

❌ Raw `Select` without `AppFormField`:

```vue
<Select v-model="x" :options="opts" />
```

❌ Manual label + raw `Select`:

```vue
<div class="flex flex-col gap-1">
  <label for="vis" class="text-text-dark text-[13px] font-medium">Visibility</label>
  <Select v-model="x" input-id="vis" :options="opts" option-label="label" option-value="value" />
</div>
```

✅ Correct — `AppFormField` + `AppSelect`:

```vue
<AppFormField label="Visibility" size="sm">
  <AppSelect
    v-model="x"
    :options="opts"
    option-label="label"
    option-value="value"
  />
</AppFormField>
```

✅ Correct — read-only display field using `AppFormField` + `div`:

```vue
<AppFormField label="Source" size="sm" class="flex-1">
  <div
    class="border-divider bg-surface text-text-dark flex h-[34px] items-center rounded-[6px] border px-3 text-[14px] font-medium"
  >
    Manual
  </div>
</AppFormField>
```

✅ Correct — `MultiSelect` uses raw PrimeVue inside `AppFormField` (34px height constraint does not apply here):

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

---

### `ProjectPageHeader`

A shared page-level heading component used across both SPAs. Renders a title, optional subtitle, optional back button, and an action slot on the right side of the title row.

- Title `'xl'` (default): `text-[28px] font-semibold leading-none text-text-dark` — use in `apps/admin-web`
- Title `'lg'`: `text-2xl font-semibold leading-none text-text-dark` — use in `apps/user-web`
- Subtitle: `text-text-muted text-sm`
- Back button: PrimeVue `Button`, `variant="text"`, `severity="primary"`, `pt:label:class="font-bold text-[#5d2b85] text-[13px]"`, prefixed with `←`

**Import**

```ts
import { ProjectPageHeader } from '@gitiempo/web-shared';
```

**Props**

| Prop        | Type           | Required | Default | Description                                            |
| ----------- | -------------- | -------- | ------- | ------------------------------------------------------ |
| `title`     | `string`       | ✅       | —       | Page heading text                                      |
| `subtitle`  | `string`       | —        | —       | Secondary description text below the title             |
| `backLabel` | `string`       | —        | —       | Renders a `←` back button above the title when present |
| `titleSize` | `'lg' \| 'xl'` | —        | `'xl'`  | `'xl'` = 28px (admin-web), `'lg'` = 24px (user-web)    |

**Emits**: `back: []` — fired when the back button is clicked

**Slots**: `default` — action buttons rendered on the right side of the title row

**Usage — admin-web (xl title, action slot)**

```vue
<ProjectPageHeader
  title="Projects"
  subtitle="Manage project visibility, member assignments, and manual project creation."
>
  <Button label="New Project" @click="openCreateProject" />
</ProjectPageHeader>
```

**Usage — admin-web (xl title, back button)**

```vue
<ProjectPageHeader
  title="Add Project"
  subtitle="Create a project manually now, with the flexibility to add workspace imports alongside it."
  back-label="Back to projects"
  @back="handleCancel"
/>
```

**Usage — user-web (lg title)**

```vue
<ProjectPageHeader
  title="Timer"
  subtitle="Start tracking work from your visible projects and tasks or log a manual interval."
  title-size="lg"
/>
```

**When to use `ProjectPageHeader`**

- Any page that has a top-level `<h1>` + optional subtitle pattern
- Always prefer this over inlining `<header class="flex flex-col gap-1.5"><h1 ...>`
- Use `title-size="lg"` for user-web pages, `title-size="xl"` (or omit) for admin-web pages

**When NOT to use `ProjectPageHeader`**

- Section headings inside a page (e.g. `<h2>`) — those are local markup
- Modal or drawer headers — use PrimeVue `Dialog` / `Drawer` title slot

**Rule: before creating any new shared component** — scan ALL frames in the design file for repeated visual patterns first. Do not extract a component until it appears in at least two confirmed call sites across both apps.

---

## Conventions

- **Text input with label = `AppInput`** — never write `<div class="flex flex-col gap-1.5"><label ...><InputText ...>` by hand
- **Select / MultiSelect / DatePicker with label = `AppFormField`** — never write the label div boilerplate by hand
- **Dropdown in a form = `AppSelect`** — never use raw `<Select>` inside a form; raw `Select` is only acceptable in non-form contexts (e.g. table filters) where no label is needed and height is unconstrained
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
