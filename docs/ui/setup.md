<!-- Scope: Tailwind v4 theme setup, PrimeVue v4 styled mode, PT usage -->
<!-- Read when: configuring app bootstrap, tokens, preset, CSS layer order -->

# UI Setup

## Tailwind v4 Setup

Tailwind v4 is configured in CSS via `@theme`. There is no `tailwind.config.ts`.

- Use `@theme inline` when a token references another CSS variable via `var(...)`.
- Reset overridden namespaces explicitly when you want a strict custom token set.

```css
/* src/assets/main.css */
@import "tailwindcss";

@theme {
  --radius-*: initial;

  --color-brand:        #5D2B85;
  --color-accent-tint:  #E8E1F5;
  --color-surface:      #FFFFFF;
  --color-app-bg:       #F4F4F5;
  --color-text-dark:    #1A1A1A;
  --color-text-muted:   #666666;
  --color-divider:      #EEEEEE;
  --color-destructive:  #D32F2F;

  --color-status-active-bg:   #E8F5E9;
  --color-status-active-text: #2E7D32;
  --color-status-warn-bg:     #FFF8E1;
  --color-status-warn-text:   #F57F17;
  --color-status-error-bg:    #FFEBEE;
  --color-status-error-text:  #C62828;

  --font-sans: 'Inter', sans-serif;

  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   10px;
  --radius-full: 9999px;

  --shadow-card:    0 1px 4px rgba(0,0,0,0.08);
  --shadow-popover: 0 4px 12px rgba(0,0,0,0.12);
  --shadow-modal:   0 8px 32px rgba(0,0,0,0.16);
}

@theme inline {
  --color-primary: var(--color-brand);
}
```

Tokens become Tailwind utilities such as `bg-brand`, `text-text-muted`, `rounded-sm`, and `shadow-card`.

If the team wants a locked-down palette, also reset `--color-*` and `--shadow-*` before redefining them.

## PrimeVue v4 Configuration

Use PrimeVue styled mode with Aura as the base preset.

```typescript
// main.ts
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'

const GiTiempoPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f3eef8',
      100: '#E8E1F5',
      200: '#c9b5e0',
      300: '#ab89cb',
      400: '#8c5db6',
      500: '#5D2B85',
      600: '#4e2470',
      700: '#3f1d5b',
      800: '#301646',
      900: '#210f31',
      950: '#12081c',
    },
    colorScheme: {
      light: {
        primary: {
          color: '#5D2B85',
          contrastColor: '#ffffff',
          hoverColor: '#4e2470',
          activeColor: '#3f1d5b',
        },
        surface: {
          0: '#ffffff',
          50: '#F4F4F5',
          100: '#EEEEEE',
          200: '#e0e0e0',
          300: '#c7c7c7',
          400: '#a0a0a0',
          500: '#666666',
          600: '#555555',
          700: '#444444',
          800: '#333333',
          900: '#1A1A1A',
          950: '#0d0d0d',
        },
      },
    },
  },
})

app.use(PrimeVue, {
  theme: {
    preset: GiTiempoPreset,
    options: {
      darkModeSelector: false,
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue, components, utilities',
      },
    },
  },
})
```

## Important Notes

- PrimeVue design tokens do not resolve Tailwind `@theme` token references like `{color.brand}`.
- Keep the hex values in the Tailwind theme and the PrimeVue preset in sync manually.
- `cssLayer` is required when using Tailwind classes in PrimeVue `pt` overrides.

## PT Usage

Use `pt` for instance-level customization when a global preset override would be too broad.

```vue
<DataTable :pt="{ headerCell: 'bg-app-bg text-xs font-medium uppercase tracking-wide text-text-dark' }" />
```
