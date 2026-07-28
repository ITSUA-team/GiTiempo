import { describe, expect, it, vi } from "vitest";
import {
  completeGithubSignInCallback,
  githubCallbackErrorMessages,
  resolveGithubSignInError,
} from "./github-callback";

describe("resolveGithubSignInError", () => {
  it("maps a known code to its message", () => {
    expect(resolveGithubSignInError("denied")).toBe(
      githubCallbackErrorMessages.denied,
    );
  });

  it("maps an unknown code to the generic failed message", () => {
    expect(resolveGithubSignInError("weird")).toBe(
      githubCallbackErrorMessages.failed,
    );
  });

  it("takes the first value of a repeated query param", () => {
    expect(resolveGithubSignInError(["state", "denied"])).toBe(
      githubCallbackErrorMessages.state,
    );
  });

  it("returns null when there is no error to show", () => {
    expect(resolveGithubSignInError(undefined)).toBeNull();
    expect(resolveGithubSignInError(null)).toBeNull();
    expect(resolveGithubSignInError("")).toBeNull();
  });
});

describe("completeGithubSignInCallback", () => {
  it("hands the login page the query error code, without exchanging", async () => {
    const exchange = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await completeGithubSignInCallback(
      { githubError: "denied", code: "ignored" },
      { exchange, onSuccess, onError },
    );

    expect(onError).toHaveBeenCalledWith("denied");
    expect(exchange).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("normalizes an unknown query error code to failed", async () => {
    const onError = vi.fn();

    await completeGithubSignInCallback(
      { githubError: "weird", code: null },
      { exchange: vi.fn(), onSuccess: vi.fn(), onError },
    );

    expect(onError).toHaveBeenCalledWith("failed");
  });

  it("exchanges a code and calls onSuccess with no redirect", async () => {
    const exchange = vi.fn(async () => {});
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await completeGithubSignInCallback(
      { githubError: undefined, code: "handoff" },
      { exchange, onSuccess, onError },
    );

    expect(exchange).toHaveBeenCalledWith("handoff");
    expect(onSuccess).toHaveBeenCalledWith(null);
    expect(onError).not.toHaveBeenCalled();
  });

  it("passes a preserved redirect target through to onSuccess", async () => {
    const onSuccess = vi.fn();

    await completeGithubSignInCallback(
      { githubError: undefined, code: "handoff", redirect: "/reports" },
      { exchange: vi.fn(async () => {}), onSuccess, onError: vi.fn() },
    );

    expect(onSuccess).toHaveBeenCalledWith("/reports");
  });

  it("funnels a missing code to failed", async () => {
    const onError = vi.fn();

    await completeGithubSignInCallback(
      { githubError: undefined, code: undefined },
      { exchange: vi.fn(), onSuccess: vi.fn(), onError },
    );

    expect(onError).toHaveBeenCalledWith("failed");
  });

  it("funnels an exchange failure to failed", async () => {
    const onError = vi.fn();

    await completeGithubSignInCallback(
      { githubError: undefined, code: "handoff" },
      {
        exchange: async () => {
          throw new Error("boom");
        },
        onSuccess: vi.fn(),
        onError,
      },
    );

    expect(onError).toHaveBeenCalledWith("failed");
  });
});
