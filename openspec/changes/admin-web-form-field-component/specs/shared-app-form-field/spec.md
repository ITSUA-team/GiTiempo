# Shared AppFormField Component Specification

## Purpose

Define the behavior of the `AppFormField` shared label-above-slot wrapper available in `@gitiempo/web-shared` for wrapping any form control (Select, MultiSelect, DatePicker, etc.) with a consistently styled label.

## Requirements

### Requirement: AppFormField Renders A Label Above Its Slotted Control

`AppFormField` MUST render a visible label text above whatever control is placed in its default slot, so consumers do not need to write inline label div boilerplate.

#### Scenario: Standard size label

- **WHEN** `AppFormField` is rendered with `label` prop and no `size` prop (or `size="md"`)
- **THEN** the label is displayed at `fontSize:13, fontWeight:500` using `$color-text-dark`
- **AND** the slotted control is rendered below the label

#### Scenario: Compact size label

- **WHEN** `AppFormField` is rendered with `size="sm"`
- **THEN** the label is displayed at `fontSize:12, fontWeight:500` using `$color-text-dark`

### Requirement: AppFormField Gap Matches Design Spec

`AppFormField` MUST use a `gap` of `6px` between label and control to match the design's `gap:6` on field wrappers.

#### Scenario: Label and control gap

- **WHEN** `AppFormField` is rendered
- **THEN** the vertical gap between label text and the slotted control is `6px`
