import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PageContext } from "@/lib/github-context";
import type { RuntimeClient, RuntimeMutationResult, RuntimeSnapshot } from "@/lib/runtime";
import { createPopupApp } from "./main";

function currentTimer(): RuntimeSnapshot["currentTimer"] {
  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: null,
    endedAt: null,
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    isBillable: true,
    project: {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      name: "Project Orion",
    },
    projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    source: "extension",
    startedAt: "2026-04-21T09:00:00.000Z",
    githubIssue: null,
    task: {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      title: "Improve reports filters",
    },
    taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    updatedAt: "2026-04-21T09:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
    },
    userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
    workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
  };
}

function createRuntimeClient(overrides?: {
  exchangeFirebaseToken?: RuntimeClient["exchangeFirebaseToken"];
  snapshot?: RuntimeSnapshot;
  startTimer?: RuntimeClient["startTimer"];
  stopTimer?: () => Promise<RuntimeMutationResult>;
}): RuntimeClient {
  return {
    exchangeFirebaseToken:
      overrides?.exchangeFirebaseToken ??
      vi.fn(async () => ({ authenticated: true, currentTimer: null, errorMessage: null })),
    getSnapshot: vi.fn(async () =>
        overrides?.snapshot ?? {
          authenticated: false,
          currentTimer: null,
          errorMessage: null,
        }),
    onSnapshotUpdated: vi.fn(() => () => undefined),
    openExtension: vi.fn(async () => undefined),
    startTimer:
      overrides?.startTimer ??
      vi.fn(async () => ({
        ok: true,
        snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
      })),
    stopTimer:
      overrides?.stopTimer ??
      vi.fn(async () => ({
        ok: true,
        snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
      })),
  };
}

function supportedContext(): PageContext {
  return {
    githubRepo: "octo/repo",
    issueNumber: 184,
    issueTitle: "Improve reports filters",
    issueUrl: "https://github.com/octo/repo/issues/184",
    kind: "supported",
  };
}

describe("popup app", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("renders the unauthenticated popup state with sign-in actions", async () => {
    const runtimeClient = createRuntimeClient();
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
    });

    await app.load();

    expect(document.body.textContent).toContain("Sign in with Google");
    expect(document.body.textContent).toContain("Sign in with email");
  });

  it("submits Google sign-in through Firebase and exchanges the token", async () => {
    const exchangeFirebaseToken = vi.fn(async () => ({
      authenticated: true,
      currentTimer: null,
      errorMessage: null,
    }));
    const runtimeClient = createRuntimeClient({ exchangeFirebaseToken });
    const signInWithGoogleFn = vi.fn(async () => "firebase-google-token");
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
      signInWithGoogleFn,
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="google-sign-in"]')!
      .click();

    await Promise.resolve();
    await Promise.resolve();

    expect(signInWithGoogleFn).toHaveBeenCalledOnce();
    expect(exchangeFirebaseToken).toHaveBeenCalledWith("firebase-google-token");
  });

  it("shows a retryable error and re-enables actions after Google sign-in fails", async () => {
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient(),
      pageContextResolver: async () => ({ kind: "unsupported" }),
      signInWithGoogleFn: vi.fn(async () => {
        throw new Error("Google popup blocked");
      }),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="google-sign-in"]')!
      .click();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.body.textContent).toContain("Google popup blocked");
    expect(
      document.querySelector<HTMLButtonElement>('[data-action="google-sign-in"]')?.disabled,
    ).toBe(false);
  });

  it("submits email sign-in through Firebase and exchanges the token", async () => {
    const exchangeFirebaseToken = vi.fn(async () => ({
      authenticated: true,
      currentTimer: null,
      errorMessage: null,
    }));
    const runtimeClient = createRuntimeClient({ exchangeFirebaseToken });
    const signInWithEmailPasswordFn = vi.fn(async () => "firebase-email-token");
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
      signInWithEmailPasswordFn,
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="toggle-email"]')!
      .click();
    document.querySelector<HTMLInputElement>('[data-field="email"]')!.value =
      "alexey@example.com";
    document
      .querySelector<HTMLInputElement>('[data-field="email"]')!
      .dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector<HTMLInputElement>('[data-field="password"]')!.value =
      "password123";
    document
      .querySelector<HTMLInputElement>('[data-field="password"]')!
      .dispatchEvent(new Event("input", { bubbles: true }));
    document
      .querySelector<HTMLFormElement>('[data-form="email-sign-in"]')!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(signInWithEmailPasswordFn).toHaveBeenCalledWith(
      "alexey@example.com",
      "password123",
    );
    expect(exchangeFirebaseToken).toHaveBeenCalledWith("firebase-email-token");
  });

  it("shows a retryable error and keeps the email form usable after email sign-in fails", async () => {
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient(),
      pageContextResolver: async () => ({ kind: "unsupported" }),
      signInWithEmailPasswordFn: vi.fn(async () => {
        throw new Error("Invalid email or password");
      }),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="toggle-email"]')!
      .click();
    document.querySelector<HTMLInputElement>('[data-field="email"]')!.value =
      "alexey@example.com";
    document
      .querySelector<HTMLInputElement>('[data-field="email"]')!
      .dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector<HTMLInputElement>('[data-field="password"]')!.value =
      "bad-password";
    document
      .querySelector<HTMLInputElement>('[data-field="password"]')!
      .dispatchEvent(new Event("input", { bubbles: true }));
    document
      .querySelector<HTMLFormElement>('[data-form="email-sign-in"]')!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    const submitButton = document.querySelector<HTMLButtonElement>(
      '[data-form="email-sign-in"] button',
    );

    expect(document.body.textContent).toContain("Invalid email or password");
    expect(document.querySelector('[data-form="email-sign-in"]')).not.toBeNull();
    expect(submitButton).not.toBeNull();
    expect(submitButton?.disabled).toBe(false);
  });

  it("renders the authenticated no-timer popup state on supported issue pages", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();

    expect(document.body.textContent).toContain("Start Timer");
    expect(document.body.textContent).toContain("Improve reports filters");
    expect(document.body.textContent).toContain("Open full workspace in GiTiempo");
  });

  it("renders the authenticated unsupported-page state", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
    });

    await app.load();

    expect(document.body.textContent).toContain(
      "Open a GitHub issue page to start a timer.",
    );
  });

  it("renders the running timer popup state", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true,
        currentTimer: currentTimer(),
        errorMessage: null,
      },
    });
    const app = createPopupApp({
      now: () => new Date("2026-04-21T10:00:00.000Z").getTime(),
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();

    expect(document.body.textContent).toContain("Stop Timer");
    expect(document.body.textContent).toContain("01:00:00");
    expect(document.body.textContent).toContain("Project Orion / octo/repo");
  });

  it("adds explicit focus-visible styles to popup primary actions", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();

    expect(
      document
        .querySelector<HTMLButtonElement>('[data-action="start-timer"]')
        ?.className,
    ).toContain("focus-visible:outline-brand");
  });

  it("starts a timer from the supported popup state", async () => {
    const startTimer = vi.fn(async () => ({
      ok: true,
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
    }));
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
      startTimer,
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="start-timer"]')!
      .click();

    await Promise.resolve();

    expect(startTimer).toHaveBeenCalledWith(supportedContext());
  });

  it("shows the retryable error state after a failed stop action", async () => {
    const stopTimer = vi.fn(async () => ({
      ok: false,
      errorMessage: "Timer stop failed",
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
    }));
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true,
        currentTimer: currentTimer(),
        errorMessage: null,
      },
      stopTimer,
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="stop-timer"]')!
      .click();

    await Promise.resolve();

    expect(document.body.textContent).toContain("Timer stop failed");
    expect(document.body.textContent).toContain("Retry connection");
  });

  it("shows the retryable error state after a rejected start action", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
      startTimer: vi.fn(async () => {
        throw new Error("Runtime unavailable");
      }),
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="start-timer"]')!
      .click();

    await Promise.resolve();

    expect(document.body.textContent).toContain("Runtime unavailable");
    expect(document.body.textContent).toContain("Retry connection");
  });
});
