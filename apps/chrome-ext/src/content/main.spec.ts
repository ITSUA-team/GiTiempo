import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RuntimeClient, RuntimeMutationResult, RuntimeSnapshot } from "@/lib/runtime";
import { bootstrapInjectedIssueControl, mountInjectedIssueControl } from "./main";

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

function supportedContext() {
  return {
    githubRepo: "octo/repo",
    issueNumber: 184,
    issueTitle: "Improve reports filters",
    issueUrl: "https://github.com/octo/repo/issues/184",
    kind: "supported" as const,
  };
}

function createRuntimeClient(overrides?: {
  snapshot?: RuntimeSnapshot;
  startTimer?: () => Promise<RuntimeMutationResult>;
  stopTimer?: () => Promise<RuntimeMutationResult>;
}): RuntimeClient {
  return {
    exchangeFirebaseToken: vi.fn(),
    getSnapshot: vi.fn(async () =>
        overrides?.snapshot ?? {
          authenticated: true,
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

describe("injected issue control", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <div id="partial-discussion-header">
          <div class="gh-header-actions"></div>
        </div>
      </main>
    `;
  });

  it("mounts at the start of the GitHub main content", async () => {
    const mounted = mountInjectedIssueControl(
      document,
      supportedContext(),
      createRuntimeClient(),
    );

    await mounted?.load();

    const main = document.querySelector("main");

    expect(main?.firstElementChild?.id).toBe("gitiempo-extension-root");
  });

  it("renders the auth-missing state with an open-extension action", async () => {
    const runtimeClient = createRuntimeClient({
      snapshot: { authenticated: false, currentTimer: null, errorMessage: null },
    });
    const mounted = mountInjectedIssueControl(
      document,
      supportedContext(),
      runtimeClient,
    )!;

    await mounted.load();

    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.textContent).toContain(
      "Sign in to GiTiempo to start tracking this issue.",
    );
    root.querySelector<HTMLButtonElement>('[data-action="open-extension"]')!.click();
    expect(runtimeClient.openExtension).toHaveBeenCalledOnce();
  });

  it("starts a timer from the idle injected state", async () => {
    const startTimer = vi.fn(async () => ({
      ok: true,
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
    }));
    const mounted = mountInjectedIssueControl(
      document,
      supportedContext(),
      createRuntimeClient({ startTimer }),
    )!;

    await mounted.load();

    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    root.querySelector<HTMLButtonElement>('[data-action="start-timer"]')!.click();
    await Promise.resolve();
    expect(startTimer).toHaveBeenCalledWith(supportedContext());
  });

  it("renders the running state with elapsed time and a stop action", async () => {
    const mounted = mountInjectedIssueControl(
      document,
      supportedContext(),
      createRuntimeClient({
        snapshot: {
          authenticated: true,
          currentTimer: currentTimer(),
          errorMessage: null,
        },
      }),
    )!;

    await mounted.load();

    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.textContent).toContain("Stop Timer");
    expect(root.textContent).toContain("Running");
  });

  it("renders retryable errors without dropping the issue context", async () => {
    const stopTimer = vi.fn(async () => ({
      ok: false,
      errorMessage: "Timer stop failed",
      snapshot: { authenticated: true, currentTimer: null, errorMessage: null },
    }));
    const mounted = mountInjectedIssueControl(
      document,
      supportedContext(),
      createRuntimeClient({
        snapshot: {
          authenticated: true,
          currentTimer: currentTimer(),
          errorMessage: null,
        },
        stopTimer,
      }),
    )!;

    await mounted.load();

    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    root.querySelector<HTMLButtonElement>('[data-action="stop-timer"]')!.click();
    await Promise.resolve();

    expect(root.textContent).toContain("Improve reports filters");
    expect(root.textContent).toContain("Timer stop failed");
    expect(root.textContent).toContain("Retry");
  });

  it("remounts when GitHub navigates to another issue in the same tab", async () => {
    window.history.replaceState({}, "", "https://github.com/octo/repo/issues/184");
    document.body.innerHTML = `
      <main>
        <div id="partial-discussion-header">
          <div class="gh-header-actions"></div>
        </div>
      </main>
    `;
    document.title = "Improve reports filters";

    const runtimeClient = createRuntimeClient();
    const app = bootstrapInjectedIssueControl(document, window, runtimeClient);

    await Promise.resolve();

    let root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.textContent).toContain("Improve reports filters");

    document.title = "Fix billing regression";
    window.history.pushState({}, "", "https://github.com/octo/repo/issues/200");
    document.body
      .querySelector("main")!
      .append(document.createElement("div"));

    await Promise.resolve();

    root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;
    expect(root.textContent).toContain("Fix billing regression");
    expect(root.textContent).toContain("#200");

    app.destroy();
  });

  it("unmounts and cleans up when GitHub navigates to an unsupported page in the same tab", async () => {
    window.history.replaceState({}, "", "https://github.com/octo/repo/issues/184");
    document.body.innerHTML = `
      <main>
        <div id="partial-discussion-header">
          <div class="gh-header-actions"></div>
        </div>
      </main>
    `;
    document.title = "Improve reports filters";

    const unsubscribe = vi.fn();
    const runtimeClient = createRuntimeClient();

    runtimeClient.onSnapshotUpdated = vi.fn(() => unsubscribe);

    const app = bootstrapInjectedIssueControl(document, window, runtimeClient);

    await Promise.resolve();

    expect(document.getElementById("gitiempo-extension-root")).not.toBeNull();

    window.history.pushState({}, "", "https://github.com/octo/repo/pulls/200");
    document.body.querySelector("main")!.append(document.createElement("div"));

    await Promise.resolve();

    expect(document.getElementById("gitiempo-extension-root")).toBeNull();
    expect(unsubscribe).toHaveBeenCalledOnce();

    app.destroy();
  });
});
