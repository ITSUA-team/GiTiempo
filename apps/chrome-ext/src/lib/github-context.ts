export interface ParsedGitHubIssueUrl {
  githubRepo: string;
  issueNumber: number;
  surface: "issue-page" | "project-issue-pane";
}

export interface SupportedGitHubIssueContext extends ParsedGitHubIssueUrl {
  issueTitle: string;
  issueUrl: string;
  kind: "supported";
}

export interface UnsupportedPageContext {
  kind: "unsupported";
}

export interface ErrorPageContext {
  kind: "error";
  message: string;
}

export type PageContext =
  | ErrorPageContext
  | SupportedGitHubIssueContext
  | UnsupportedPageContext;

const ISSUE_URL_PATTERN =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)(?:$|[?#/])/;
const PROJECT_ISSUE_PANE_PATH_PATTERN =
  /^\/orgs\/[^/]+\/projects\/[^/]+\/views\/[^/]+(?:$|\/)/;
const ISSUE_TITLE_SELECTORS = [
  '[data-testid="issue-title"]',
  '.js-issue-title',
  '.gh-header-title .markdown-title',
  'bdi.js-issue-title',
];

export function parseGitHubIssueUrl(
  url: string | URL,
): ParsedGitHubIssueUrl | null {
  let resolvedUrl: URL;

  try {
    resolvedUrl = typeof url === "string" ? new URL(url) : url;
  } catch {
    return null;
  }

  const value = resolvedUrl.toString();
  const match = ISSUE_URL_PATTERN.exec(value);

  if (!match) {
    if (
      resolvedUrl.hostname !== "github.com" ||
      !PROJECT_ISSUE_PANE_PATH_PATTERN.test(resolvedUrl.pathname) ||
      resolvedUrl.searchParams.get("pane") !== "issue"
    ) {
      return null;
    }

    const encodedIssue = resolvedUrl.searchParams.get("issue");

    if (!encodedIssue) {
      return null;
    }

    const issueParts = encodedIssue.split("|");

    if (issueParts.length !== 3) {
      return null;
    }

    const [owner, repo, issueNumberValue] = issueParts;
    const issueNumber = Number(issueNumberValue);

    if (!owner || !repo || !Number.isInteger(issueNumber) || issueNumber <= 0) {
      return null;
    }

    return {
      githubRepo: `${owner}/${repo}`,
      issueNumber,
      surface: "project-issue-pane",
    };
  }

  return {
    githubRepo: `${match[1]}/${match[2]}`,
    issueNumber: Number(match[3]),
    surface: "issue-page",
  };
}

function normalizeIssueTitle(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

export function extractGitHubIssueTitle(
  doc: Document,
  fallbackTitle?: string,
): string | null {
  for (const selector of ISSUE_TITLE_SELECTORS) {
    const title = normalizeIssueTitle(doc.querySelector(selector)?.textContent);

    if (title) {
      return title;
    }
  }

  const documentTitle = normalizeIssueTitle(fallbackTitle ?? doc.title);

  if (!documentTitle) {
    return null;
  }

  return normalizeIssueTitle(documentTitle.split("·")[0]);
}

export function resolveGitHubIssueContext(
  doc: Document,
  url: string,
): PageContext {
  const parsed = parseGitHubIssueUrl(url);

  if (!parsed) {
    return { kind: "unsupported" };
  }

  const issueTitle = extractGitHubIssueTitle(doc);

  if (!issueTitle) {
    return {
      kind: "error",
      message: "We could not detect the GitHub issue title on this page.",
    };
  }

  return {
    ...parsed,
    issueTitle,
    issueUrl: url,
    kind: "supported",
  };
}

export function findGitHubIssueMountTarget(
  doc: Document,
  pageContext: SupportedGitHubIssueContext,
): HTMLElement | null {
  if (pageContext.surface === "project-issue-pane") {
    return doc.getElementById("issue-viewer-sticky-header");
  }

  return doc.querySelector("main");
}
