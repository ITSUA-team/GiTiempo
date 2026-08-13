import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const tokensCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "tokens.css"),
  "utf8",
);

const WCAG_AA_NORMAL_TEXT = 4.5;

const statusPairs = [
  { bg: "--color-status-active-bg", name: "active", text: "--color-status-active-text" },
  { bg: "--color-status-warn-bg", name: "warn", text: "--color-status-warn-text" },
  { bg: "--color-status-error-bg", name: "error", text: "--color-status-error-text" },
];

function readToken(name: string): string {
  const match = tokensCss.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));

  if (!match) {
    throw new Error(`${name} is not defined as a six-digit hex in tokens.css`);
  }

  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("status token contrast", () => {
  it.each(statusPairs)(
    "keeps $name status text readable on its own background",
    ({ bg, text }) => {
      expect(contrastRatio(readToken(text), readToken(bg))).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    },
  );

  it("computes a known contrast ratio", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});
