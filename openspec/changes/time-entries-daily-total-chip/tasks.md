## 1. Day total calculation

- [x] 1.1 Carry a total on the day group, computed where entries are grouped so it advances with the clock
- [x] 1.2 Resolve an entry's duration from its stored value, falling back to its timestamps when that value is absent
- [x] 1.3 Count each entry at full length rather than clipping it to the day boundary, so the total matches the rows
- [x] 1.4 Test that a day total counts a running entry up to the current moment and keeps days separate
- [x] 1.5 Test that a duration is derived when the stored one is missing, for both a finished and a running entry

## 2. Design

- [x] 2.1 Draw the total as a tinted chip in both day headers of the Time Entries frame, reusing the existing status-chip values
- [x] 2.2 Wrap the day label and chip in a heading group so the header keeps two children under `space_between`
- [x] 2.3 Give the mock totals figures that reconcile with the rows beneath them
- [ ] 2.4 Open the frame in Pencil and confirm the chip renders as drawn

## 3. Bring the page to the design

- [ ] 3.1 Render the total as the chip: tint fill, `$radius-sm` corner, clock glyph and duration in brand colour
- [ ] 3.2 Remove the em dash separator and the bare-text treatment from the heading
- [ ] 3.3 Keep the day label and chip in one group so the create action stays at the right edge
- [ ] 3.4 Keep the spacing explicit rather than relying on template whitespace, which Vue drops between elements across a newline
- [ ] 3.5 Test that the heading renders the chip and no longer renders a separator character

## 4. Verification

- [ ] 4.1 Run typecheck, lint, and the user-web test suite
- [ ] 4.2 Confirm no API, shared contract, or migration change was introduced
- [ ] 4.3 Check the heading at the mobile breakpoint, where the date and chip share a narrow row
