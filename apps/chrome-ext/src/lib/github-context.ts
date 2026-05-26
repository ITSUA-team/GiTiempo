export interface ParsedGitHubIssueUrl {
  githubRepo: string;
  issueNumber: number;
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
const ISSUE_TITLE_SELECTORS = [
  '[data-testid="issue-title"]',
  '.js-issue-title',
  '.gh-header-title .markdown-title',
  'bdi.js-issue-title',
];

export function parseGitHubIssueUrl(
  url: string | URL,
): ParsedGitHubIssueUrl | null {
  const value = typeof url === "string" ? url : url.toString();
  const match = ISSUE_URL_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  return {
    githubRepo: `${match[1]}/${match[2]}`,
    issueNumber: Number(match[3]),
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

export function findGitHubIssueMountTarget(doc: Document): HTMLElement | null {
  return doc.querySelector("main");
}
