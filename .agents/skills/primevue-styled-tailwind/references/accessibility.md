# Accessibility

PrimeVue aims for WCAG 2.1 AA level compliance. All components include keyboard navigation, screen reader support, and ARIA attributes.

## Table of Contents

- [Disability Categories](#disability-categories)
- [WCAG Guidelines](#wcag-guidelines)
- [Form Controls](#form-controls)
- [Semantic HTML](#semantic-html)
- [WAI-ARIA](#wai-aria)
- [Color Guidelines](#color-guidelines)
- [PrimeVue Accessibility Features](#primevue-accessibility-features)

## Disability Categories

| Category | Considerations | Assistive Technology |
|----------|---------------|---------------------|
| **Visual** | Blindness, low vision, color blindness | Screen readers (NVDA, JAWS, ChromeVox), magnifiers |
| **Hearing** | Deafness, partial hearing loss | Captions, transcripts, textual alternatives |
| **Mobility** | Movement disabilities, paralysis | Keyboard navigation, head pointers, trackpads |
| **Cognitive** | Learning disabilities, dyslexia | Clear design, simple language |

## WCAG Guidelines

[WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) (Web Content Accessibility Guideline) is a W3C standard. PrimeVue targets high WCAG compliance.

Relevant legal frameworks:
- **Section 508** (US)
- **Web Accessibility Directive** (EU)

## Form Controls

Always prefer native form elements over custom HTML:

```html
<!-- GOOD: native button — tabbable, keyboard accessible -->
<button @click="onButtonClick(event)">Click</button>

<!-- BAD: div has no keyboard/screen reader support -->
<div class="fancy-button" @click="onButtonClick(event)">Click</div>
```

Always associate labels with form controls:

```html
<label for="myinput">Username:</label>
<input id="myinput" type="text" name="username" />
```

## Semantic HTML

Use semantic elements instead of generic divs:

```html
<!-- BAD — no semantics for screen readers -->
<div class="header"><div class="header-text">Header</div></div>
<div class="nav"></div>
<div class="main"><div class="content"></div></div>

<!-- GOOD — semantic elements with built-in accessibility -->
<header><h1>Header</h1></header>
<nav></nav>
<main>
    <article></article>
    <aside></aside>
</main>
<footer></footer>
```

## WAI-ARIA

ARIA fills gaps where semantic HTML is insufficient for rich UI components:
- **Roles** define element purpose: `checkbox`, `dialog`, `tablist`
- **States/Properties** provide metadata: `aria-checked`, `aria-disabled`, `aria-labelledby`

Best practice: combine semantic HTML with custom design. Use `p-hidden-accessible` to hide native elements visually while keeping them accessible:

```html
<label for="chkbox">Remember Me</label>
<div class="fancy-checkbox" @click="toggle">
    <input class="p-hidden-accessible" type="checkbox" id="chkbox">
    <i class="checked-icon" v-if="checked"></i>
</div>
```

## Color Guidelines

### Contrast Ratio
Minimum **4.5:1** contrast ratio between background and foreground content.

### Color Vibration
Avoid color combinations that cause visual vibration — colors with low visibility against each other.

### Dark Mode Colors
Avoid highly saturated colors in dark themes — they cause eye strain. Use desaturated colors instead:
- Bad: `Indigo 500` in dark mode
- Good: `Indigo 200` in dark mode

## PrimeVue Accessibility Features

All PrimeVue components include:
- Keyboard navigation (Tab, Arrow keys, Enter, Space, Escape)
- ARIA roles and attributes
- Screen reader labels
- Focus management
- Color scheme support (light/dark)

Component-specific accessibility documentation is available via the MCP server's `get_accessibility_info` tool or on each component's documentation page.
