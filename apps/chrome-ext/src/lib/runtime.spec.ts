import { describe, expect, it } from "vitest";

import type { SupportedGitHubIssueContext } from "./github-context";
import {
  getCurrentTrackingCapability,
  type RuntimeSnapshot,
} from "./runtime";

const pageContext: SupportedGitHubIssueContext = {
  githubRepo: "octo/repo",
  issueNumber: 184,
  issueTitle: "Improve reports filters",
  issueUrl: "https://github.com/octo/repo/issues/184",
  kind: "supported",
  surface: "issue-page",
};

function snapshot(): RuntimeSnapshot {
  return {
    authenticated: true,
    currentTimer: null,
    errorMessage: null,
    trackingCapability: {
      accessScope: "project",
      canStartTracking: true,
      githubRepo: "Octo/Repo",
      issueNumber: 184,
      reason: null,
    },
    user: null,
  };
}

describe("tracking capability lookup", () => {
  it("returns only a capability matching the current issue, ignoring repository case", () => {
    const currentSnapshot = snapshot();

    expect(getCurrentTrackingCapability(currentSnapshot, pageContext)).toBe(
      currentSnapshot.trackingCapability,
    );
  });

  it("rejects a capability from another issue", () => {
    const currentSnapshot = snapshot();
    currentSnapshot.trackingCapability!.issueNumber = 185;

    expect(getCurrentTrackingCapability(currentSnapshot, pageContext)).toBeNull();
  });
});
