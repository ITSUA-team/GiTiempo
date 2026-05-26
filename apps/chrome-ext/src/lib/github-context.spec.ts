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
    });
  });

  it("rejects unsupported GitHub URLs", () => {
    expect(
      parseGitHubIssueUrl("https://github.com/octo/repo/pull/184"),
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
});
