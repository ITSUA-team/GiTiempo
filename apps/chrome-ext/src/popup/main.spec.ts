import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUserWorkspaceMembershipResponse } from "@gitiempo/shared";

import { getExtensionConfig } from "@/lib/config";
import type { PageContext } from "@/lib/github-context";
import type {
  RuntimeAuthResult,
  RuntimeClient,
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
    invoiceId: null,
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
  getSnapshot?: RuntimeClient["getSnapshot"];
  signInWithGithub?: RuntimeClient["signInWithGithub"];
  signInWithGoogle?: RuntimeClient["signInWithGoogle"];
  signOut?: RuntimeClient["signOut"];
  retryProviderCleanup?: RuntimeClient["retryProviderCleanup"];
  snapshot?: RuntimeSnapshot;
  startTimer?: RuntimeClient["startTimer"];
  stopTimer?: RuntimeClient["stopTimer"];
  getWorkspaceMemberships?: RuntimeClient["getWorkspaceMemberships"];
  onSnapshotUpdated?: RuntimeClient["onSnapshotUpdated"];
  switchWorkspace?: RuntimeClient["switchWorkspace"];
}): RuntimeClient {
  return {
    exchangeFirebaseToken:
      overrides?.exchangeFirebaseToken ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
      })),
    exchangeGithubSession:
      overrides?.exchangeGithubSession ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
      })),
    signInWithGithub:
      overrides?.signInWithGithub ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
      })),
    signInWithGoogle:
      overrides?.signInWithGoogle ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
      })),
    signOut:
      overrides?.signOut ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: false, currentTimer: null, errorMessage: null, user: null },
      })),
    retryProviderCleanup:
      overrides?.retryProviderCleanup ??
      vi.fn(async (): Promise<RuntimeAuthResult> => ({
        ok: true,
        snapshot: { authenticated: false, currentTimer: null, errorMessage: null, user: null },
      })),
    getSnapshot: overrides?.getSnapshot ?? vi.fn(async (pageContext) => {
      const snapshot = overrides?.snapshot ?? {
        authenticated: false,
        currentTimer: null,
        errorMessage: null,
        user: null,
      };

      return pageContext && snapshot.authenticated && snapshot.trackingCapability === undefined
        ? {
            ...snapshot,
            trackingCapability: {
              accessScope: "project" as const,
              canStartTracking: true as const,
              githubRepo: pageContext.githubRepo,
              issueNumber: pageContext.issueNumber,
              reason: null,
            },
          }
        : snapshot;
    }),
    getWorkspaceMemberships:
      overrides?.getWorkspaceMemberships ??
      vi.fn(async () => ({
        items: workspaceMemberships(),
        ok: true,
        snapshot: overrides?.snapshot ?? {
          authenticated: false,
          currentTimer: null,
          errorMessage: null,
          user: null,
        },
      })),
    onSnapshotUpdated: overrides?.onSnapshotUpdated ?? vi.fn(() => () => undefined),
    openExtension: vi.fn(async () => undefined),
    startTimer:
      overrides?.startTimer ??
      vi.fn(async () => ({
        ok: true,
        snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
      })),
    stopTimer:
      overrides?.stopTimer ??
      vi.fn(async () => ({
        ok: true,
        snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
      })),
    switchWorkspace:
      overrides?.switchWorkspace ??
      vi.fn(async (workspaceId: string) => {
        const membership = workspaceMemberships().find(
          (candidate) => candidate.workspaceId === workspaceId,
        );

        return {
          ok: true,
          snapshot: {
            ...(overrides?.snapshot ?? {
              authenticated: true,
              currentTimer: null,
              errorMessage: null,
              user: { displayName: "Alexey", email: "alexey@example.com" },
            }),
            workspace: membership
              ? { id: membership.workspaceId, name: membership.workspaceName }
              : null,
          },
        };
      }),
  };
}

function workspaceMemberships(): CurrentUserWorkspaceMembershipResponse[] {
  return [
    { isCurrent: true, role: "admin", workspaceId: "workspace-alpha", workspaceName: "Workspace Alpha" },
    { isCurrent: false, role: "member", workspaceId: "workspace-beta", workspaceName: "Workspace Beta" },
  ];
}

function supportedContext(): Extract<PageContext, { kind: "supported" }> {
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
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
        currentTimer: null,
        errorMessage: null,
        user: null,
      },
    }));
    const signInWithGithub = vi.fn(async (): Promise<RuntimeAuthResult> => ({
      ok: true,
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
    }));
    const runtimeClient = createRuntimeClient({
      exchangeGithubSession,
      signInWithGithub,
    });
    const app = createPopupApp({
      githubSignInEnabled: true,
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="github-sign-in"]')!
      .click();

    await Promise.resolve();
    await Promise.resolve();

    // The worker owns the flow, so the popup asks once and never touches the
    // provider or the handoff code itself.
    expect(signInWithGithub).toHaveBeenCalledOnce();
    expect(exchangeGithubSession).not.toHaveBeenCalled();
    expect(runtimeClient.exchangeFirebaseToken).not.toHaveBeenCalled();
  });

  it("surfaces a GitHub sign-in failure and re-enables the action", async () => {
    const app = createPopupApp({
      githubSignInEnabled: true,
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient({
        signInWithGithub: vi.fn(async () => {
          throw new Error("GitHub sign-in was declined. Authorize GiTiempo to continue.");
        }),
      }),
      pageContextResolver: async () => ({ kind: "unsupported" }),
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
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
        currentTimer: null,
        errorMessage: null,
        user: null,
      },
    }));
    const signInWithGoogle = vi.fn(async (): Promise<RuntimeAuthResult> => ({
      ok: true,
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
    }));
    const runtimeClient = createRuntimeClient({
      exchangeFirebaseToken,
      signInWithGoogle,
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
      pageContextResolver: async () => ({ kind: "unsupported" }),
    });

    await app.load();
    document
      .querySelector<HTMLButtonElement>('[data-action="google-sign-in"]')!
      .click();

    await Promise.resolve();
    await Promise.resolve();

    // The worker runs the provider flow and the exchange, so the popup makes one
    // call and never handles a Firebase token itself.
    expect(signInWithGoogle).toHaveBeenCalledOnce();
    expect(exchangeFirebaseToken).not.toHaveBeenCalled();
  });

  it("shows a retryable error and re-enables actions after Google sign-in fails", async () => {
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient({
        signInWithGoogle: vi.fn(async () => {
          throw new Error("Google popup blocked");
        }),
      }),
      pageContextResolver: async () => ({ kind: "unsupported" }),
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
    let popupApps: ReturnType<typeof createPopupApp>[] = [];

    afterEach(() => {
      popupApps.forEach((app) => app.destroy());
      popupApps = [];
    });

    function signedInSnapshot(
      overrides?: Partial<RuntimeSnapshot>,
    ): RuntimeSnapshot {
      return {
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
        currentTimer: null,
        errorMessage: null,
        user: signedInUser,
        ...overrides,
      };
    }

    async function openMenu(
      overrides?: Parameters<typeof createRuntimeClient>[0],
      popupOptions?: {
        now?: () => number;
        pageContextResolver?: () => Promise<PageContext>;
        setIntervalFn?: typeof setInterval;
        signInWithEmailPasswordFn?: Parameters<typeof createPopupApp>[0]["signInWithEmailPasswordFn"];
      },
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
      popupApps.push(app);

      await app.load();
      document
        .querySelector<HTMLButtonElement>('[data-action="toggle-account-menu"]')!
        .click();

      return { app, runtimeClient };
    }

    async function settle(): Promise<void> {
      await Promise.resolve();
      await Promise.resolve();
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

    it("offers a workspace selector above the profile and sign-out actions", async () => {
      await openMenu();
      await settle();

      const menu = document.querySelector('[data-testid="popup-account-menu"]')!;
      const selector = menu.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;

      expect(selector.labels?.[0]?.textContent).toBe("Workspace");
      expect([...selector.options].map((option) => option.textContent)).toEqual([
        "Workspace Alpha",
        "Workspace Beta",
      ]);
      expect(selector.compareDocumentPosition(menu.querySelector('[data-action="open-profile"]')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(menu.getAttribute("role")).toBe("region");
      expect(menu.getAttribute("aria-label")).toBe("Account settings");
      expect(
        ["open-profile", "sign-out"].map(
          (action) => menu.querySelector(`[data-action="${action}"]`)?.textContent?.trim(),
        ),
      ).toEqual(["Open profile", "Sign out"]);
      expect(
        menu.querySelector<HTMLAnchorElement>('[data-action="open-profile"]')?.href,
      ).toBe(getExtensionConfig().userSpaProfileUrl);
      // The header action the menu sits beside stays reachable.
      expect(document.querySelector('[aria-label="Open GiTiempo dashboard"]')).not.toBeNull();
    });

    it("keeps a single membership visible but unavailable", async () => {
      const singleMembership = workspaceMemberships().slice(0, 1);
      await openMenu({
        getWorkspaceMemberships: vi.fn(async () => ({
          items: singleMembership,
          ok: true,
          snapshot: signedInSnapshot(),
        })),
      });
      await settle();

      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      expect(selector.disabled).toBe(true);
      expect([...selector.options].map((option) => option.textContent)).toEqual(["Workspace Alpha"]);
    });

    it("does not switch when the current workspace is selected", async () => {
      const switchWorkspace = vi.fn();
      await openMenu({ switchWorkspace });
      await settle();

      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.value = "workspace-alpha";
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      await settle();

      expect(switchWorkspace).not.toHaveBeenCalled();
    });

    it("switches the extension workspace and keeps the menu open", async () => {
      const switchedSnapshot = signedInSnapshot({ workspace: { id: "workspace-beta", name: "Workspace Beta" } });
      const switchWorkspace = vi.fn(async () => ({ ok: true, snapshot: switchedSnapshot }));
      const getSnapshot = vi
        .fn()
        .mockResolvedValueOnce(signedInSnapshot())
        .mockResolvedValueOnce(signedInSnapshot())
        .mockResolvedValueOnce(switchedSnapshot);
      const { runtimeClient } = await openMenu({ getSnapshot, switchWorkspace });
      await settle();

      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.value = "workspace-beta";
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      await settle();

      expect(switchWorkspace).toHaveBeenCalledWith("workspace-beta");
      expect(runtimeClient.getSnapshot).toHaveBeenCalledTimes(3);
      expect(document.querySelector('[data-testid="popup-account-menu"]')).not.toBeNull();
      expect(document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')?.value).toBe("workspace-beta");
      expect(document.body.textContent).toContain("Workspace Beta");
    });

    it("re-enables controls when the menu reopens during a workspace switch", async () => {
      let completeSwitch!: (result: Awaited<ReturnType<RuntimeClient["switchWorkspace"]>>) => void;
      const switchedSnapshot = signedInSnapshot({
        trackingCapability: {
          accessScope: "project",
          canStartTracking: true,
          githubRepo: "octo/repo",
          issueNumber: 184,
          reason: null,
        },
        workspace: { id: "workspace-beta", name: "Workspace Beta" },
      });
      let latestSnapshot = signedInSnapshot({
        trackingCapability: {
          accessScope: "project",
          canStartTracking: true,
          githubRepo: "octo/repo",
          issueNumber: 184,
          reason: null,
        },
      });
      const switchWorkspace = vi.fn(
        () => new Promise<Awaited<ReturnType<RuntimeClient["switchWorkspace"]>>>((resolve) => {
          completeSwitch = resolve;
        }),
      );
      await openMenu(
        {
          getSnapshot: vi.fn(async () => latestSnapshot),
          getWorkspaceMemberships: vi.fn(async () => ({
            items: workspaceMemberships(),
            ok: true,
            snapshot: latestSnapshot,
          })),
          switchWorkspace,
        },
        { pageContextResolver: async () => supportedContext() },
      );
      await settle();

      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.value = "workspace-beta";
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      await settle();

      document.querySelector<HTMLButtonElement>('[data-action="toggle-account-menu"]')!.click();
      document.querySelector<HTMLButtonElement>('[data-action="toggle-account-menu"]')!.click();
      await settle();

      latestSnapshot = switchedSnapshot;
      completeSwitch({ ok: true, snapshot: switchedSnapshot });

      await vi.waitFor(() => {
        expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(false);
        expect(document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')?.disabled).toBe(false);
      });
    });

    it("re-enables controls after signing out during a workspace switch and signing in again", async () => {
      let completeSwitch!: (result: Awaited<ReturnType<RuntimeClient["switchWorkspace"]>>) => void;
      const authenticatedSnapshot = signedInSnapshot({
        trackingCapability: {
          accessScope: "project",
          canStartTracking: true,
          githubRepo: "octo/repo",
          issueNumber: 184,
          reason: null,
        },
      });
      const signedOutSnapshot: RuntimeSnapshot = {
        authenticated: false,
        currentTimer: null,
        errorMessage: null,
        user: null,
      };
      const staleSwitchedSnapshot = signedInSnapshot({
        workspace: { id: "workspace-beta", name: "Workspace Beta" },
      });
      let latestSnapshot = authenticatedSnapshot;
      const switchWorkspace = vi.fn(
        () => new Promise<Awaited<ReturnType<RuntimeClient["switchWorkspace"]>>>((resolve) => {
          completeSwitch = resolve;
        }),
      );
      const signOut = vi.fn(async () => {
        latestSnapshot = signedOutSnapshot;
        return { ok: true, snapshot: signedOutSnapshot };
      });
      const exchangeFirebaseToken = vi.fn(async () => {
        latestSnapshot = authenticatedSnapshot;
        return { ok: true, snapshot: authenticatedSnapshot };
      });
      await openMenu(
        {
          exchangeFirebaseToken,
          getSnapshot: vi.fn(async () => latestSnapshot),
          getWorkspaceMemberships: vi.fn(async () => ({
            items: workspaceMemberships(),
            ok: true,
            snapshot: latestSnapshot,
          })),
          signOut,
          switchWorkspace,
        },
        {
          pageContextResolver: async () => supportedContext(),
          signInWithEmailPasswordFn: vi.fn(async () => "firebase-id-token"),
        },
      );
      await settle();

      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.value = "workspace-beta";
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      await settle();

      document.querySelector<HTMLButtonElement>('[data-action="sign-out"]')!.click();
      await settle();

      document.querySelector<HTMLButtonElement>('[data-action="toggle-email"]')!.click();
      document
        .querySelector<HTMLFormElement>('[data-form="email-sign-in"]')!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

      await vi.waitFor(() => {
        expect(exchangeFirebaseToken).toHaveBeenCalledWith("firebase-id-token");
        expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(false);
      });

      completeSwitch({ errorMessage: "Session changed", ok: false, snapshot: staleSwitchedSnapshot });
      await settle();

      expect(document.querySelector('[data-testid="workspace-context"]')?.textContent).toBe("Workspace Alpha");
      expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(false);
    });

    it("refreshes page-bound tracking capability after loading memberships", async () => {
      const contextualSnapshot = signedInSnapshot({
        trackingCapability: {
          accessScope: "project",
          canStartTracking: true,
          githubRepo: "octo/repo",
          issueNumber: 184,
          reason: null,
        },
      });
      const membershipSnapshot = signedInSnapshot();
      const getSnapshot = vi
        .fn()
        .mockResolvedValueOnce(contextualSnapshot)
        .mockResolvedValueOnce(contextualSnapshot);
      const { runtimeClient } = await openMenu(
        {
          getSnapshot,
          getWorkspaceMemberships: vi.fn(async () => ({
            items: workspaceMemberships(),
            ok: true,
            snapshot: membershipSnapshot,
          })),
        },
        { pageContextResolver: async () => supportedContext() },
      );
      await settle();

      expect(runtimeClient.getSnapshot).toHaveBeenLastCalledWith(supportedContext());
      expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(false);
    });

    it("refreshes the page capability after a generic snapshot arrives while the menu is open", async () => {
      const contextualSnapshot = signedInSnapshot({
        trackingCapability: {
          accessScope: "project",
          canStartTracking: true,
          githubRepo: "octo/repo",
          issueNumber: 184,
          reason: null,
        },
      });
      let publishSnapshot!: (snapshot: RuntimeSnapshot) => void;
      const getSnapshot = vi.fn(async () => contextualSnapshot);
      await openMenu(
        {
          getSnapshot,
          onSnapshotUpdated: (listener) => {
            publishSnapshot = listener;
            return () => undefined;
          },
          snapshot: contextualSnapshot,
        },
        { pageContextResolver: async () => supportedContext() },
      );
      await settle();
      expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(false);

      getSnapshot.mockClear();
      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.focus();
      publishSnapshot({ ...contextualSnapshot, trackingCapability: undefined });

      await vi.waitFor(() => {
        expect(getSnapshot).toHaveBeenCalledWith(supportedContext());
        expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(false);
      });
      expect(document.querySelector('[data-testid="popup-account-menu"]')).not.toBeNull();
      expect(document.activeElement?.getAttribute("data-field")).toBe("workspace-selector");
    });

    it("ignores a stale capability refresh after a later authenticated snapshot", async () => {
      const workspaceAlphaSnapshot = signedInSnapshot({
        trackingCapability: {
          accessScope: "project",
          canStartTracking: true,
          githubRepo: "octo/repo",
          issueNumber: 184,
          reason: null,
        },
      });
      const workspaceBetaSnapshot = signedInSnapshot({
        trackingCapability: {
          accessScope: "project",
          canStartTracking: true,
          githubRepo: "octo/repo",
          issueNumber: 184,
          reason: null,
        },
        user: { displayName: "Marta", email: "marta@example.com" },
        workspace: { id: "workspace-beta", name: "Workspace Beta" },
      });
      const pendingRefreshes: Array<(snapshot: RuntimeSnapshot) => void> = [];
      let deferRefreshes = false;
      const getSnapshot = vi.fn(() => deferRefreshes
        ? new Promise<RuntimeSnapshot>((resolve) => {
            pendingRefreshes.push(resolve);
          })
        : Promise.resolve(workspaceAlphaSnapshot));
      let publishSnapshot!: (snapshot: RuntimeSnapshot) => void;
      await openMenu(
        {
          getSnapshot,
          onSnapshotUpdated: (listener) => {
            publishSnapshot = listener;
            return () => undefined;
          },
          snapshot: workspaceAlphaSnapshot,
        },
        { pageContextResolver: async () => supportedContext() },
      );

      await settle();
      deferRefreshes = true;
      getSnapshot.mockClear();

      publishSnapshot({ ...workspaceAlphaSnapshot, trackingCapability: undefined });
      await vi.waitFor(() => expect(pendingRefreshes).toHaveLength(1));
      publishSnapshot({ ...workspaceBetaSnapshot, trackingCapability: undefined });
      await vi.waitFor(() => expect(pendingRefreshes).toHaveLength(2));

      pendingRefreshes.shift()!(workspaceAlphaSnapshot);
      await settle();
      expect(document.querySelector('[data-testid="workspace-context"]')?.textContent).toBe("Workspace Beta");
      expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(true);

      pendingRefreshes.shift()!(workspaceBetaSnapshot);
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(false);
      });
    });

    it("keeps tracking disabled and exposes Retry when a capability refresh fails", async () => {
      const contextualSnapshot = signedInSnapshot({
        trackingCapability: {
          accessScope: "project",
          canStartTracking: true,
          githubRepo: "octo/repo",
          issueNumber: 184,
          reason: null,
        },
      });
      let publishSnapshot!: (snapshot: RuntimeSnapshot) => void;
      const getSnapshot = vi.fn(async () => contextualSnapshot);
      await openMenu(
        {
          getSnapshot,
          onSnapshotUpdated: (listener) => {
            publishSnapshot = listener;
            return () => undefined;
          },
          snapshot: contextualSnapshot,
        },
        { pageContextResolver: async () => supportedContext() },
      );
      await settle();
      getSnapshot.mockRejectedValueOnce(new Error("Capability refresh failed"));

      publishSnapshot({ ...contextualSnapshot, trackingCapability: undefined });

      await vi.waitFor(() => {
        expect(document.body.textContent).toContain("Capability refresh failed");
        expect(document.querySelector('[data-action="retry"]')).not.toBeNull();
      });
      expect(document.querySelector('[data-action="start-timer"]')).toBeNull();

      document.querySelector<HTMLButtonElement>('[data-action="retry"]')!.click();
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(false);
      });
    });

    it("re-enables workspace selection after a failed switch reloads memberships", async () => {
      const switchWorkspace = vi.fn(async () => ({
        errorMessage: "Unable to switch workspace.",
        ok: false,
        snapshot: signedInSnapshot(),
      }));
      await openMenu({ switchWorkspace });
      await settle();

      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.value = "workspace-beta";
      selector.dispatchEvent(new Event("change", { bubbles: true }));

      await vi.waitFor(() => {
        expect(document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')?.disabled).toBe(false);
      });
      expect(document.body.textContent).toContain("Unable to switch workspace.");
    });

    it("shows retryable membership loading errors while leaving sign-out available", async () => {
      const getWorkspaceMemberships = vi.fn(async () => ({
        errorMessage: "Unable to reach GiTiempo.",
        items: [],
        ok: false,
        snapshot: signedInSnapshot(),
      }));
      await openMenu({ getWorkspaceMemberships });
      await settle();

      expect(document.body.textContent).toContain("Unable to reach GiTiempo.");
      expect(document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')?.disabled).toBe(true);
      expect(document.querySelector<HTMLButtonElement>('[data-action="sign-out"]')?.disabled).toBe(false);
      document.querySelector<HTMLButtonElement>('[data-action="retry-workspaces"]')!.click();
      await settle();
      expect(getWorkspaceMemberships).toHaveBeenCalledTimes(2);
    });

    it("keeps the account menu open when Escape closes native selector options", async () => {
      await openMenu();
      await settle();

      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.addEventListener("keydown", (event) => event.preventDefault(), { once: true });
      const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" });
      selector.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(document.querySelector('[data-testid="popup-account-menu"]')).not.toBeNull();
    });

    it("dismisses the account menu and prevents the popup-close default on Escape", async () => {
      await openMenu();
      await settle();

      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.focus();
      const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" });
      selector.dispatchEvent(event);

      expect(document.activeElement).toBe(document.body);
      expect(event.defaultPrevented).toBe(true);
      expect(document.querySelector('[data-testid="popup-account-menu"]')).toBeNull();
    });

    it("does not consume Escape after the account menu is closed", async () => {
      await openMenu();
      await settle();
      document.querySelector<HTMLButtonElement>('[data-action="toggle-account-menu"]')!.click();

      const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" });
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(document.querySelector('[data-testid="popup-account-menu"]')).toBeNull();
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
      await settle();

      // Guard the guard: without a registered ticker the assertions below would
      // pass while proving nothing.
      expect(tick).not.toBeNull();
      const menuBefore = document.querySelector('[data-testid="popup-account-menu"]');
      const elapsedBefore = document.querySelector("[data-elapsed]")?.textContent;
      const selector = document.querySelector<HTMLSelectElement>('[data-testid="workspace-selector"]')!;
      selector.focus();

      clock += 60_000;
      tick!();

      const menuAfter = document.querySelector('[data-testid="popup-account-menu"]');

      // The same node, not a replacement. A tick that reassigned innerHTML would
      // take hover, focus, and text selection with it every second — which is what
      // made an item pulse under a cursor that had never moved.
      expect(menuAfter).toBe(menuBefore);
      expect(document.activeElement).toBe(selector);
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

    it("retries pending provider cleanup from the unauthenticated popup without a new login", async () => {
      const retryProviderCleanup = vi.fn(async () => ({
        ok: true,
        snapshot: {
          authenticated: false,
          currentTimer: null,
          errorMessage: null,
          providerCleanupPending: false,
          user: null,
        },
      }));
      const app = createPopupApp({
        root: document.querySelector<HTMLElement>("#app")!,
        runtimeClient: createRuntimeClient({
          retryProviderCleanup,
          snapshot: {
            authenticated: false,
            currentTimer: null,
            errorMessage: null,
            providerCleanupPending: true,
            user: null,
          },
        }),
        pageContextResolver: async () => ({ kind: "unsupported" }),
      });

      await app.load();

      expect(document.body.textContent).toContain("Sign-out incomplete");
      expect(document.body.textContent).toContain(
        "Your GiTiempo session ended. Retry to clear remaining sign-in data.",
      );
      expect(document.body.textContent).not.toContain("Continue with Google");
      expect(document.querySelector('[data-testid="popup-user-avatar"]')).toBeNull();
      expect(document.querySelector('[aria-label="Open GiTiempo dashboard"]')).not.toBeNull();
      document
        .querySelector<HTMLButtonElement>('[data-action="retry-sign-out"]')!
        .click();
      await Promise.resolve();
      await Promise.resolve();

      expect(retryProviderCleanup).toHaveBeenCalledOnce();
      expect(document.querySelector('[data-action="retry-sign-out"]')).toBeNull();
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
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
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
      signInWithGoogle: vi.fn(async () => ({
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
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
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
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
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

  it("truncates long escaped workspace names while retaining their full accessible title", async () => {
    const workspaceName = "A very long <workspace> & its tracking configuration name";
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient({
        snapshot: {
          authenticated: true,
          currentTimer: null,
          errorMessage: null,
          user: { displayName: "Alexey", email: "alexey@example.com" },
          workspace: { id: "workspace-alpha", name: workspaceName },
        },
      }),
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();

    const workspaceContext = document.querySelector<HTMLElement>("[data-testid=workspace-context]")!;
    expect(workspaceContext.textContent).toBe(workspaceName);
    expect(workspaceContext.title).toBe(workspaceName);
    expect(workspaceContext.className).toContain("min-w-0");
    expect(workspaceContext.className).toContain("truncate");
    expect(workspaceContext.querySelector("workspace")).toBeNull();
  });

  it("renders the authenticated unsupported-page state", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
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

  it("keeps timer stop available when the active tab URL is hidden by host permissions", async () => {
    vi.stubGlobal("chrome", {
      tabs: { query: vi.fn(async () => [{ id: 21 }]) },
    });
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
        currentTimer: currentTimer(),
        errorMessage: null,
        user: null,
      },
    });
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient,
    });

    try {
      await app.load();

      expect(document.body.textContent).not.toContain("Connection lost");
      const stopButton = document.querySelector<HTMLButtonElement>('[data-action="stop-timer"]');
      expect(stopButton).not.toBeNull();
      stopButton!.click();

      await vi.waitFor(() => {
        expect(runtimeClient.stopTimer).toHaveBeenCalledWith(currentTimer()!.id);
        expect(document.body.textContent).toContain(
          "Open a supported GitHub issue to start a timer.",
        );
      });
    } finally {
      app.destroy();
    }
  });

  it("reports an error when there is no active tab", async () => {
    vi.stubGlobal("chrome", {
      tabs: { query: vi.fn(async () => []) },
    });

    await expect(resolveActivePageContext()).resolves.toEqual({
      kind: "error",
      message: "No active browser tab was found.",
    });
  });

  it("rejects board titles when the Projects pane content script is unavailable", async () => {
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn(async () => [{
          id: 21,
          title: "Improve reports filters · GitHub",
          url: "https://github.com/orgs/octo/projects/7?pane=issue&issue=octo|repo|184",
        }]),
        sendMessage: vi.fn(async () => {
          throw new Error("receiver missing");
        }),
      },
    });

    await expect(resolveActivePageContext()).resolves.toEqual({
      kind: "error",
      message: "Refresh this GitHub issue page to reconnect GiTiempo, then try again.",
    });;
  });

  it("preserves the content script's issue detection error", async () => {
    const context: PageContext = {
      kind: "error",
      message: "We could not detect the GitHub issue title on this page.",
    };
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn(async () => [{ id: 21, url: "https://github.com/ITSUA-team/GiTiempo/issues/439" }]),
        sendMessage: vi.fn(async () => context),
      },
    });
    await expect(resolveActivePageContext()).resolves.toEqual(context);
  });

  it("recovers issue context after its content script reconnects", async () => {
    const context: PageContext = {
      kind: "supported",
      surface: "issue-page",
      issueTitle: "Implement invoice backend and prevent duplicate time entry billing",
      githubRepo: "ITSUA-team/GiTiempo",
      issueNumber: 439,
      issueUrl: "https://github.com/ITSUA-team/GiTiempo/issues/439",
    };
    const sendMessage = vi.fn()
      .mockRejectedValueOnce(new Error("receiver missing"))
      .mockResolvedValue(context);
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn(async () => [{ id: 21, url: context.issueUrl }]),
        sendMessage,
      },
    });
    await expect(resolveActivePageContext()).resolves.toMatchObject({
      kind: "error", message: expect.stringContaining("Refresh this GitHub issue page"),
    });
    await expect(resolveActivePageContext()).resolves.toEqual(context);
  });

  it("distinguishes issue detection failures from API connection failures", async () => {
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient({ snapshot: {
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
        currentTimer: null, errorMessage: null, user: null,
      } }),
      pageContextResolver: async () => ({
        kind: "error", message: "Refresh this GitHub issue page to reconnect GiTiempo, then try again.",
      }),
    });
    try {
      await app.load();
      expect(document.body.textContent).toContain("Unable to read issue");
      expect(document.body.textContent).not.toContain("Connection lost");
      expect(document.querySelector('[data-action="start-timer"]')).toBeNull();
      expect(document.querySelector('[data-action="retry"]')).not.toBeNull();
    } finally {
      app.destroy();
    }
  });

  it("renders the running timer popup state", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true, workspace: { id: "workspace-beta", name: "Workspace Beta" },
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
    expect(document.body.textContent).toContain("#184 Improve reports filters");
    expect(document.body.textContent).toContain("Project Orion / octo/timer-repo");
    expect(document.querySelector('[data-testid="workspace-context"]')?.textContent).toBe("Workspace Alpha");
    expect(
      document.querySelector('[data-testid="popup-user-avatar"]')?.textContent,
    ).toBe("AT");
    expect(
      document.querySelector('a[aria-label="Open GiTiempo dashboard"]'),
    ).not.toBeNull();
  });

  it("keeps a known running timer stoppable when workspace readiness fails", async () => {
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient({
        snapshot: {
          authenticated: true,
          currentTimer: currentTimer(),
          errorMessage: "Workspace context is temporarily unavailable.",
          user: { displayName: "Alexey Tsukanov", email: "alexey@example.com" },
          workspace: null,
        },
      }),
      pageContextResolver: async () => supportedContext(),
    });

    try {
      await app.load();

      expect(document.body.textContent).toContain("Stop Timer");
      expect(document.body.textContent).toContain("Project Orion / octo/timer-repo");
      expect(document.body.textContent).toContain(
        "Workspace context is temporarily unavailable.",
      );
      expect(document.querySelector('[data-action="retry"]')).toBeNull();
    } finally {
      app.destroy();
    }
  });

  it("prefers the running timer repo over the active page repo", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
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
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
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
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
    }));
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
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

    await vi.waitFor(() => expect(startTimer).toHaveBeenCalledWith(supportedContext(), "workspace-alpha", "alexey@example.com"));
  });

  it("keeps Start disabled and exposes Retry when this issue is denied", async () => {
    const context = supportedContext();
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient({
        snapshot: {
          authenticated: true,
          workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
          currentTimer: null,
          errorMessage: null,
          trackingCapability: {
            accessScope: null,
            canStartTracking: false,
            githubRepo: context.githubRepo,
            issueNumber: context.issueNumber,
            reason: "You are not assigned to this project.",
          },
          user: { displayName: "Alexey", email: "alexey@example.com" },
        },
      }),
      pageContextResolver: async () => context,
    });

    await app.load();

    expect(document.body.textContent).toContain("You are not assigned to this project.");
    expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')?.disabled).toBe(true);
    expect(document.querySelector('[data-action="retry"]')).not.toBeNull();
  });

  it("shows the retryable error state after a failed stop action", async () => {
    const stopTimer = vi.fn(async () => ({
      ok: false,
      errorMessage: "Timer stop failed",
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
    }));
    const runtimeClient = createRuntimeClient({
      snapshot: {
        authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" },
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

    expect(stopTimer).toHaveBeenCalledWith("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002");
    expect(document.body.textContent).toContain("Timer stop failed");
    expect(document.body.textContent).toContain("Retry connection");
  });

  it("shows the retryable error state after a rejected start action", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
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

    await vi.waitFor(() => expect(document.body.textContent).toContain("Runtime unavailable"));
    expect(document.body.textContent).toContain("Retry connection");
  });

  it("shows the exact assignment remedy and does not suggest a personal GitHub reconnect", async () => {
    const assignmentMessage =
      "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time.";
    const app = createPopupApp({
      root: document.querySelector<HTMLElement>("#app")!,
      runtimeClient: createRuntimeClient({
        snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
        startTimer: vi.fn(async () => ({
          errorCode: "project_assignment_required" as const,
          errorMessage: assignmentMessage,
          ok: false,
          snapshot: { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { displayName: "Alexey", email: "alexey@example.com" } },
        })),
      }),
      pageContextResolver: async () => supportedContext(),
    });

    await app.load();
    document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')!.click();
    await vi.waitFor(() => expect(document.body.textContent).toContain(assignmentMessage));
    expect(document.body.textContent).not.toContain("Connect GitHub");
  });
  it("allows only one pending start and displays its workspace destination", async () => {
    let finish!: (value: Awaited<ReturnType<RuntimeClient["startTimer"]>>) => void;
    const snapshot: RuntimeSnapshot = { authenticated: true, workspace: { id: "workspace-alpha", name: "Customer work" }, currentTimer: null, errorMessage: null, user: { email: "alexey@example.com", displayName: null } };
    const startTimer = vi.fn(() => new Promise<Awaited<ReturnType<RuntimeClient["startTimer"]>>>(resolve => { finish = resolve; }));
    const app = createPopupApp({ root: document.querySelector<HTMLElement>("#app")!, runtimeClient: createRuntimeClient({ snapshot, startTimer }), pageContextResolver: async () => supportedContext() });
    await app.load();
    expect(document.body.textContent).toContain("Customer work");
    const button = document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')!;
    button.click(); button.click();
    await vi.waitFor(() => expect(startTimer).toHaveBeenCalledTimes(1));
    expect(document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')!.disabled).toBe(true);
    finish({ ok: true, snapshot: { ...snapshot, currentTimer: currentTimer() } });
    await vi.waitFor(() => expect(document.body.textContent).toContain("Stop Timer"));
    app.destroy();
  });

  it("rechecks current DOM context before starting and rejects a delayed title", async () => {
    const startTimer = vi.fn();
    const resolver = vi.fn().mockResolvedValueOnce(supportedContext()).mockResolvedValue({ kind: "error", message: "Issue title is still loading" });
    const snapshot: RuntimeSnapshot = { authenticated: true, workspace: { id: "workspace-alpha", name: "Workspace Alpha" }, currentTimer: null, errorMessage: null, user: { email: "alexey@example.com", displayName: null } };
    const app = createPopupApp({ root: document.querySelector<HTMLElement>("#app")!, runtimeClient: createRuntimeClient({ snapshot, startTimer }), pageContextResolver: resolver });
    await app.load();
    document.querySelector<HTMLButtonElement>('[data-action="start-timer"]')!.click();
    await vi.waitFor(() => expect(document.body.textContent).toContain("Issue title is still loading"));
    expect(startTimer).not.toHaveBeenCalled();
    app.destroy();
  });

});
