# Animations

PrimeVue components use native CSS animations. Animations are defined using style classes and keyframes. Customize globally by overriding default classes, or apply scoped classes to individual components.

## Table of Contents

- [Animation Types](#animation-types)
- [Anchored Overlays](#anchored-overlays)
- [Collapsibles](#collapsibles)
- [Dialog](#dialog)
- [Drawer](#drawer)
- [Disabling Animations](#disabling-animations)
- [Complete Reference Table](#complete-reference-table)
- [Tailwind Animation Utilities](#tailwind-animation-utilities)

## Animation Types

Three main animation categories in PrimeVue:
- **Anchored overlays** — floating UI relative to another element (Select, Popover, etc.)
- **Collapsibles** — toggleable content (Accordion, Panel, etc.)
- **Dialog/Drawer** — viewport-positioned overlays

## Anchored Overlays

Used by: AutoComplete, CascadeSelect, ColorPicker, ConfirmPopup, ContextMenu, DatePicker, Menu, MultiSelect, Password, Select, TieredMenu, TreeSelect

```css
.p-anchored-overlay-enter-active {
    animation: overlay-in 300ms ease-out;
}

.p-anchored-overlay-leave-active {
    animation: overlay-out 250ms ease-in;
}

@keyframes overlay-in {
    from {
        opacity: 0;
        transform: translateY(10%);
    }
}

@keyframes overlay-out {
    to {
        opacity: 0;
        transform: translateY(10%);
    }
}
```

## Collapsibles

Used by: Accordion, Fieldset, Panel, PanelMenu, Stepper

```css
.p-collapsible-enter-active {
    animation: collapsible-expand 500ms cubic-bezier(0.65, 0, 0.35, 1);
}

.p-collapsible-leave-active {
    animation: collapsible-collapse 500ms cubic-bezier(0.65, 0, 0.35, 1);
}

@keyframes collapsible-expand {
    from {
        opacity: 0;
        grid-template-rows: 0fr;
        transform: scale(0.93);
    }
    to {
        opacity: 1;
        grid-template-rows: 1fr;
    }
}

@keyframes collapsible-collapse {
    from {
        opacity: 1;
        grid-template-rows: 1fr;
    }
    to {
        opacity: 0;
        grid-template-rows: 0fr;
        transform: scale(0.93);
    }
}
```

## Dialog

Used by: Dialog

```css
.p-dialog-enter-active {
    animation: dialog-in 500ms ease-out;
}

.p-dialog-leave-active {
    animation: dialog-out 500ms ease-in;
}
```

## Drawer

Used by: Drawer

```css
.p-drawer-enter-active { /* enter animation */ }
.p-drawer-leave-active { /* leave animation */ }
```

## Disabling Animations

Respect user preferences for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
    .p-anchored-overlay-enter-active,
    .p-anchored-overlay-leave-active {
        animation-duration: 0s !important;
    }
}
```

## Complete Reference Table

| Component | Enter Class | Leave Class |
|-----------|-------------|-------------|
| Accordion | `.p-collapsible-enter-active` | `.p-collapsible-leave-active` |
| AutoComplete | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| CascadeSelect | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| ColorPicker | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| ConfirmPopup | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| ContextMenu | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| DatePicker | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| Dialog | `.p-dialog-enter-active` | `.p-dialog-leave-active` |
| Drawer | `.p-drawer-enter-active` | `.p-drawer-leave-active` |
| Fieldset | `.p-collapsible-enter-active` | `.p-collapsible-leave-active` |
| Galleria | `.p-galleria-enter-active` | `.p-galleria-leave-active` |
| Image | `.p-image-original-enter-active` | `.p-image-original-leave-active` |
| Menu | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| Message | `.p-message-enter-active` | `.p-message-leave-active` |
| Modal Masks | `.p-overlay-mask-enter-active` | `.p-overlay-mask-leave-active` |
| MultiSelect | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| Panel | `.p-collapsible-enter-active` | `.p-collapsible-leave-active` |
| PanelMenu | `.p-collapsible-enter-active` | `.p-collapsible-leave-active` |
| Password | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| Select | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| Stepper | `.p-collapsible-enter-active` | `.p-collapsible-leave-active` |
| TieredMenu | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |
| Toast | `.p-toast-message-enter-active` | `.p-toast-message-leave-active` |
| TreeSelect | `.p-anchored-overlay-enter-active` | `.p-anchored-overlay-leave-active` |

## Tailwind Animation Utilities

The `tailwindcss-primeui` plugin adds extended animation utilities for use with `StyleClass` and `AnimateOnScroll` directives.

### Prebuilt Animations

| Class | Animation |
|-------|-----------|
| `animate-fadein` | fadein 0.15s linear |
| `animate-fadeout` | fadeout 0.15s linear |
| `animate-slidedown` | slidedown 0.45s ease-in-out |
| `animate-slideup` | slideup 0.45s cubic-bezier(0, 1, 0, 1) |
| `animate-scalein` | scalein 0.15s linear |
| `animate-fadeinleft` | fadeinleft 0.15s linear |
| `animate-fadeoutleft` | fadeoutleft 0.15s linear |
| `animate-fadeinright` | fadeinright 0.15s linear |
| `animate-fadeoutright` | fadeoutright 0.15s linear |
| `animate-fadeinup` | fadeinup 0.15s linear |
| `animate-fadeoutup` | fadeoutup 0.15s linear |
| `animate-fadeindown` | fadeindown 0.15s linear |
| `animate-flip` | flip 0.15s linear |
| `animate-flipup` | flipup 0.15s linear |
| `animate-flipleft` | flipleft 0.15s linear |
| `animate-flipright` | flipright 0.15s linear |
| `animate-zoomin` | zoomin 0.15s linear |
| `animate-zoomindown` | zoomindown 0.15s linear |
| `animate-zoominleft` | zoominleft 0.15s linear |
| `animate-zoominright` | zoominright 0.15s linear |
| `animate-zoominup` | zoominup 0.15s linear |
| `animate-width` | width 0.15s linear |

### Duration

| Class | Value |
|-------|-------|
| `animate-duration-75` | 75ms |
| `animate-duration-100` | 100ms |
| `animate-duration-200` | 200ms |
| `animate-duration-300` | 300ms |
| `animate-duration-500` | 500ms |
| `animate-duration-700` | 700ms |
| `animate-duration-1000` | 1000ms |
| `animate-duration-2000` | 2000ms |
| `animate-duration-[value]` | custom |

### Iteration Count

| Class | Value |
|-------|-------|
| `animate-infinite` | infinite |
| `animate-once` | 1 |
| `animate-twice` | 2 |

### Custom Enter/Leave

Build custom animations declaratively with `animate-enter` / `animate-leave` combined with:

- `fade-in-{value}` / `fade-out-{value}` — opacity (e.g., `fade-in-50`)
- `zoom-in-{value}` / `zoom-out-{value}` — scale
- `spin-in-{value}` / `spin-out-{value}` — rotation
- `slide-in-from-t-{value}` / `slide-out-to-t-{value}` — translateY
- `slide-in-from-l-{value}` / `slide-out-to-l-{value}` — translateX

Arbitrary values supported: `fade-in-[15]`, `zoom-in-[0.8]`, `spin-in-[60deg]`
