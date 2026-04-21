# Icons

PrimeIcons is the default icon library with 250+ open source icons. PrimeVue components can also use any custom icon library through templating.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Icon Sizes](#icon-sizes)
- [Icon Colors](#icon-colors)
- [Spin Animation](#spin-animation)
- [Constants API](#constants-api)
- [Custom Icons](#custom-icons)

## Installation

```bash
npm install primeicons
```

Import the CSS:

```js
import 'primeicons/primeicons.css'
```

## Basic Usage

PrimeIcons use the `pi pi-{icon}` syntax:

```html
<i class="pi pi-check"></i>
<i class="pi pi-times"></i>
<span class="pi pi-search"></span>
<span class="pi pi-user"></span>
```

## Icon Sizes

Control size with `font-size`:

```html
<i class="pi pi-check" style="font-size: 1rem"></i>
<i class="pi pi-times" style="font-size: 1.5rem"></i>
<i class="pi pi-search" style="font-size: 2rem"></i>
```

## Icon Colors

Color is inherited from parent by default. Use design tokens for theme-aware colors:

```html
<!-- Using design tokens (recommended) -->
<i class="pi pi-check" style="color: var(--p-primary-color)"></i>

<!-- Using Tailwind utilities -->
<i class="pi pi-times text-primary"></i>
<i class="pi pi-search text-muted-color"></i>

<!-- Using hardcoded values (avoid) -->
<i class="pi pi-user" style="color: #708090"></i>
```

## Spin Animation

Apply `pi-spin` for infinite rotation:

```html
<i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
<i class="pi pi-spin pi-cog" style="font-size: 2rem"></i>
```

## Constants API

Reference icons programmatically using the Constants API:

```vue
<script setup>
import { PrimeIcons } from '@primevue/core/api';

const items = [
    {
        label: 'File',
        items: [
            { label: 'New', icon: PrimeIcons.PLUS },
            { label: 'Open', icon: PrimeIcons.DOWNLOAD }
        ]
    }
];
</script>

<template>
    <Menu :model="items" />
</template>
```

## Custom Icons

PrimeVue components support any icon library through templating. Use the icon slots or `icon` prop with custom components:

```vue
<script setup>
import CustomIcon from './CustomIcon.vue';
</script>

<template>
    <!-- Using icon prop with a component -->
    <Button label="Save" :icon="CustomIcon" />

    <!-- Using icon template slot -->
    <Button>
        <template #icon>
            <svg>...</svg>
        </template>
        Save
    </Button>
</template>
```

Popular alternatives that work well with PrimeVue:
- [Lucide Icons](https://lucide.dev/)
- [Heroicons](https://heroicons.com/)
- [Material Icons](https://fonts.google.com/icons)
- [Font Awesome](https://fontawesome.com/)
