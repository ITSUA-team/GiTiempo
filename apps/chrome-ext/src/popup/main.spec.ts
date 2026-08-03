import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PageContext } from "@/lib/github-context";
import type {
  RuntimeAuthResult,
  RuntimeClient,
  RuntimeMutationResult,
  RuntimeSnapshot,
} from "@/lib/runtime";
import { createPopupApp, resolveActivePageContext } from "./main";

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
    githubIssue: {
      githubRepo: "octo/timer-repo",
      issueNumber: 184,
    },
    task: {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      title: "Improve reports filters",
    },
    taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    updatedAt: "2026-04-21T09:00:00.000Z",
    workspace: {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      name: "Workspace Alpha",
    },
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
  exchangeGithubSession?: RuntimeClient["exchangeGithubSession"];
  signOut?: RuntimeClient["signOut"];
  snapshot?: RuntimeSnapshot;
  startTimer?: RuntimeClient["startTimer"];
  stopTimer?: () => Promise<RuntimeMutationResult>;
}): RuntimeClient {
  return {
    exchangeFirebaseToken:
      overrides?.exchangeFirebaseToken ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
      })),
    exchangeGithubSession:
      overrides?.exchangeGithubSession ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
      })),
    signOut:
      overrides?.signOut ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: false, currentTimer: null, errorMessage: null, user: null },
      })),
    getSnapshot: vi.fn(async () =>
        overrides?.snapshot ?? {
          authenticated: false,
          currentTimer: null,
          errorMessage: null,
          user: null,
        }),
    onSnapshotUpdated: vi.fn(() => () => undefined),
    openExtension: vi.fn(async () => undefined),
    startTimer:
      overrides?.startTimer ??
      vi.fn(async () => ({
        ok: true,
        snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
      })),
    stopTimer:
      overrides?.stopTimer ??
      vi.fn(async () => ({
        ok: true,
        snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
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
    surface: "issue-page",
  };
}

function otherSupportedContext(): PageContext {
  return {
    githubRepo: "octo/current-page",
    issueNumber: 999,
    issueTitle: "Different issue in the active tab",
    issueUrl: "https://github.com/octo/current-page/issues/999",
    kind: "supported",
    surface: "issue-page",
  };
}

describe("popup app", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the unauthenticated popup state with sign-in actions", async () => {
    const runtimeClient = createRuntimeClient();
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
    });

    await app.load();

    expect(document.body.textContent).toContain("Continue with Google");
    expect(document.body.textContent).toContain("Sign in with email");
  });

  it("offers GitHub sign-in when the build enables it", async () => {
    const app = createPopupApp({
      githubSignInEnabled: true,
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient(),
      pageContextResolver: async () => ({ kind: "unsupported" }),
    });

    await app.load();

    expect(document.body.textContent).toContain("Continue with GitHub");
    expect(
      document.querySelector('[data-action="github-sign-in"]'),
    ).not.toBeNull();
  });

  it("hides GitHub sign-in when the build does not enable it, leaving the others", async () => {
    const app = createPopupApp({
      githubSignInEnabled: false,
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient(),
      pageContextResolver: async () => ({ kind: "unsupported" }),
    });

    await app.load();

    expect(document.querySelector('[data-action="github-sign-in"]')).toBeNull();
    expect(document.body.textContent).not.toContain("Continue with GitHub");
    expect(document.body.textContent).toContain("Continue with Google");
    expect(document.body.textContent).toContain("Sign in with email");
  });

  it("exchanges the GitHub handoff code and reaches a signed-in state", async () => {
    const exchangeGithubSession = vi.fn(async () => ({
      ok: true,
      snapshot: {
        authenticated: true,
        currentTimer: null,
        errorMessage: null,
        user: null,
      },
    }));
    const runtimeClient = createRuntimeClient({ exchangeGithubSession });
    const signInWithGithubFn = vi.fn(async () => ({
      code: "handoff-code",
      verifier: "v".repeat(64),
    }));
    const app = createPopupApp({
      githubSignInEnabled: true,
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
      signInWithGithubFn,
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="github-sign-in"]')!
      .click();

    await Promise.resolve();
    await Promise.resolve();

    expect(signInWithGithubFn).toHaveBeenCalledOnce();
    expect(exchangeGithubSession).toHaveBeenCalledWith(
      "handoff-code",
      "v".repeat(64),
    );
    // Firebase is not part of this path.
    expect(runtimeClient.exchangeFirebaseToken).not.toHaveBeenCalled();
  });

  it("surfaces a GitHub sign-in failure and re-enables the action", async () => {
    const app = createPopupApp({
      githubSignInEnabled: true,
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient(),
      pageContextResolver: async () => ({ kind: "unsupported" }),
      signInWithGithubFn: vi.fn(async () => {
        throw new Error("GitHub sign-in was declined. Authorize GiTiempo to continue.");
      }),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="github-sign-in"]')!
      .click();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.body.textContent).toContain("GitHub sign-in was declined");
    expect(
      document.querySelector<HTMLButtonElement>('[data-action="github-sign-in"]')
        ?.disabled,
    ).toBe(false);
  });

  it("submits Google sign-in through Firebase and exchanges the token", async () => {
    const exchangeFirebaseToken = vi.fn(async () => ({
      ok: true,
      snapshot: {
        authenticated: true,
        currentTimer: null,
        errorMessage: null,
        user: null,
      },
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

  describe("account menu", () => {
    const signedInUser = { displayName: "Alexey Tsukanov", email: "alexey@example.com" };

    function signedInSnapshot(
      overrides?: Partial<RuntimeSnapshot>,
    ): RuntimeSnapshot {
      return {
        authenticated: true,
        currentTimer: null,
        errorMessage: null,
        user: signedInUser,
        ...overrides,
      };
    }

    async function openMenu(
      overrides?: Parameters<typeof createRuntimeClient>[0],
      popupOptions?: { now?: () => number; setIntervalFn?: typeof setInterval },
    ) {
      const runtimeClient = createRuntimeClient({
        snapshot: signedInSnapshot(),
        ...overrides,
      });
      const app = createPopupApp({
        root: document.querySelector<HTMLElement>("#app")!,
        runtimeClient,
        pageContextResolver: async () => ({ kind: "unsupported" }),
        ...popupOptions,
      });

      await app.load();
      document
        .querySelector<HTMLButtonElement>('[data-action="toggle-account-menu"]')!
        .click();

      return { app, runtimeClient };
    }

    it("opens from the avatar and reports itself expanded", async () => {
      await openMenu();

      expect(document.querySelector('[data-testid="popup-account-menu"]')).not.toBeNull();
      expect(
        document
          .querySelector('[data-action="toggle-account-menu"]')
          ?.getAttribute("aria-expanded"),
      ).toBe("true");
      // The session being acted on is identified before it can be ended.
      expect(document.body.textContent).toContain("alexey@example.com");
    });

    it("offers the profile page and signing out, and nothing else", async () => {
      await openMenu();

      const menu = document.querySelector('[data-testid="popup-account-menu"]')!;

      expect(
        [...menu.querySelectorAll("[role=menuitem]")].map((item) =>
          item.textContent?.trim(),
        ),
      ).toEqual(["Open profile", "Sign out"]);
      expect(
        menu.querySelector<HTMLAnchorElement>('[data-action="open-profile"]')?.href,
      ).toBe("http://localhost:5173/profile");
      // The header action the menu sits beside stays reachable.
      expect(document.querySelector('[aria-label="Open GiTiempo dashboard"]')).not.toBeNull();
    });

    it("closes on escape without touching the state beneath", async () => {
      await openMenu({ snapshot: signedInSnapshot({ currentTimer: currentTimer() }) });
      const before = document.querySelector('[data-testid="popup-account-menu"]');

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(before).not.toBeNull();
      expect(document.querySelector('[data-testid="popup-account-menu"]')).toBeNull();
      expect(document.body.textContent).toContain("Stop Timer");
    });

    it("closes on a pointer outside it but not on the trigger", async () => {
      await openMenu();

      document
        .querySelector('[data-testid="popup-account-menu"]')!
        .dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(document.querySelector('[data-testid="popup-account-menu"]')).not.toBeNull();

      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(document.querySelector('[data-testid="popup-account-menu"]')).toBeNull();
    });

    it("advances the clock on a tick without rebuilding the menu", async () => {
      let tick: (() => void) | null = null;
      // Anchored to the fixture's start, since elapsed time is clamped at zero
      // before it and a clock starting from 0 would read 00:00:00 either way.
      let clock = Date.parse("2026-04-21T09:00:00.000Z");

      await openMenu(
        { snapshot: signedInSnapshot({ currentTimer: currentTimer() }) },
        {
          now: () => clock,
          setIntervalFn: ((handler: () => void) => {
            tick = handler;
            return 1 as unknown as ReturnType<typeof setInterval>;
          }) as unknown as typeof setInterval,
        },
      );

      // Guard the guard: without a registered ticker the assertions below would
      // pass while proving nothing.
      expect(tick).not.toBeNull();
      const menuBefore = document.querySelector('[data-testid="popup-account-menu"]');
      const elapsedBefore = document.querySelector("[data-elapsed]")?.textContent;

      clock += 60_000;
      tick!();

      const menuAfter = document.querySelector('[data-testid="popup-account-menu"]');

      // The same node, not a replacement. A tick that reassigned innerHTML would
      // take hover, focus, and text selection with it every second — which is what
      // made an item pulse under a cursor that had never moved.
      expect(menuAfter).toBe(menuBefore);
      // And the clock still advanced, so keeping the DOM did not freeze it.
      expect(document.querySelector("[data-elapsed]")?.textContent).not.toBe(
        elapsedBefore,
      );
    });

    it("warns that a running timer survives sign out, without repeating the clock", async () => {
      await openMenu({ snapshot: signedInSnapshot({ currentTimer: currentTimer() }) });

      const menu = document.querySelector('[data-testid="popup-account-menu"]')!;

      // Signing out leaves the timer running, so the menu must say so before
      // offering the action.
      expect(menu.textContent).toContain("Timer keeps running after sign out");
      // But it is a warning, not a second timer: no elapsed readout inside the
      // panel, which sits directly over the one the popup already shows.
      expect(menu.querySelector("[data-elapsed]")).toBeNull();
    });

    it("shows no timer notice when nothing is running", async () => {
      await openMenu();

      expect(
        document.querySelector('[data-testid="popup-account-menu"]')!.textContent,
      ).not.toContain("Timer keeps running");
    });

    it("shows the email alone when the snapshot carries no display name", async () => {
      await openMenu({
        snapshot: signedInSnapshot({ user: { displayName: null, email: "alexey@example.com" } }),
      });

      const menu = document.querySelector('[data-testid="popup-account-menu"]')!;

      expect(menu.textContent).toContain("alexey@example.com");
      expect(menu.textContent).not.toContain("Alexey Tsukanov");
    });

    it("signs out through the runtime client and follows the returned snapshot", async () => {
      const signOut = vi.fn(async () => ({
        ok: true,
        snapshot: {
          authenticated: false,
          currentTimer: null,
          errorMessage: null,
          user: null,
        },
      }));
      await openMenu({ signOut });

      document.querySelector<HTMLButtonElement>('[data-action="sign-out"]')!.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(signOut).toHaveBeenCalledOnce();
      expect(document.querySelector('[data-testid="popup-account-menu"]')).toBeNull();
      expect(document.body.textContent).toContain("Continue with Google");
    });

    it("is unreachable before sign-in", async () => {
      const app = createPopupApp({
        root: document.querySelector<HTMLElement>("#app")!,
        runtimeClient: createRuntimeClient(),
        pageContextResolver: async () => ({ kind: "unsupported" }),
      });

      await app.load();

      expect(document.querySelector('[data-action="toggle-account-menu"]')).toBeNull();
      expect(document.querySelector('[data-testid="popup-account-menu"]')).toBeNull();
    });
  });

  it("submits email sign-in through Firebase and exchanges the token", async () => {
    const exchangeFirebaseToken = vi.fn(async () => ({
      ok: true,
      snapshot: {
        authenticated: true,
        currentTimer: null,
        errorMessage: null,
        user: null,
      },
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

  it("shows an inline auth error when the background token exchange fails", async () => {
    const runtimeClient = createRuntimeClient({
      exchangeFirebaseToken: vi.fn(async () => ({
        errorMessage:
          "GiTiempo API is temporarily unavailable. Please try again in a moment.",
        ok: false,
        snapshot: {
          authenticated: false,
          currentTimer: null,
          errorMessage: null,
          user: null,
        },
      })),
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
      signInWithGoogleFn: vi.fn(async () => "firebase-google-token"),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="google-sign-in"]')!
      .click();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.body.textContent).toContain(
      "GiTiempo API is temporarily unavailable. Please try again in a moment.",
    );
    expect(document.body.textContent).toContain("Continue with Google");
  });

  it("renders the authenticated no-timer popup state on supported issue pages", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();

    expect(document.body.textContent).toContain("Start Timer");
    expect(document.body.textContent).toContain("Improve reports filters");
    expect(
      document.querySelector('a[aria-label="Open GiTiempo dashboard"]'),
    ).not.toBeNull();
  });

  it("renders the avatar from the snapshot user when no timer is running", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true,
        currentTimer: null,
        errorMessage: null,
        user: {
          displayName: "Volodymyr Nakonechnyi",
          email: "volodymyr@example.com",
        },
      },
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();

    expect(
      document.querySelector('[data-testid="popup-user-avatar"]')?.textContent,
    ).toBe("VN");
  });

  it("renders the authenticated unsupported-page state", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
    });

    await app.load();

    expect(document.body.textContent).toContain(
      "Open a supported GitHub issue to start a timer.",
    );
    expect(document.body.textContent).toContain(
      "Supported on direct GitHub issue pages and GitHub Projects issue panes.",
    );
  });

  it("resolves GitHub Projects issue pane tabs through the shared parser fallback", async () => {
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn(async () => [{
          id: 21,
          title: "Improve reports filters · GitHub",
          url: "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|184",
        }]),
        sendMessage: vi.fn(async () => {
          throw new Error("receiver missing");
        }),
      },
    });

    await expect(resolveActivePageContext()).resolves.toEqual({
      githubRepo: "octo/repo",
      issueNumber: 184,
      issueTitle: "Improve reports filters",
      issueUrl:
        "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|184",
      kind: "supported",
      surface: "project-issue-pane",
    });
  });

  it("renders the running timer popup state", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true,
        currentTimer: currentTimer(),
        errorMessage: null,
        user: { displayName: "Alexey Tsukanov", email: "alexey@example.com" },
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
    expect(document.body.textContent).toContain("Project Orion / octo/timer-repo");
    expect(
      document.querySelector('[data-testid="popup-user-avatar"]')?.textContent,
    ).toBe("AT");
    expect(
      document.querySelector('a[aria-label="Open GiTiempo dashboard"]'),
    ).not.toBeNull();
  });

  it("prefers the running timer repo over the active page repo", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true,
        currentTimer: currentTimer(),
        errorMessage: null,
        user: null,
      },
    });
    const app = createPopupApp({
      now: () => new Date("2026-04-21T10:00:00.000Z").getTime(),
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => otherSupportedContext(),
    });

    await app.load();

    expect(document.body.textContent).toContain("Project Orion / octo/timer-repo");
    expect(document.body.textContent).not.toContain(
      "Project Orion / octo/current-page",
    );
  });

  it("adds explicit focus-visible styles to popup primary actions", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
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
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
    }));
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
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
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
    }));
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true,
        currentTimer: currentTimer(),
        errorMessage: null,
        user: null,
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
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null, user: null },
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
