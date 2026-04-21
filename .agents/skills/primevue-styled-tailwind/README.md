# PrimeVue Styled + Tailwind CSS — Agent Skill

A comprehensive agent skill for working with [PrimeVue v4](https://primevue.org) UI component library in Styled Mode with Tailwind CSS integration.

## Install

```bash
npx skills add akholod/primevue-styled-tailwind
```

## What This Skill Provides

- **Component First** — always checks if PrimeVue has a suitable component before building custom UI (80+ components covered)
- **Design Tokens, Not Hardcoded Colors** — enforces `var(--p-primary-color)`, `bg-primary`, `text-surface-500` instead of `#10b981` or `bg-emerald-500`
- **Tailwind CSS Integration** — `tailwindcss-primeui` plugin, semantic utilities, CSS Layer setup, dark mode sync
- **Forms with Validation** — `@primevue/forms` library, Zod/Yup/Valibot resolvers, FormField component
- **MCP Server Tools** — full reference for PrimeVue MCP server (`list_components`, `get_component`, `suggest_component`, etc.)
- **LLM Documentation Access** — `.md` URL extension (`/button.md`), `/llms.txt`, `/llms-full.txt`
- **Animations Reference** — CSS animation classes for all PrimeVue components
- **Accessibility Guidelines** — WCAG 2.1 AA compliance, ARIA best practices
- **Icons** — PrimeIcons library, Constants API, custom icon integration

## Skill Structure

```
├── SKILL.md                          # Main skill file (~220 lines)
└── references/
    ├── installation-and-config.md    # Vite setup, auto-import, configuration
    ├── theming-and-tailwind.md       # Design tokens, definePreset, CSS layers
    ├── forms.md                      # Form library, validation, resolvers
    ├── animations.md                 # CSS animation classes reference
    ├── accessibility.md              # WCAG, ARIA, color contrast
    └── icons.md                      # PrimeIcons, custom icons
```

## Compatibility

Works with any agent that supports the [Agent Skills specification](https://agentskills.io):
OpenCode, Claude Code, Cursor, Codex, Cline, Windsurf, Gemini CLI, and 40+ more.

## License

MIT
