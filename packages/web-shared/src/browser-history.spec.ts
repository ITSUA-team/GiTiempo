import { describe, expect, it } from "vitest";

import { hasPriorBrowserHistory } from "./browser-history";

describe("hasPriorBrowserHistory", () => {
  it("returns true when the current tab has a prior history entry", () => {
    expect(
      hasPriorBrowserHistory({
        history: { length: 2 } as Window["history"],
      }),
    ).toBe(true);
  });

  it("returns false when the current tab has no prior history entry", () => {
    expect(
      hasPriorBrowserHistory({
        history: { length: 1 } as Window["history"],
      }),
    ).toBe(false);
  });

  it("returns false when window is unavailable", () => {
    expect(hasPriorBrowserHistory(undefined)).toBe(false);
  });
});
