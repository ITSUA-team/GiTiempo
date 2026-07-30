import { describe, expect, it } from "vitest";

import { deriveProfileInitials } from "./profile-initials.js";

describe("deriveProfileInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(deriveProfileInitials("Alexey Tsukanov", "GT")).toBe("AT");
    expect(deriveProfileInitials("Ada Byron King Lovelace", "GT")).toBe("AB");
  });

  it("uses a single letter for a one-word source", () => {
    expect(deriveProfileInitials("alexey@example.com", "GT")).toBe("A");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(deriveProfileInitials("  alexey   tsukanov  ", "GT")).toBe("AT");
  });

  it("returns the fallback when the source yields no letters", () => {
    expect(deriveProfileInitials("", "GT")).toBe("GT");
    expect(deriveProfileInitials("   ", "NA")).toBe("NA");
  });
});
