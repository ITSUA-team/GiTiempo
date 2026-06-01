<!-- Scope: Tailwind v4 theme setup, PrimeVue v4 styled mode, PT usage -->
<!-- Read when: configuring app bootstrap, tokens, preset, CSS layer order -->

# UI Setup

## Tailwind v4 Setup

Tailwind v4 is configured in CSS via `@theme`. There is no `tailwind.config.ts`.

Current workspace setup:

- `apps/user-web/src/assets/main.css`
- `apps/admin-web/src/assets/main.css`
- Shared token source: `packages/web-config/src/styles/tokens.css`
- Shared component source registration: `@source "../../../../packages/web-shared/src"` in each app CSS entry
- Vite integration via `@tailwindcss/vite` in each app's `vite.config.ts`

- Use `@theme inline` when a token references another CSS variable via `var(...)`.
- Reset overridden namespaces explicitly when you want a strict custom token set.

```css
/* src/assets/main.css */
@import "tailwindcss";

@theme {
  --radius-*: initial;

  --color-brand: #5d2b85;
  --color-accent-tint: #e8e1f5;
  --color-surface-primary: #ffffff;
  --color-app-bg: #f4f4f5;
  --color-text-dark: #1a1a1a;
  --color-text-muted: #666666;
  --color-text-inverse: #ffffff;
  --color-text-inverse-muted: rgba(255, 255, 255, 0.7);
  --color-divider: #eeeeee;
  --color-destructive: #d32f2f;

  --color-status-active-bg: #e8f5e9;
  --color-status-active-text: #2e7d32;
  --color-status-warn-bg: #fff8e1;
  --color-status-warn-text: #f57f17;
  --color-status-error-bg: #ffebee;
  --color-status-error-text: #c62828;

  --font-sans: "Inter", sans-serif;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-full: 9999px;

  --shadow-card: 0 1px 4px rgba(0, 0, 0, 0.08);
  --shadow-popover: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.16);
}

@theme inline {
  --color-primary: var(--color-brand);
}
```

Tokens become Tailwind utilities such as `bg-brand`, `text-text-muted`, `rounded-sm`, and `shadow-card`.

When an app consumes Vue components from `@gitiempo/web-shared`, register the shared package with Tailwind v4 using `@source` in that app's CSS entry. Tailwind's automatic source detection can miss external workspace packages, which leads to rendered shared components whose class attributes exist in the DOM but whose utility CSS is missing from the generated stylesheet.

```css
@import "tailwindcss";
@import "primeicons/primeicons.css";
@import "@gitiempo/web-config/styles/tokens.css";

@source "../../../../packages/web-shared/src";
```

Use the package `src` directory rather than only `components` so shared PrimeVue `pt` class strings and future shared class-bearing helpers are scanned too.

If the team wants a locked-down palette, also reset `--color-*` and `--shadow-*` before redefining them.

## PrimeVue v4 Configuration

Use PrimeVue styled mode with Aura as the base preset.

Current workspace setup:

- Shared preset source: `packages/web-config/src/theme/primevue.ts`
- Both apps install PrimeVue in `src/main.ts`
- `ToastService` and `ConfirmationService` are connected during bootstrap so dialogs and toasts can be added later without changing app initialization

```typescript
// main.ts
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import { definePreset } from "@primeuix/themes";

const GiTiempoPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#f3eef8",
      100: "#E8E1F5",
      200: "#c9b5e0",
      300: "#ab89cb",
      400: "#8c5db6",
      500: "#5D2B85",
      600: "#4e2470",
      700: "#3f1d5b",
      800: "#301646",
      900: "#210f31",
      950: "#12081c",
    },
    colorScheme: {
      light: {
        primary: {
          color: "#5D2B85",
          contrastColor: "#ffffff",
          hoverColor: "#4e2470",
          activeColor: "#3f1d5b",
        },
        surface: {
          0: "#ffffff",
          50: "#F4F4F5",
          100: "#EEEEEE",
          200: "#e0e0e0",
          300: "#c7c7c7",
          400: "#a0a0a0",
          500: "#666666",
          600: "#555555",
          700: "#444444",
          800: "#333333",
          900: "#1A1A1A",
          950: "#0d0d0d",
        },
      },
    },
  },
});

app.use(PrimeVue, {
  theme: {
    preset: GiTiempoPreset,
    options: {
      darkModeSelector: false,
      cssLayer: {
        name: "primevue",
        order: "theme, base, primevue, components, utilities",
      },
    },
  },
});
```

## Important Notes

- PrimeVue design tokens do not resolve Tailwind `@theme` token references like `{color.brand}`.
- Keep the hex values in the Tailwind theme and the PrimeVue preset in sync manually.
- `cssLayer` is required when using Tailwind classes in PrimeVue `pt` overrides.
- Shared Zod and TypeScript contracts live in `packages/shared/src/contracts/`.
- Shared frontend-only theme/bootstrap code lives in `packages/web-config/`.
- Shared frontend-only runtime helpers and reusable Vue components live in `packages/web-shared/`.
- Shared Vue components must be component-aware package exports and should be small PrimeVue-based blocks with stable props/emits contracts.
- Frontend form and API boundary validation should use Zod schemas from `@gitiempo/shared` for contract-facing shapes or from `@gitiempo/web-shared` for browser-only shared form shapes.
- Swagger / OpenAPI is intentionally deferred to `apps/api`; it is not part of the web app bootstrap.

## PT Usage

Use `pt` for instance-level customization when a global preset override would be too broad.

```vue
<DataTable
  :pt="{
    headerCell:
      'bg-app-bg text-xs font-medium uppercase tracking-wide text-text-dark',
  }"
/>
```
