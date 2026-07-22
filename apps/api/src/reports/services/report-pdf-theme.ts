/**
 * Design tokens for the PDF export, from the approved "Report PDF Preview"
 * .pen frame.
 *
 * Most colours mirror `packages/web-config/src/styles/tokens.css`, which is
 * the source of truth for the brand palette. The API cannot import it: that
 * file is CSS, and `@gitiempo/web-config` is an ESM web package that pulls in
 * `@primeuix/themes`. The values below are therefore mirrored by hand — the
 * comment on each names its counterpart, so a palette change can be applied to
 * both. Only `groupFill` and `textNested` are PDF-only.
 */

export const COLOR = {
  /** --color-accent-tint — masthead logo chip. */
  accentTint: '#E8E1F5',
  /** --color-brand — accent bar and logo mark. */
  brand: '#5D2B85',
  /** --color-divider — rules between body rows. */
  divider: '#EEEEEE',
  /** PDF only — tint behind top-level group rows. */
  groupFill: '#F5F0FA',
  /** --color-text-dark — primary text and closing rules. */
  textDark: '#1A1A1A',
  /** --color-text-muted — labels, captions, footers. */
  textMuted: '#666666',
  /** PDF only — nested leaf rows, one step lighter than body text. */
  textNested: '#555555',
} as const;

/**
 * pdfmake's built-in font dictionary, passed to the printer.
 *
 * The design calls for Inter, a webfont pdfmake cannot embed without shipping
 * font files; Helvetica is the closest metric-compatible standard PDF font.
 * This is the recorded deviation from the "Report PDF Preview" frame.
 */
export const STANDARD_FONTS = {
  Helvetica: {
    bold: 'Helvetica-Bold',
    bolditalics: 'Helvetica-BoldOblique',
    italics: 'Helvetica-Oblique',
    normal: 'Helvetica',
  },
};

/** Family for `defaultStyle`; typed so it must name a STANDARD_FONTS entry. */
export const DEFAULT_FONT: keyof typeof STANDARD_FONTS = 'Helvetica';

/** Type scale in points. */
export const FONT = {
  base: 10,
  caption: 8,
  emphasis: 9.5,
  micro: 7.5,
  nested: 8.5,
  number: 9,
  stat: 14,
  title: 20,
  wordmark: 12,
} as const;

/** A4 page geometry in points. */
export const PAGE = {
  /** Width of the brand accent bar drawn across the top of every page. */
  accentBarHeight: 6,
  marginBottom: 48,
  marginTop: 42,
  marginX: 48,
  size: 'A4',
  width: 595.28,
} as const;

export const TABLE = {
  /** Name, hours, billable, bill % — shared by the body table and total row. */
  columnWidths: ['*', 70, 70, 50],
  indentPerLevel: 12,
} as const;
