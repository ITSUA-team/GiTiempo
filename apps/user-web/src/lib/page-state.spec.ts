import { describe, expect, it } from "vitest";

import { resolveDataPageState } from "./page-state";

describe("resolveDataPageState", () => {
  it("keeps loading as the highest priority state", () => {
    expect(
      resolveDataPageState({
        hasRequestError: true,
        isEmpty: true,
        isLoading: true,
      }),
    ).toBe("loading");
  });

  it("keeps request errors distinct from empty results", () => {
    expect(
      resolveDataPageState({
        hasRequestError: true,
        isEmpty: true,
        isLoading: false,
      }),
    ).toBe("request-error");
  });

  it("returns empty only when loading and request errors are absent", () => {
    expect(
      resolveDataPageState({
        hasRequestError: false,
        isEmpty: true,
        isLoading: false,
      }),
    ).toBe("empty");
  });

  it("returns ready when no terminal state applies", () => {
    expect(
      resolveDataPageState({
        hasRequestError: false,
        isEmpty: false,
        isLoading: false,
      }),
    ).toBe("ready");
  });
});
