import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  RuntimeAuthResult,
  RuntimeClient,
  RuntimeMutationResult,
  RuntimeSnapshot,
} from "@/lib/runtime";
import { bootstrapInjectedIssueControl, mountInjectedIssueControl } from "./main";

function createMatchMediaController(initialMatches = false) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;

      for (const listener of listeners) {
        listener();
      }
    },
    stub: vi.fn(() => ({
      addEventListener: (...args: unknown[]) => {
        const listener = args[1] as () => void;
        listeners.add(listener);
      },
      get matches() {
        return matches;
      },
      removeEventListener: (...args: unknown[]) => {
        const listener = args[1] as () => void;
        listeners.delete(listener);
      },
    })),
  };
}

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

function currentIssueTimer(): NonNullable<RuntimeSnapshot["currentTimer"]> {
  const timer = currentTimer();

  if (!timer) {
    throw new Error("Expected current timer fixture.");
  }

  return {
    ...timer,
    githubIssue: {
      githubRepo: "octo/repo",
      issueNumber: 184,
    },
    project: {
      ...timer.project,
      name: "octo/repo",
    },
  };
}

function otherIssueTimer(): NonNullable<RuntimeSnapshot["currentTimer"]> {
  const timer = currentTimer();

  if (!timer) {
    throw new Error("Expected current timer fixture.");
  }

  return {
    ...timer,
    githubIssue: {
      githubRepo: "octo/repo",
      issueNumber: 999,
    },
  };
}

function supportedContext() {
  return {
    githubRepo: "octo/repo",
    issueNumber: 184,
    issueTitle: "Improve reports filters",
    issueUrl: "https://github.com/octo/repo/issues/184",
    kind: "supported" as const,
    surface: "issue-page" as const,
  };
}

function createRuntimeClient(overrides?: {
  snapshot?: RuntimeSnapshot;
  startTimer?: () => Promise<RuntimeMutationResult>;
  stopTimer?: () => Promise<RuntimeMutationResult>;
}): RuntimeClient {
  return {
    exchangeFirebaseToken: vi.fn(async (): Promise<RuntimeAuthResult> => ({
      ok: true,
      snapshot: {
        authenticated: true,
        currentTimer: null,
        errorMessage: null,
      },
    })),
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
    document.documentElement.setAttribute("data-color-mode", "light");
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

  it("mounts above the sticky header in GitHub Projects issue panes", async () => {
    document.body.innerHTML = `
      <main>
        <section id="project-pane">
          <div id="issue-viewer-sticky-header">Issue details</div>
        </section>
      </main>
    `;

    const mounted = mountInjectedIssueControl(
      document,
      {
        ...supportedContext(),
        issueUrl:
          "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|184",
        surface: "project-issue-pane",
      },
      createRuntimeClient(),
    );

    await mounted?.load();

    const stickyHeader = document.getElementById("issue-viewer-sticky-header");
    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;
    const section = root.querySelector("section");
    const container = section?.parentElement;

    expect(stickyHeader?.previousElementSibling?.id).toBe("gitiempo-extension-root");
    expect(stickyHeader?.previousElementSibling?.className).toBe("mb-2");
    expect(container?.classList.contains("pt-2")).toBe(true);
    expect(container?.classList.contains("px-6")).toBe(true);
    expect(section?.classList.contains("gap-3")).toBe(true);
    expect(section?.classList.contains("py-3")).toBe(true);
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
    expect(root.innerHTML).toContain("text-text-dark");
    root.querySelector<HTMLButtonElement>('[data-action="open-extension"]')!.click();
    expect(runtimeClient.openExtension).toHaveBeenCalledOnce();
  });

  it("renders inverse token snippet text on GitHub dark pages", async () => {
    document.documentElement.setAttribute("data-color-mode", "dark");

    const mounted = mountInjectedIssueControl(
      document,
      supportedContext(),
      createRuntimeClient(),
    )!;

    await mounted.load();

    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.innerHTML).toContain("text-text-inverse");
    expect(root.innerHTML).toContain("text-text-inverse-muted");
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
          currentTimer: currentIssueTimer(),
          errorMessage: null,
        },
      }),
    )!;

    await mounted.load();

    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.textContent).toContain("Running");
    expect(root.textContent).toContain("Stop Timer");
  });

  it("renders a running-elsewhere state without a stop action", async () => {
    const mounted = mountInjectedIssueControl(
      document,
      supportedContext(),
      createRuntimeClient({
        snapshot: {
          authenticated: true,
          currentTimer: otherIssueTimer(),
          errorMessage: null,
        },
      }),
    )!;

    await mounted.load();

    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.textContent).toContain("Timer running elsewhere");
    expect(root.textContent).not.toContain("Stop Timer");
    expect(root.textContent).toContain("Open extension");
    expect(root.textContent).toContain("Project Orion");
  });

  it("keeps the current timer non-destructive when github issue linkage is unavailable", async () => {
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

    expect(root.textContent).toContain("Timer running elsewhere");
    expect(root.textContent).not.toContain("Stop Timer");
    expect(root.textContent).toContain("Open extension");
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
          currentTimer: currentIssueTimer(),
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

  it("mounts after the Projects issue pane sticky header becomes available", async () => {
    window.history.replaceState(
      {},
      "",
      "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|184",
    );
    document.body.innerHTML = `
      <main>
        <section id="project-pane"></section>
      </main>
    `;
    document.title = "Improve reports filters";

    const app = bootstrapInjectedIssueControl(document, window, createRuntimeClient());

    await Promise.resolve();

    expect(document.getElementById("gitiempo-extension-root")).toBeNull();

    const stickyHeader = document.createElement("div");

    stickyHeader.id = "issue-viewer-sticky-header";
    stickyHeader.textContent = "Issue details";
    document.getElementById("project-pane")!.append(stickyHeader);

    await Promise.resolve();

    expect(stickyHeader.previousElementSibling?.id).toBe("gitiempo-extension-root");

    app.destroy();
  });

  it("remounts when GitHub rerender removes the injected host without changing the URL", async () => {
    window.history.replaceState({}, "", "https://github.com/octo/repo/issues/184");
    document.body.innerHTML = `
      <main>
        <div id="partial-discussion-header">
          <div class="gh-header-actions"></div>
        </div>
      </main>
    `;
    document.title = "Improve reports filters";

    const app = bootstrapInjectedIssueControl(document, window, createRuntimeClient());

    await Promise.resolve();

    document.getElementById("gitiempo-extension-root")?.remove();
    document.body.querySelector("main")!.append(document.createElement("div"));

    await Promise.resolve();

    expect(document.getElementById("gitiempo-extension-root")).not.toBeNull();

    app.destroy();
  });

  it("updates snippet text classes when GitHub theme changes without reload", async () => {
    const matchMediaController = createMatchMediaController(false);

    window.matchMedia = matchMediaController.stub as unknown as typeof window.matchMedia;

    const mounted = mountInjectedIssueControl(
      document,
      supportedContext(),
      createRuntimeClient(),
    )!;

    await mounted.load();

    let root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.innerHTML).toContain("text-text-dark");

    document.documentElement.setAttribute("data-color-mode", "dark");
    await Promise.resolve();

    root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;
    expect(root.innerHTML).toContain("text-text-inverse");

    mounted.destroy();
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

    window.history.pushState({}, "", "https://github.com/octo/repo/pull/200");
    document.body.querySelector("main")!.append(document.createElement("div"));

    await Promise.resolve();

    expect(document.getElementById("gitiempo-extension-root")).toBeNull();
    expect(unsubscribe).toHaveBeenCalledOnce();

    app.destroy();
  });

  it("updates the mounted Projects pane issue when the pane URL changes", async () => {
    window.history.replaceState(
      {},
      "",
      "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|184",
    );
    document.body.innerHTML = `
      <main>
        <section id="project-pane">
          <div id="issue-viewer-sticky-header">Issue details</div>
        </section>
      </main>
    `;
    document.title = "Improve reports filters";

    const app = bootstrapInjectedIssueControl(document, window, createRuntimeClient());

    await Promise.resolve();

    let root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.textContent).toContain("Improve reports filters");
    expect(root.textContent).toContain("#184");

    document.title = "Fix billing regression";
    window.history.pushState(
      {},
      "",
      "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|200",
    );
    document
      .getElementById("project-pane")!
      .append(document.createElement("div"));

    await Promise.resolve();

    root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;
    expect(root.textContent).toContain("Fix billing regression");
    expect(root.textContent).toContain("#200");

    app.destroy();
  });

  it("unmounts when a Projects pane stops exposing supported issue context", async () => {
    window.history.replaceState(
      {},
      "",
      "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|184",
    );
    document.body.innerHTML = `
      <main>
        <section id="project-pane">
          <div id="issue-viewer-sticky-header">Issue details</div>
        </section>
      </main>
    `;
    document.title = "Improve reports filters";

    const app = bootstrapInjectedIssueControl(document, window, createRuntimeClient());

    await Promise.resolve();

    expect(document.getElementById("gitiempo-extension-root")).not.toBeNull();

    window.history.pushState(
      {},
      "",
      "https://github.com/orgs/octo/projects/7/views/1?pane=details&issue=octo|repo|184",
    );
    document
      .getElementById("project-pane")!
      .append(document.createElement("div"));

    await Promise.resolve();

    expect(document.getElementById("gitiempo-extension-root")).toBeNull();

    app.destroy();
  });

  it("mounts after GitHub navigates from a pull request to an issue in the same tab", async () => {
    window.history.replaceState({}, "", "https://github.com/octo/repo/pull/200");
    document.body.innerHTML = `
      <main>
        <div id="partial-discussion-header">
          <div class="gh-header-actions"></div>
        </div>
      </main>
    `;
    document.title = "Unsupported pull request";

    const app = bootstrapInjectedIssueControl(
      document,
      window,
      createRuntimeClient(),
    );

    await Promise.resolve();

    expect(document.getElementById("gitiempo-extension-root")).toBeNull();

    document.title = "Fix billing regression";
    window.history.pushState({}, "", "https://github.com/octo/repo/issues/200");
    document.body.querySelector("main")!.append(document.createElement("div"));

    await Promise.resolve();

    const root = document.getElementById("gitiempo-extension-root")!.shadowRoot!;

    expect(root.textContent).toContain("Fix billing regression");
    expect(root.textContent).toContain("#200");

    app.destroy();
  });
});
