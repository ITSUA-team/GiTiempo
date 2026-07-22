import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLOR } from './report-pdf-theme';

/**
 * The PDF palette mirrors the web brand tokens by hand, because the API cannot
 * import a CSS file from an ESM web package. This test is what keeps the two
 * from drifting: if the brand palette changes in web-config, it fails here.
 */
const tokensCss = readFileSync(
  join(__dirname, '../../../../../packages/web-config/src/styles/tokens.css'),
  'utf8',
);

function cssToken(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokensCss);
  if (!match) throw new Error(`token --${name} not found in tokens.css`);
  return match[1]!.toLowerCase();
}

describe('report PDF palette', () => {
  it.each([
    ['brand', 'color-brand'],
    ['accentTint', 'color-accent-tint'],
    ['textDark', 'color-text-dark'],
    ['textMuted', 'color-text-muted'],
    ['divider', 'color-divider'],
  ] as const)('%s matches the web token --%s', (key, token) => {
    expect(COLOR[key].toLowerCase()).toBe(cssToken(token));
  });

  it('keeps the PDF-only colours out of the shared palette', () => {
    expect(tokensCss).not.toContain(COLOR.groupFill.toLowerCase());
    expect(tokensCss).not.toContain(COLOR.textNested.toLowerCase());
  });
});
