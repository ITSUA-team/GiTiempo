---
name: primevue-styled-tailwind
description: "PrimeVue v4 UI component library with Styled Mode, design tokens, and Tailwind CSS integration. Use this skill whenever working with PrimeVue components, theming, forms, DataTable, Dialog, or any UI element in a Vue 3 project — even if the user doesn't explicitly mention PrimeVue but describes a UI need that PrimeVue can fulfill (tables, dropdowns, date pickers, dialogs, menus, charts, file uploads, form validation, etc.). Also use when the user mentions design tokens, PrimeVue theming, Aura/Material/Lara/Nora presets, or Tailwind + PrimeVue together."
metadata:
  author: vue-skills-factory
  version: "2026.4.14"
  source: "https://primevue.org"
---

# PrimeVue Styled Mode + Tailwind CSS

PrimeVue is a design-agnostic, feature-rich UI component library for Vue 3. This skill covers the Styled Mode with design token-based theming and Tailwind CSS integration.

## Core Principle: Component First

Before writing any custom UI element, check if PrimeVue already provides a suitable component. PrimeVue includes 80+ components across these categories:

| Category | Components |
|----------|-----------|
| **Form** | AutoComplete, CascadeSelect, Checkbox, ColorPicker, DatePicker, Editor, FloatLabel, IconField, IftaLabel, InputGroup, InputMask, InputNumber, InputOtp, InputText, KeyFilter, Knob, Listbox, MultiSelect, Password, RadioButton, Rating, Select, SelectButton, Slider, Textarea, ToggleButton, ToggleSwitch, TreeSelect |
| **Button** | Button, SpeedDial, SplitButton |
| **Data** | DataTable, DataView, OrderList, OrgChart, Paginator, PickList, Timeline, Tree, TreeTable, VirtualScroller |
| **Panel** | Accordion, Card, Divider, Fieldset, Panel, ScrollPanel, Splitter, Stepper, Tabs, Toolbar |
| **Overlay** | ConfirmDialog, ConfirmPopup, Dialog, Drawer, DynamicDialog, Popover, Tooltip |
| **File** | Upload |
| **Menu** | Breadcrumb, ContextMenu, Dock, Menu, Menubar, MegaMenu, PanelMenu, TieredMenu |
| **Chart** | Chart.js |
| **Messages** | Message, Toast |
| **Media** | Carousel, Galleria, Image, ImageCompare |
| **Misc** | AnimateOnScroll, Avatar, Badge, BlockUI, Chip, FocusTrap, Fluid, Inplace, MeterGroup, ProgressBar, ProgressSpinner, ScrollTop, Skeleton, Ripple, StyleClass, Tag, Terminal |

## Design Tokens, Not Hardcoded Values

This is the most important styling rule: always use design tokens instead of hardcoded colors, sizes, or spacing values. Design tokens are CSS variables generated from the theme preset, and they automatically adapt to dark/light mode.

### Token Architecture (3 tiers)

1. **Primitive tokens** — raw color palette without context: `--p-blue-500`, `--p-emerald-700`
2. **Semantic tokens** — context-aware: `--p-primary-color`, `--p-surface-500`, `--p-content-border-color`
3. **Component tokens** — per-component: `--p-button-background`, `--p-inputtext-border-color`

### Prefer semantic and component tokens over primitives

```css
/* BAD — hardcoded, ignores theme */
background: #10b981;
color: #1e293b;

/* GOOD — uses design tokens, adapts to theme changes */
background: var(--p-primary-color);
color: var(--p-text-color);
```

### Using tokens in Tailwind classes

With the `tailwindcss-primeui` plugin, semantic colors become Tailwind utilities:

```html
<!-- BAD -->
<div class="bg-emerald-500 text-white">

<!-- GOOD -->
<div class="bg-primary text-primary-contrast">
<div class="text-surface-500 border-surface">
<div class="text-muted-color hover:text-color hover:bg-emphasis">
```

### Customizing tokens with definePreset

```js
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{indigo.50}',
            100: '{indigo.100}',
            // ... through 950
        }
    }
});
```

### Scoped tokens per component instance

Use the `:dt` prop to override tokens for a single component without global changes:

```vue
<ToggleSwitch v-model="checked" :dt="amberSwitch" />

<script setup>
const amberSwitch = ref({
    colorScheme: {
        light: {
            root: { checkedBackground: '{amber.500}' }
        }
    }
});
</script>
```

### Color scheme pitfall

When the original preset defines a token under `colorScheme`, your override must also use `colorScheme` — otherwise it gets ignored. Always check the preset source before customizing.

For complete theming and Tailwind details, read [references/theming-and-tailwind.md](references/theming-and-tailwind.md).

## Installation and Configuration

For full setup instructions (Vite, auto-import, configuration options), read [references/installation-and-config.md](references/installation-and-config.md).

Quick start:

```bash
npm install primevue @primeuix/themes primeicons
npm install tailwindcss-primeui
```

```js
// main.js
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            prefix: 'p',
            darkModeSelector: '.my-app-dark',
            cssLayer: {
                name: 'primevue',
                order: 'theme, base, primevue'
            }
        }
    }
});
```

## Forms with Validation

PrimeVue provides a dedicated `@primevue/forms` library with built-in resolvers for Zod, Yup, Valibot, Joi, and Superstruct. Use `Form` + `FormField` components for state management and validation.

For complete forms documentation, read [references/forms.md](references/forms.md).

## MCP Server (PrimeVue AI Tools)

If the PrimeVue MCP server is available in the environment, use it to get precise, up-to-date component documentation. Install with:

```bash
claude mcp add primevue -- npx -y @primevue/mcp
```

### Key MCP tools

| Tool | Purpose |
|------|---------|
| `list_components` | List all PrimeVue components with categories |
| `get_component` | Get detailed info about a specific component (props, events, slots, methods) |
| `search_components` | Search components by name or description |
| `suggest_component` | Suggest components based on a use case description |
| `get_component_props` | Get all props for a component |
| `get_component_events` | Get all events for a component |
| `get_component_slots` | Get all slots for a component |
| `get_component_methods` | Get all methods for a component |
| `compare_components` | Compare two components side by side |
| `get_usage_example` | Get code examples for a component |
| `get_component_pt` | Get Pass Through options for DOM customization |
| `get_component_tokens` | Get design tokens (CSS variables) for a component |
| `get_theming_guide` | Get detailed theming guide |
| `get_tailwind_guide` | Get Tailwind CSS integration guide |
| `get_accessibility_info` | Get accessibility info for a component |
| `search_all` | Search across components, guides, and props |

### When to use MCP tools

Use MCP tools when you need precise, version-specific information about a component's API (exact prop names, event signatures, slot structures). Do not guess component APIs — use the MCP server to verify.

## LLM Documentation Access

PrimeVue provides LLM-optimized documentation endpoints:

| Endpoint | Description |
|----------|-------------|
| `https://primevue.org/llms.txt` | Structured index of documentation pages |
| `https://primevue.org/llms-full.txt` | Complete documentation text |
| `https://primevue.org/{component}.md` | Markdown version of any page (e.g., `/button.md`, `/datatable.md`) |

Use these when the MCP server is unavailable or when you need full page content.

## Additional References

| Topic | File |
|-------|------|
| Installation, Vite setup, auto-import, configuration | [references/installation-and-config.md](references/installation-and-config.md) |
| Design tokens, definePreset, CSS layers, Tailwind integration | [references/theming-and-tailwind.md](references/theming-and-tailwind.md) |
| Form library, validation, resolvers, FormField | [references/forms.md](references/forms.md) |
| CSS animation classes, customization, disable | [references/animations.md](references/animations.md) |
| WCAG compliance, ARIA, color contrast | [references/accessibility.md](references/accessibility.md) |
| PrimeIcons, custom icons, Constants API | [references/icons.md](references/icons.md) |

## Pass Through (pt) for DOM Customization

The `pt` (pass-through) attribute allows customization of any internal DOM element of a PrimeVue component. Use it when design tokens aren't enough.

```vue
<!-- Scoped override -->
<Dialog pt:root:class="!border-0 !bg-transparent" pt:mask:class="backdrop-blur-sm">
    <template #container="{ closeCallback }">
        <!-- fully custom content -->
    </template>
</Dialog>
```

Global pass-through can be configured in PrimeVue setup:

```js
app.use(PrimeVue, {
    pt: {
        slider: {
            handle: { class: 'bg-primary text-primary-contrast' }
        }
    }
});
```
