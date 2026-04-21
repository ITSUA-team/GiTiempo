# Installation and Configuration

## Table of Contents

- [Download](#download)
- [Vite Setup](#vite-setup)
- [Theme Configuration](#theme-configuration)
- [Auto Import](#auto-import)
- [Configuration Options](#configuration-options)

## Download

```bash
# Using npm
npm install primevue @primeuix/themes primeicons

# Using yarn
yarn add primevue @primeuix/themes primeicons

# Using pnpm
pnpm add primevue @primeuix/themes primeicons
```

## Vite Setup

PrimeVue plugin is required as an application plugin for configuration. It is lightweight and only used for configuration purposes.

```js
import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';

const app = createApp(App);
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});
```

Verify setup by adding a component:

```vue
<script setup>
import Button from 'primevue/button';
</script>

<template>
    <Button label="Verify" />
</template>
```

## Auto Import

Use `unplugin-vue-components` with `@primevue/auto-import-resolver` for automatic component registration and tree-shaking.

### Install

```bash
npm i unplugin-vue-components -D
npm i @primevue/auto-import-resolver -D
```

### Vite Config

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite';
import { PrimeVueResolver } from '@primevue/auto-import-resolver';

export default defineConfig({
    plugins: [
        vue(),
        Components({
            resolvers: [
                PrimeVueResolver()
            ]
        })
    ]
});
```

With auto-import, the initialization code becomes minimal:

```js
import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import App from './App.vue';

const app = createApp(App);
app.use(PrimeVue, {
    theme: { preset: Aura }
});
```

No need to manually register components — they are auto-imported on first use.

## Configuration Options

All options are set during PrimeVue plugin installation:

```js
app.use(PrimeVue, {
    theme: { /* ... */ },
    unstyled: false,
    pt: { /* pass-through */ },
    ptOptions: {
        mergeSections: true,
        mergeProps: false
    },
    ripple: true,
    inputVariant: 'outlined', // or 'filled'
    csp: {
        nonce: '...'
    },
    zIndex: {
        modal: 1100,
        overlay: 1000,
        menu: 1000,
        tooltip: 1100
    },
    locale: { /* see locale API */ }
});
```

### Ripple

Ripple is an optional click animation for buttons and other interactive components. Disabled by default.

```js
app.use(PrimeVue, { ripple: true });
```

### InputVariant

Two styles for form inputs: `outlined` (default, with borders) and `filled` (with background color).

```js
app.use(PrimeVue, { inputVariant: 'filled' });
```

Or apply `p-variant-filled` to an ancestor element for scoped filled inputs.

### ZIndex

Z-indexes are managed automatically, but can be customized:

```js
app.use(PrimeVue, {
    zIndex: {
        modal: 1100,    // dialog, drawer
        overlay: 1000,  // select, popover
        menu: 1000,     // overlay menus
        tooltip: 1100   // tooltip
    }
});
```

### Locale

Configuration is reactive — changes are instantly reflected in the UI.

```js
app.use(PrimeVue, {
    locale: {
        accept: 'Aceptar',
        reject: 'Rechazar',
        // ... many more keys
    }
});
```

Community-supported locale files are available at the [PrimeLocale](https://github.com/primefaces/primelocale) repository.

### CSP Nonce

For Content Security Policy, provide a nonce value for dynamically generated styles:

```js
app.use(PrimeVue, {
    csp: {
        nonce: 'your-nonce-value'
    }
});
```

### Pass Through Options

Controls how pass-through properties merge:

- `mergeSections: true` — sections from main config are included (default)
- `mergeProps: false` — override instead of merge (default)
