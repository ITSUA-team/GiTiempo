import { describe, expect, it } from "vitest";

import {
  extractGitHubIssueTitle,
  parseGitHubIssueUrl,
  resolveGitHubIssueContext,
} from "./github-context";

describe("github issue context", () => {
  it("parses supported GitHub issue URLs", () => {
    expect(
      parseGitHubIssueUrl("https://github.com/octo/repo/issues/184"),
    ).toEqual({
      githubRepo: "octo/repo",
      issueNumber: 184,
      surface: "issue-page",
    });
  });

  it("parses supported GitHub Projects issue pane URLs", () => {
    expect(
      parseGitHubIssueUrl(
        "https://github.com/orgs/octo/projects/7/views/1?pane=issue&itemId=192662239&issue=octo|repo|184",
      ),
    ).toEqual({
      githubRepo: "octo/repo",
      issueNumber: 184,
      surface: "project-issue-pane",
    });
  });

  it("rejects unsupported GitHub URLs", () => {
    expect(
      parseGitHubIssueUrl("https://github.com/octo/repo/pull/184"),
    ).toBeNull();
  });

  it("rejects malformed URL strings without throwing", () => {
    expect(parseGitHubIssueUrl("not-a-url")).toBeNull();
  });

  it("rejects malformed GitHub Projects issue pane URLs", () => {
    expect(
      parseGitHubIssueUrl(
        "https://github.com/orgs/octo/projects/7/views/1?pane=details&issue=octo|repo|184",
      ),
    ).toBeNull();
    expect(
      parseGitHubIssueUrl(
        "https://github.com/orgs/octo/projects/7/views/1?pane=issue",
      ),
    ).toBeNull();
    expect(
      parseGitHubIssueUrl(
        "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|not-a-number",
      ),
    ).toBeNull();
  });

  it("extracts issue titles from supported page selectors", () => {
    document.body.innerHTML = '<h1 class="js-issue-title">Improve reports filters</h1>';

    expect(extractGitHubIssueTitle(document)).toBe("Improve reports filters");
  });

  it("falls back to the document title when the issue heading is unavailable", () => {
    document.body.innerHTML = "<div></div>";
    document.title = "Improve reports filters · Issue #184 · octo/repo · GitHub";

    expect(extractGitHubIssueTitle(document)).toBe("Improve reports filters");
  });

  it("returns an error context when a supported issue page is missing a title", () => {
    document.body.innerHTML = "<div></div>";
    document.title = "";

    expect(
      resolveGitHubIssueContext(
        document,
        "https://github.com/octo/repo/issues/184",
      ),
    ).toEqual({
      kind: "error",
      message: "We could not detect the GitHub issue title on this page.",
    });
  });

  it("resolves supported GitHub Projects issue pane context with the active pane URL", () => {
    document.body.innerHTML = '<h1 class="js-issue-title">Improve reports filters</h1>';

    expect(
      resolveGitHubIssueContext(
        document,
        "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|184",
      ),
    ).toEqual({
      githubRepo: "octo/repo",
      issueNumber: 184,
      issueTitle: "Improve reports filters",
      issueUrl:
        "https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|184",
      kind: "supported",
      surface: "project-issue-pane",
    });
  });
});
