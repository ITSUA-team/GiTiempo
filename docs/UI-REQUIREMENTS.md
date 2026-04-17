# UI Requirements

Build-ready design constraints derived from [PROPOSAL.md](./PROPOSAL.md) and [TECHNICAL-REQUIREMENTS.md](./TECHNICAL-REQUIREMENTS.md).

---

## 1. Design System

### 1.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| Brand Purple | `#5D2B85` | Primary accent, folder icons, active states, filled buttons |
| Accent Tint | `#E8E1F5` | Active row backgrounds, tag fills, hover states on list items |
| Surface | `#FFFFFF` | Card and container backgrounds |
| App Background | `#F4F4F5` | Main application canvas |
| Text Dark | `#1A1A1A` | Headings, primary body copy |
| Text Muted | `#666666` | Secondary info, timestamps, metadata labels |
| Dividers | `#EEEEEE` | Borders, separators, table row lines |

**Usage rules:**

- Never use Brand Purple as a background for large areas — reserve it for accents, icons, and focused elements.
- Accent Tint is the only permitted purple-tinted background surface.
- All text on Brand Purple backgrounds must be `#FFFFFF`.
- All text on Accent Tint backgrounds must be `#1A1A1A` or `#5D2B85`.

### 1.2 Typography

| Role | Font | Weight | Size (base) |
|---|---|---|---|
| Font Family | `'Inter', sans-serif` | — | — |
| Page headings (H1) | Inter | 600 (Semi-bold) | 24px |
| Section headings (H2) | Inter | 600 (Semi-bold) | 18px |
| Card / panel headings (H3) | Inter | 600 (Semi-bold) | 16px |
| Primary body / labels | Inter | 500 (Medium) | 14px |
| Secondary body / metadata | Inter | 400 (Regular) | 13px |
| Captions / helper text | Inter | 400 (Regular) | 12px |

**Usage rules:**

- Weight 600 is restricted to headings, active navigation labels, and key numeric values (e.g., total hours).
- Weight 500 is the default for all interactive elements: buttons, form labels, table column headers.
- Weight 400 is for supporting text: descriptions, timestamps, secondary rows.
- Never use weight below 400.
- Line height: `1.5` for body copy, `1.2` for headings.

### 1.3 Spacing Scale

Base unit: `4px`. All padding, margin, and gap values must be multiples of `4px`.

| Step | Value | Typical use |
|---|---|---|
| xs | 4px | Icon-to-label gap, dense table cell padding |
| sm | 8px | Inline element spacing, compact list items |
| md | 12px | Form field internal padding, card inner padding |
| base | 16px | Default block spacing, button padding |
| lg | 24px | Section vertical gap, card gap in grid |
| xl | 32px | Page section spacing |
| 2xl | 48px | Major layout separation |

### 1.4 Border Radius

| Context | Radius |
|---|---|
| Buttons, form inputs, tags | `6px` |
| Cards, panels, modals | `10px` |
| Avatars | `50%` (full circle) |
| Tooltips, dropdowns | `8px` |

### 1.5 Elevation / Shadows

Use shadows sparingly. Only cards and floating surfaces (dropdowns, modals, tooltips) receive elevation.

| Level | Usage | Shadow value |
|---|---|---|
| 0 | Flat surfaces, inline elements | none |
| 1 | Cards, panels | `0 1px 4px rgba(0,0,0,0.08)` |
| 2 | Dropdowns, popovers | `0 4px 12px rgba(0,0,0,0.12)` |
| 3 | Modals, dialogs | `0 8px 32px rgba(0,0,0,0.16)` |

---

## 2. Component Conventions

### 2.1 Buttons

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `#5D2B85` | `#FFFFFF` | none | Main actions (Save, Start Timer, Create) |
| Secondary | `#FFFFFF` | `#5D2B85` | `1px solid #5D2B85` | Alternative actions (Cancel, Edit) |
| Ghost | transparent | `#5D2B85` | none | Low-emphasis actions (Clear, View all) |
| Destructive | `#FFFFFF` | `#D32F2F` | `1px solid #D32F2F` | Delete, Disconnect |
| Disabled | `#F4F4F5` | `#666666` | `1px solid #EEEEEE` | Any unavailable action |

- Button height: `36px` (default), `32px` (compact), `40px` (large/CTA).
- Minimum touch target: `44×44px` (met by padding, not by visual size alone).
- Loading state: replace label with a spinner; keep button width fixed to prevent layout shift.

### 2.2 Form Inputs

- Height: `38px` for single-line inputs, auto-height for textarea.
- Border: `1px solid #EEEEEE`, focused border: `2px solid #5D2B85` (no outline rings).
- Background: `#FFFFFF`.
- Placeholder text: `#666666`, weight 400.
- Error state: border `2px solid #D32F2F`, error message in 12px / weight 400 / `#D32F2F` below the field.
- Labels: placed above the field, 13px / weight 500 / `#1A1A1A`.

### 2.3 Tables

- Header row: background `#F4F4F5`, text `#1A1A1A` / 13px / weight 500, uppercase tracking.
- Row: background `#FFFFFF`, border-bottom `1px solid #EEEEEE`, row height `48px`.
- Active / selected row: background `#E8E1F5`, text `#1A1A1A`.
- Hover row: background `#F4F4F5`.
- Numeric columns (hours, amounts) are right-aligned.
- Sortable column header: show a sort arrow icon on hover; active direction in Brand Purple.

### 2.4 Tags / Badges

- Background: `#E8E1F5`, text: `#5D2B85`, border-radius: `6px`, padding: `2px 8px`, font: 12px / weight 500.
- Status variants override the background:

| Status | Background | Text |
|---|---|---|
| Running / Active | `#E8F5E9` | `#2E7D32` |
| Completed | `#E8E1F5` | `#5D2B85` |
| Pending / Draft | `#FFF8E1` | `#F57F17` |
| Error | `#FFEBEE` | `#C62828` |

### 2.5 Avatars

- Default size: `32px` diameter.
- Fallback: circle filled with `#E8E1F5`, initials in `#5D2B85` / 13px / weight 600.
- Large (profile page): `64px`.

### 2.6 Icons

- Library: Heroicons (outline set by default; solid for active/filled states).
- Default size: `20px` inline with text, `16px` inside buttons, `24px` for standalone actions.
- Color: inherit from parent text color unless semantically overridden (e.g., folder icon = `#5D2B85`).

### 2.7 Empty States

Each list, table, and dashboard widget must define an empty state:

- Centered illustration or icon (48–64px, color `#E8E1F5` fill with `#5D2B85` stroke).
- Primary message: 16px / weight 600 / `#1A1A1A`.
- Supporting message: 14px / weight 400 / `#666666`.
- Optional CTA button (Primary variant).

### 2.8 Loading States

- **Inline data** (tables, lists): use skeleton rows matching the content's approximate height and column layout.
- **Full page initial load**: centered spinner in Brand Purple.
- **Button actions**: inline spinner replaces label text (see §2.1).
- Skeleton background: `#F4F4F5`, animated shimmer using `#EEEEEE`.

---

## 3. Layout & Navigation

### 3.1 Overall Shell

Both the User SPA and Admin SPA share the same shell structure:

```
┌─────────────────────────────────────────────┐
│  Top Bar (64px)                             │
│  Logo | Nav tabs (or none) | User avatar    │
├──────────────┬──────────────────────────────┤
│              │                              │
│  Sidebar     │  Main Content Area           │
│  (240px)     │  (fluid, min 0)              │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

- **Top Bar:** background `#FFFFFF`, border-bottom `1px solid #EEEEEE`, height `64px`.
  - Left: product logo + workspace name (16px / weight 600 / `#1A1A1A`).
  - Right: user avatar + display name, settings icon.
- **Sidebar:** background `#FFFFFF`, border-right `1px solid #EEEEEE`, width `240px` (collapsible to `64px` icon-only on narrow viewports).
- **Main Content Area:** background `#F4F4F5`, padding `24px`.

### 3.2 Sidebar Navigation

- Nav item height: `44px`, padding `0 16px`.
- Default state: text `#1A1A1A` / 14px / weight 500, icon `#666666`.
- Hover: background `#F4F4F5`.
- Active: background `#E8E1F5`, text `#5D2B85` / weight 600, icon `#5D2B85`, left border `3px solid #5D2B85`.
- Section dividers between nav groups: `1px solid #EEEEEE` with 8px vertical margin.

### 3.3 Responsive Breakpoints

| Breakpoint | Width | Layout change |
|---|---|---|
| Mobile | < 640px | Sidebar hidden; bottom navigation bar (5 items max) |
| Tablet | 640px – 1024px | Sidebar collapses to icon-only (64px) |
| Desktop | > 1024px | Full sidebar (240px), standard layout |

> MVP target is desktop-first. Mobile layout is required but de-prioritized for styling polish.

### 3.4 Page Header Pattern

Every page has a consistent header block:

```
┌───────────────────────────────────────────┐
│  Page Title (H1)          [Primary CTA]   │
│  Optional subtitle / breadcrumb           │
└───────────────────────────────────────────┘
```

- Title: 24px / weight 600 / `#1A1A1A`.
- Subtitle: 14px / weight 400 / `#666666`.
- CTA button (Primary variant) right-aligned, vertically centered with title.

---

## 4. User SPA — Page Specifications

### 4.1 Dashboard

- **Active Timer widget:** prominent card (full-width), shows task name, project, elapsed time (HH:MM:SS in 24px / weight 600 / Brand Purple), Stop button (Destructive variant).
- **Recent Time Entries:** table showing last 10 entries — columns: Task, Project, Date, Duration, Actions (Edit / Delete icons). No entries → empty state with "Start your first timer" CTA.
- **Stats row (optional for MVP):** 3 stat cards (Today's total, This week, This month) — value in 24px / weight 600 / `#1A1A1A`, label in 12px / weight 400 / `#666666`.

### 4.2 Timer Page

- **Task Selector:** cascading dropdown sequence — Organization → Project/Repo → Issue. Each level renders as a searchable dropdown. Selected path shown as breadcrumb: `Org / Project / Issue #123` in 14px / weight 500.
- **Manual Task Input:** text input shown as a fallback when no GitHub connection is present or user selects "Manual entry". Input placeholder: "What are you working on?".
- **Start / Stop Button:** large (48px height), full-width on mobile, 240px fixed width on desktop. Start = Primary variant; Stop = Destructive variant. Disabled until a task is selected or a description is entered.
- **Timer Display:** centered, 48px / weight 600 / `#5D2B85`, format `HH:MM:SS`.
- **Manual Interval Entry:** collapsible panel below the timer — Date picker, Start time, End time, Duration (auto-calculated). Inputs follow standard form conventions (§2.2).

### 4.3 Time Entries Page

- **Filters bar:** Date range picker + Project filter (multi-select dropdown) + Search input. All in a single horizontal row.
- **Entries list:** grouped by day. Each group has a day header (`Monday, Apr 14 · 3h 20m`) in 13px / weight 600 / `#666666` with a right-aligned daily total.
- **Entry row:** Task name (weight 500), Project (weight 400 / `#666666`), Time range, Duration, Edit (Ghost button) / Delete (Ghost button / destructive text). Active (running) entry highlighted with Accent Tint background.
- **Inline edit:** clicking Edit opens an inline form within the row (not a modal) for fast edits.

### 4.4 Project View Page

- Header: Project name, description, total tracked hours to date.
- Read-only time entries table filtered to the selected project. Columns: Member, Task, Date, Duration.
- No edit or delete actions visible — this is a view-only page for members.

### 4.5 Profile Page

- **Display Name:** editable inline field.
- **GitHub Connection card:**
  - Disconnected: Brand Purple "Connect GitHub" button, description of what it enables.
  - Connected: avatar, GitHub username, scopes list, "Disconnect" button (Destructive variant), last-synced timestamp in Text Muted.
- **Sign Out:** Ghost button at the bottom of the page, destructive text color.

---

## 5. Admin SPA — Page Specifications

### 5.1 Dashboard

- **Summary stat cards (4):** Total hours this month, Active members, Open projects, Unpaid invoices. Card: Surface background, shadow level 1, stat value 32px / weight 600 / `#1A1A1A`, label 13px / weight 400 / Text Muted.
- **Recent activity feed:** last 20 time entries across all users — same table structure as User SPA §4.3 but read-only with a Member column added.

### 5.2 Reports Page

- **Filter bar:** Project (multi-select), Member (multi-select), Date range, Group by (Project / Member / Date). All filters apply in real-time (debounced 300ms).
- **Summary totals row:** pinned above the table — Total hours, Billable hours, Total amount (based on hourly rate). Background `#E8E1F5`, text `#5D2B85` / weight 600.
- **Results table:** sortable columns — Member, Project, Task, Date, Duration, Billable. Export to CSV button (Ghost variant) in page header CTA position.
- PM restriction: Project and Member filters are pre-scoped to assigned projects; the PM cannot widen the scope.

### 5.3 Invoices Page

- **Invoice list:** table with columns — Invoice #, Project, Date, Hours, Amount, Status (tag), Actions.
- **Create Invoice flow:** modal dialog (not a full page). Fields: Project (dropdown), Date range, Hourly rate (pre-filled from workspace setting), Discount (%). Total amount auto-calculated and displayed prominently (`24px / weight 600`) before Save.
- Status tags use the badge variants from §2.4.

### 5.4 Members Page

- **Members table:** Avatar + Name, Email, Role (tag), Projects assigned (count), Last active, Actions (Edit role, Remove).
- **Invite member:** Primary CTA button in page header. Opens a modal — Email input, Role selector (radio: Member / PM). Submit sends invite.
- **Assign PM to project:** clicking a PM row expands an inline section listing all projects with checkboxes.

### 5.5 Projects Page

- **Project list:** table with columns — Project name (with folder icon in `#5D2B85`), Source (GitHub / Manual tag), Assigned PM, Total hours, Visibility, Actions.
- **Edit project:** inline row expansion — toggle Visibility (Active / Archived), reassign PM.
- **Create manual project:** modal — Name input, Description textarea, optional GitHub repo link.

### 5.6 Settings Page

- Single-column form layout, grouped into labeled sections separated by `1px solid #EEEEEE` dividers.
- **Workspace section:** Workspace name, Default hourly rate (number input with currency prefix).
- **Currency selector:** dropdown with ISO 4217 codes.
- Save button (Primary) pinned to bottom of each section or at page bottom.

---

## 6. Chrome Extension UI

- **Popup dimensions:** `320 × 480px` fixed.
- **Background:** Surface (`#FFFFFF`).
- **Unauthenticated state:** centered login prompt — product logo, "Sign in to GI Tiempo" heading, Primary sign-in button.
- **Authenticated, no active timer:** shows detected issue context (`org/repo#123 Issue Title` in 14px / weight 500), Start Timer button (Primary, full-width), link to open the full User SPA.
- **Authenticated, timer running:** elapsed time display (24px / weight 600 / `#5D2B85`), task name, Stop Timer button (Destructive, full-width).
- **Error / disconnected states:** inline message in Text Muted with a retry action link.
- All type, color, and spacing rules from §1 apply. No custom extension-only design tokens.

---

## 7. Shared UI Patterns

### 7.1 Modals & Dialogs

- Backdrop: `rgba(0,0,0,0.4)`.
- Dialog panel: `#FFFFFF`, border-radius `10px`, shadow level 3, max-width `480px` (form dialogs), `640px` (content dialogs).
- Header: title 18px / weight 600, close icon (×) right-aligned.
- Footer: right-aligned button group — Primary action, then Secondary/Cancel. Destructive dialogs replace Primary with a Destructive button and add a warning sentence above the footer.
- Close on backdrop click: enabled for non-destructive dialogs only.

### 7.2 Toast Notifications

- Position: top-right, stacked, max 3 visible.
- Width: `320px`, border-radius `8px`, shadow level 2.
- Auto-dismiss after `4000ms` (errors: manual dismiss only).

| Type | Left border | Icon |
|---|---|---|
| Success | `3px solid #2E7D32` | Check circle |
| Error | `3px solid #C62828` | X circle |
| Info | `3px solid #5D2B85` | Info circle |
| Warning | `3px solid #F57F17` | Warning triangle |

### 7.3 Confirmation Dialogs

Used before all destructive actions (delete, disconnect, remove member):

- Title: "Delete [item]?" — 18px / weight 600.
- Body: one-sentence consequence description — 14px / weight 400 / Text Muted.
- Footer: "Cancel" (Secondary) + "[Destructive label]" (Destructive variant). Destructive button is on the right.

### 7.4 Date & Time Pickers

- Use PrimeVue `Calendar` component.
- Override styles to match brand: active day background `#5D2B85`, text `#FFFFFF`; range fill `#E8E1F5`.
- Time inputs: 24-hour format. Two separate number inputs (HH / MM) rather than a single text field.

### 7.5 Cascading Task Selector

Used on Timer page and anywhere a task must be chosen:

- Three sequential dropdowns: Organization → Project/Repo → Issue.
- Each dropdown is searchable (type-ahead filter).
- A dropdown is disabled until the preceding level is selected.
- Loading spinner replaces options list while fetching.
- Each option line: primary label (name) / weight 500 + secondary label (type or issue number) / weight 400 / Text Muted.

### 7.6 Duration Display Format

All duration values across the application must render as `Xh Ym` (e.g., `2h 15m`). Running timer displays as `HH:MM:SS`. Never show raw seconds except in the running timer.

---

## 8. Accessibility

- All interactive elements must have a visible focus indicator: `2px solid #5D2B85` outline, `2px offset`.
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text (WCAG 2.1 AA).
- All form inputs must have associated `<label>` elements (not just `placeholder`).
- Icon-only buttons must have `aria-label`.
- Modals must trap focus and restore focus to the trigger element on close.
- Tables must use `<th scope="col">` and `aria-sort` for sortable columns.
