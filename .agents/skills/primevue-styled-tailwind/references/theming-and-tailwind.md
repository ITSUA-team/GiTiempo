# Theming and Tailwind CSS

## Table of Contents

- [Architecture](#architecture)
- [Design Token Tiers](#design-token-tiers)
- [definePreset](#definepreset)
- [Color Scheme Customization](#color-scheme-customization)
- [Primary and Surface Palettes](#primary-and-surface-palettes)
- [Component Token Overrides](#component-token-overrides)
- [Scoped Tokens](#scoped-tokens)
- [CSS Layer](#css-layer)
- [Tailwind CSS Integration](#tailwind-css-integration)
- [Dark Mode](#dark-mode)
- [Utility Functions](#utility-functions)
- [Extending with Custom Tokens](#extending-with-custom-tokens)

## Architecture

PrimeVue theming is decoupled from components. A theme has two parts:
- **Base** — style rules with CSS variables as placeholders
- **Preset** — design tokens mapped to CSS variables

Built-in presets: **Aura** (PrimeTek's own), **Material** (Google MD v2), **Lara** (Bootstrap-inspired), **Nora** (enterprise).

## Design Token Tiers

### Primitive Tokens
Raw values without context — a color palette from 50 to 950.

```css
var(--p-blue-500)
var(--p-emerald-700)
```

Colors available: emerald, green, lime, red, orange, amber, yellow, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, slate, gray, zinc, neutral, stone.

### Semantic Tokens
Context-aware tokens that indicate usage through their names.

```css
var(--p-primary-color)          /* main brand color */
var(--p-text-color)             /* default text */
var(--p-text-muted-color)       /* secondary text */
var(--p-content-border-color)   /* borders */
var(--p-content-background)     /* backgrounds */
```

The `colorScheme` group defines tokens per light/dark mode.

### Component Tokens
Per-component tokens that map to semantic tokens.

```css
var(--p-button-background)
var(--p-inputtext-border-color)
var(--p-card-background)
```

### Best Practice

Use primitive tokens for the core color palette, semantic tokens for common design elements, and component tokens only when customizing a specific component. Overriding components with style classes should be the last resort.

## definePreset

Customize an existing preset during setup:

```js
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{indigo.50}',
            100: '{indigo.100}',
            200: '{indigo.200}',
            300: '{indigo.300}',
            400: '{indigo.400}',
            500: '{indigo.500}',
            600: '{indigo.600}',
            700: '{indigo.700}',
            800: '{indigo.800}',
            900: '{indigo.900}',
            950: '{indigo.950}'
        }
    }
});

app.use(PrimeVue, {
    theme: { preset: MyPreset }
});
```

## Color Scheme Customization

Tokens can be defined per color scheme using `light` and `dark`:

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        colorScheme: {
            light: {
                surface: {
                    50: '{zinc.50}',
                    // ... through 950
                }
            },
            dark: {
                surface: {
                    50: '{slate.50}',
                    // ... through 950
                }
            }
        }
    }
});
```

### Pitfall: colorScheme precedence

If the original preset defines a token under `colorScheme`, a direct override without `colorScheme` gets **ignored**. Always match the structure of the original preset.

```js
// WRONG — highlight is defined under colorScheme in Aura
const MyPreset = definePreset(Aura, {
    semantic: {
        highlight: {
            background: '{primary.50}' // gets ignored
        }
    }
});

// CORRECT — match the colorScheme structure
const MyPreset = definePreset(Aura, {
    semantic: {
        colorScheme: {
            light: {
                highlight: {
                    background: '{primary.50}',
                    color: '{primary.700}'
                }
            },
            dark: {
                highlight: {
                    background: '{primary.200}',
                    color: '{primary.900}'
                }
            }
        }
    }
});
```

## Primary and Surface Palettes

### Primary
Default maps to emerald. Change to any palette:

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        primary: { 50: '{indigo.50}', /* ... */ 950: '{indigo.950}' }
    }
});
```

### Surface
Surface tones vary between light and dark modes:

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        colorScheme: {
            light: {
                surface: { 0: '#ffffff', 50: '{zinc.50}', /* ... */ 950: '{zinc.950}' }
            },
            dark: {
                surface: { 0: '#ffffff', 50: '{slate.50}', /* ... */ 950: '{slate.950}' }
            }
        }
    }
});
```

### Focus Ring

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        focusRing: {
            width: '2px',
            style: 'dashed',
            color: '{primary.color}',
            offset: '1px'
        }
    }
});
```

### Form Field Tokens
Form input tokens are derived from `formField` semantic token group:

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        colorScheme: {
            light: {
                formField: { hoverBorderColor: '{primary.color}' }
            },
            dark: {
                formField: { hoverBorderColor: '{primary.color}' }
            }
        }
    }
});
```

## Component Token Overrides

Override tokens for a specific component globally. This affects all instances:

```js
const MyPreset = definePreset(Aura, {
    components: {
        card: {
            colorScheme: {
                light: {
                    root: { background: '{surface.0}', color: '{surface.700}' },
                    subtitle: { color: '{surface.500}' }
                },
                dark: {
                    root: { background: '{surface.900}', color: '{surface.0}' },
                    subtitle: { color: '{surface.400}' }
                }
            }
        }
    }
});
```

## Scoped Tokens

Override tokens for a single component instance using the `:dt` prop:

```vue
<ToggleSwitch v-model="checked" :dt="amberSwitch" />

<script setup>
const checked = ref(true);
const amberSwitch = ref({
    handle: { borderRadius: '4px' },
    colorScheme: {
        light: {
            root: { checkedBackground: '{amber.500}' },
            handle: { checkedBackground: '{amber.50}' }
        },
        dark: {
            root: { checkedBackground: '{amber.400}' },
            handle: { checkedBackground: '{amber.900}' }
        }
    }
});
</script>
```

This is preferred over `:deep()` — cleaner API and avoids CSS override complexity.

## CSS Layer

Enable CSS layers for easier specificity control and Tailwind override support:

```js
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            cssLayer: {
                name: 'primevue',
                order: 'theme, base, primevue'
            }
        }
    }
});
```

With layers, CSS without a layer has highest specificity, making it easy to override PrimeVue styles.

## Tailwind CSS Integration

### Install

```bash
npm install tailwindcss-primeui
```

### Tailwind v4

```css
@import "tailwindcss";
@import "tailwindcss-primeui";
```

### Tailwind v3

```js
import PrimeUI from 'tailwindcss-primeui';

export default {
    plugins: [PrimeUI]
};
```

### Semantic Color Utilities

The plugin extends Tailwind with utilities derived from the PrimeVue theme:

| Class | Property |
|-------|----------|
| `bg-primary`, `bg-primary-[50-950]` | Primary color palette |
| `bg-surface-[0-950]` | Surface color palette |
| `text-primary-contrast` | Primary contrast color |
| `text-muted-color` | Secondary text |
| `text-muted-color-emphasis` | Secondary text emphasis |
| `text-color` | Text color with emphasis |
| `border-surface` | Content border color |
| `bg-emphasis` | Emphasis background (hover) |
| `bg-highlight` | Highlight background |
| `bg-highlight-emphasis` | Highlight emphasis background |
| `rounded-border` | Border radius |

All variants and breakpoints supported: `dark:sm:hover:bg-primary`

### Override with Tailwind

When Tailwind utilities can't override PrimeVue styles due to specificity:

**Option 1: Important** (not recommended)

```html
<InputText class="p-8!" />         <!-- Tailwind v4 -->
<InputText class="!p-8" />         <!-- Tailwind v3 -->
```

**Option 2: CSS Layer** (recommended)

Enable `cssLayer` in PrimeVue config. With proper layer ordering, unlayered Tailwind utilities naturally override PrimeVue's layered styles.

## Dark Mode

Default dark mode selector is `system` (uses `prefers-color-scheme: dark`). For a toggleable dark mode, set a class selector:

```js
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.my-app-dark'
        }
    }
});
```

Toggle function:

```js
function toggleDarkMode() {
    document.documentElement.classList.toggle('my-app-dark');
}
```

### Align with Tailwind dark mode

For **Tailwind v4**:

```css
@import "tailwindcss";
@import "tailwindcss-primeui";
@custom-variant dark (&:where(.my-app-dark, .my-app-dark *));
```

For **Tailwind v3**:

```js
export default {
    darkMode: ['selector', '[class~="my-app-dark"]'],
    plugins: [PrimeUI]
};
```

Disable dark mode completely:

```js
options: { darkModeSelector: false }
```

## Utility Functions

```js
import { usePreset, updatePreset, updatePrimaryPalette, updateSurfacePalette, $dt, palette } from '@primeuix/themes';
```

| Function | Purpose |
|----------|---------|
| `usePreset(MyPreset)` | Replace current preset entirely (runtime theme switch) |
| `updatePreset({ semantic: { ... } })` | Merge tokens into current preset |
| `updatePrimaryPalette({ 50: '...', ... })` | Shorthand to update primary colors |
| `updateSurfacePalette({ 50: '...', ... })` | Shorthand to update surface colors (both modes) |
| `$dt('primary.color')` | Get token info (name, variable, value) |
| `palette('#10b981')` | Generate shades/tints 50-950 from a color |

## Extending with Custom Tokens

Add custom tokens and styles to share across components:

```js
const MyPreset = definePreset(Aura, {
    components: {
        button: {
            extend: {
                accent: {
                    color: '#f59e0b',
                    inverseColor: '#ffffff'
                }
            },
            css: ({ dt }) => `
                .p-button-accent {
                    background: ${dt('button.accent.color')};
                    color: ${dt('button.accent.inverse.color')};
                }
            `
        }
    },
    extend: {
        my: {
            transition: { slow: '0.75s', normal: '0.5s', fast: '0.25s' }
        }
    },
    css: ({ dt }) => `img { display: ${dt('my.image.display')}; }`
});
```
