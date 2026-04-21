# Forms

The PrimeVue Forms library (`@primevue/forms`) provides comprehensive form state management with built-in validation support.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Form State](#form-state)
- [Resolvers](#resolvers)
- [ValidateOn Triggers](#validateon-triggers)
- [FormField Component](#formfield-component)
- [Submit Event](#submit-event)

## Installation

```bash
npm install @primevue/forms
```

```vue
<script setup>
import { Form } from '@primevue/forms';
</script>
```

## Basic Usage

All PrimeVue form components integrate seamlessly. Use `name` property instead of `v-model` to link fields to form state:

```vue
<script setup>
const initialValues = ref({ username: '', password: '' });

const resolver = ({ values }) => {
    const errors = {};
    if (!values.username) {
        errors.username = [{ message: 'Username is required' }];
    }
    return { errors };
};

const onFormSubmit = ({ valid }) => {
    if (valid) {
        // process form
    }
};
</script>

<template>
    <Form v-slot="$form" :initialValues :resolver @submit="onFormSubmit" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
            <InputText name="username" type="text" placeholder="Username" fluid />
            <Message v-if="$form.username?.invalid" severity="error" size="small" variant="simple">
                {{ $form.username.error?.message }}
            </Message>
        </div>
        <Button type="submit" severity="secondary" label="Submit" />
    </Form>
</template>
```

Form component provides four key properties:

| Property | Description |
|----------|-------------|
| `v-slot="$form"` | Exposes the `$form` object for state tracking |
| `initialValues` | Default values to initiate the form |
| `resolver` | Validation handler |
| `@submit` | Event handler on form submission |

## Form State

The `$form` object tracks state management. Each field is linked via the `name` property. Access field state as `$form.fieldName`:

- `$form.fieldName.invalid` — whether the field has validation errors
- `$form.fieldName.error` — first error object
- `$form.fieldName.errors` — array of all error objects
- `$form.fieldName.value` — current field value
- `$form.fieldName.dirty` — whether the field has been modified
- `$form.fieldName.touched` — whether the field has been blurred
- `$form.valid` — whether the entire form is valid

## Resolvers

### Custom Resolver

```js
const resolver = ({ values }) => {
    const errors = {};
    if (!values.username) {
        errors.username = [{ message: 'Username is required' }];
    }
    if (!values.password || values.password.length < 6) {
        errors.password = [{ message: 'Password must be at least 6 characters' }];
    }
    return { errors };
};
```

### Schema Resolvers

Built-in resolvers for popular validation libraries, imported from `@primevue/forms/resolvers`:

```js
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { yupResolver } from '@primevue/forms/resolvers/yup';
import { valibotResolver } from '@primevue/forms/resolvers/valibot';
import { joiResolver } from '@primevue/forms/resolvers/joi';
import { superstructResolver } from '@primevue/forms/resolvers/superstruct';
```

Example with Zod:

```js
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';

const schema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

const resolver = zodResolver(schema);
```

## ValidateOn Triggers

Control when validation runs at form level or per field:

| Option | Description | Default |
|--------|-------------|---------|
| `validateOnValueUpdate` | Validate on input change | `true` |
| `validateOnBlur` | Validate on blur | `false` |
| `validateOnMount` | Validate on form mount | `false` |
| `validateOnSubmit` | Validate on submit | `true` |

```vue
<Form
    v-slot="$form"
    :initialValues
    :resolver
    :validateOnValueUpdate="false"
    :validateOnBlur="true"
    :validateOnMount="['firstName']"
    @submit="onFormSubmit"
>
    <InputText name="username" />
    <InputText name="firstName" :formControl="{ validateOnValueUpdate: true }" />
</Form>
```

## FormField Component

`FormField` provides validation and tracking for any input — PrimeVue components, native HTML elements, or third-party libraries.

```vue
<script setup>
import { FormField } from '@primevue/forms';
</script>
```

### With PrimeVue Components

```vue
<Form :resolver @submit="onFormSubmit">
    <FormField v-slot="$field" name="username" initialValue="" class="flex flex-col gap-1">
        <InputText type="text" placeholder="Username" />
        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">
            {{ $field.error?.message }}
        </Message>
    </FormField>
</Form>
```

### With Native HTML Elements

```vue
<Form :resolver @submit="onFormSubmit">
    <FormField v-slot="$field" name="username" initialValue="" class="flex flex-col gap-1">
        <input
            type="text"
            placeholder="Username"
            :class="[{ error: $field?.invalid }]"
            v-bind="$field.props"
        />
        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">
            {{ $field.error?.message }}
        </Message>
    </FormField>
</Form>
```

### Per-Field Resolver

Each FormField can have its own resolver:

```vue
<Form :resolver @submit="onFormSubmit">
    <FormField v-slot="$field" name="username" :resolver="usernameResolver">
        <InputText type="text" />
        <Message v-if="$field?.invalid" severity="error" size="small">
            {{ $field.error?.message }}
        </Message>
    </FormField>
</Form>
```

### Custom Template Element

FormField renders as `<div>` by default. Change with `as` or `asChild`:

```vue
<FormField v-slot="$field" as="section" name="username">
    <InputText />
</FormField>

<FormField v-slot="$field" asChild name="password">
    <section class="flex flex-col gap-2">
        <Password />
    </section>
</FormField>
```

## Submit Event

The submit callback receives form validity, errors, and current state:

```js
const onFormSubmit = ({ valid, errors, states, reset, value }) => {
    if (valid) {
        console.log('Form values:', value);
    }
};
```
