import { githubReferenceIssueTitleMaxLength } from '@gitiempo/shared';

export interface ParsedGitHubIssueUrl {
  githubRepo: string;
  issueNumber: number;
  surface: 'issue-page' | 'project-issue-pane';
}

export interface SupportedGitHubIssueContext extends ParsedGitHubIssueUrl {
  issueTitle: string;
  issueUrl: string;
  kind: 'supported';
}

export interface UnsupportedPageContext {
  kind: 'unsupported';
}

export interface ErrorPageContext {
  kind: 'error';
  message: string;
}

export type PageContext =
  | ErrorPageContext
  | SupportedGitHubIssueContext
  | UnsupportedPageContext;

const ISSUE_URL_PATTERN =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)(?:$|[?#])/;
const PROJECT_ISSUE_PANE_PATH_PATTERN =
  /^\/orgs\/[^/]+\/projects\/[^/]+(?:\/views\/[^/]+)?\/?$/;
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
    resolvedUrl = typeof url === 'string' ? new URL(url) : url;
  } catch {
    return null;
  }

  if (
    resolvedUrl.protocol !== 'https:' ||
    resolvedUrl.hostname !== 'github.com' ||
    resolvedUrl.port ||
    resolvedUrl.username ||
    resolvedUrl.password
  )
    return null;

  const value = resolvedUrl.toString();
  const match = ISSUE_URL_PATTERN.exec(value);

  if (!match) {
    if (
      resolvedUrl.hostname !== 'github.com' ||
      !PROJECT_ISSUE_PANE_PATH_PATTERN.test(resolvedUrl.pathname) ||
      resolvedUrl.searchParams.get('pane') !== 'issue'
    ) {
      return null;
    }

    const encodedIssue = resolvedUrl.searchParams.get('issue');

    if (!encodedIssue) {
      return null;
    }

    const issueParts = encodedIssue.split('|');

    if (issueParts.length !== 3) {
      return null;
    }

    const [owner, repo, issueNumberValue] = issueParts;
    const issueNumber = Number(issueNumberValue);

    if (
      ![owner, repo].every(
        (part) =>
          /^[A-Za-z0-9_.-]+$/.test(part) && part !== '.' && part !== '..',
      ) ||
      !/^[1-9]\d*$/.test(issueNumberValue) ||
      !Number.isSafeInteger(issueNumber) ||
      issueNumber <= 0
    ) {
      return null;
    }

    return {
      githubRepo: `${owner}/${repo}`,
      issueNumber,
      surface: 'project-issue-pane',
    };
  }

  if (!Number.isSafeInteger(Number(match[3])) || Number(match[3]) <= 0)
    return null;
  if (
    ![match[1], match[2]].every(
      (part) => /^[A-Za-z0-9_.-]+$/.test(part) && part !== '.' && part !== '..',
    )
  )
    return null;

  return {
    githubRepo: `${match[1]}/${match[2]}`,
    issueNumber: Number(match[3]),
    surface: 'issue-page',
  };
}

function normalizeIssueTitle(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';

  return normalized.length > 0 ? normalized : null;
}

function isValidIssueTitle(value: string | null | undefined): value is string {
  if (!value) return false;

  return (
    value.length <= githubReferenceIssueTitleMaxLength &&
    [...value].every(
      (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
    )
  );
}

function isMatchingIssueIdentity(
  declaredIdentity: ParsedGitHubIssueUrl | null,
  expectedIdentity: ParsedGitHubIssueUrl,
): boolean {
  return (
    declaredIdentity?.surface === 'issue-page' &&
    declaredIdentity.githubRepo.toLowerCase() ===
      expectedIdentity.githubRepo.toLowerCase() &&
    declaredIdentity.issueNumber === expectedIdentity.issueNumber
  );
}

export function extractGitHubIssueTitle(
  doc: Document,
  surface: ParsedGitHubIssueUrl['surface'] = 'issue-page',
): string | null {
  const stickyHeader = doc.getElementById('issue-viewer-sticky-header');
  const titleRoot =
    surface === 'project-issue-pane'
      ? (stickyHeader?.closest('[role="dialog"]') ??
        stickyHeader?.parentElement)
      : doc;

  if (!titleRoot) return null;

  for (const selector of ISSUE_TITLE_SELECTORS) {
    const title = normalizeIssueTitle(
      titleRoot.querySelector(selector)?.textContent,
    );
    if (isValidIssueTitle(title))
      return title;
  }

  return null;
}

export function canonicalGitHubIssueUrl(context: ParsedGitHubIssueUrl): string {
  return `https://github.com/${context.githubRepo}/issues/${context.issueNumber}`;
}

function resolveRenderedIssuePageTitle(
  doc: Document,
  expectedIdentity: ParsedGitHubIssueUrl,
): string | null {
  const bodyHeaderLink = doc.querySelector<HTMLAnchorElement>(
    '[data-testid="issue-body-header-link"]',
  );

  if (!bodyHeaderLink) {
    return null;
  }

  const header = doc.querySelector<HTMLElement>('[data-testid="issue-header"]');
  const titleElement = header?.querySelector<HTMLElement>(
    '[data-testid="issue-title"]',
  );
  const title = normalizeIssueTitle(titleElement?.textContent);
  const expectedIssueNumber = `#${expectedIdentity.issueNumber}`;
  const issueHeading = titleElement?.closest('h1');
  let titleBranch = titleElement;

  while (titleBranch?.parentElement && titleBranch.parentElement !== issueHeading) {
    titleBranch = titleBranch.parentElement;
  }

  const headerShowsExpectedNumber = Array.from(
    issueHeading?.querySelectorAll<HTMLElement>('*') ?? [],
  ).some(
    (element) =>
      !titleBranch?.contains(element) &&
      !element.closest('button, [role="tooltip"], [aria-hidden="true"]') &&
      normalizeIssueTitle(element.textContent) === expectedIssueNumber,
  );
  const declaredIdentity = parseGitHubIssueUrl(bodyHeaderLink.href);

  return isMatchingIssueIdentity(declaredIdentity, expectedIdentity) &&
    headerShowsExpectedNumber &&
    isValidIssueTitle(title)
    ? title
    : null;
}

export function resolveGitHubIssueContext(
  doc: Document,
  url: string,
): PageContext {
  const parsed = parseGitHubIssueUrl(url);

  if (!parsed) {
    return { kind: 'unsupported' };
  }

  const canonicalUrl = canonicalGitHubIssueUrl(parsed);
  if (parsed.surface === 'issue-page') {
    const renderedTitle = resolveRenderedIssuePageTitle(doc, parsed);

    if (renderedTitle) {
      return {
        ...parsed,
        issueTitle: renderedTitle,
        issueUrl: canonicalUrl,
        kind: 'supported',
      };
    }

    const bodyHeaderLink = doc.querySelector(
      '[data-testid="issue-body-header-link"]',
    );
    const canonicalLink = doc.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );

    // Once GitHub has rendered its issue body header, do not fall back to a
    // possibly stale head canonical or title from the previous SPA route.
    if (bodyHeaderLink) {
      return {
        kind: 'error',
        message: 'We could not detect the GitHub issue title on this page.',
      };
    }

    const declaredIdentity = canonicalLink
      ? parseGitHubIssueUrl(canonicalLink.href)
      : null;
    const issueTitle = isMatchingIssueIdentity(declaredIdentity, parsed)
      ? extractGitHubIssueTitle(doc, parsed.surface)
      : null;

    if (!issueTitle) {
      return {
        kind: 'error',
        message: 'We could not detect the GitHub issue title on this page.',
      };
    }

    return {
      ...parsed,
      issueTitle,
      issueUrl: canonicalUrl,
      kind: 'supported',
    };
  }

  const declaredUrl = doc
    .getElementById('issue-viewer-sticky-header')
    ?.querySelector<HTMLAnchorElement>('a[href*="/issues/"]')?.href;
  const declaredIdentity = declaredUrl
    ? parseGitHubIssueUrl(declaredUrl)
    : null;
  const issueTitle = isMatchingIssueIdentity(declaredIdentity, parsed)
    ? extractGitHubIssueTitle(doc, parsed.surface)
    : null;

  if (!issueTitle) {
    return {
      kind: 'error',
      message: 'We could not detect the GitHub issue title on this page.',
    };
  }

  return {
    ...parsed,
    issueTitle,
    issueUrl: canonicalUrl,
    kind: 'supported',
  };
}

export function findGitHubIssueMountTarget(
  doc: Document,
  pageContext: SupportedGitHubIssueContext,
): HTMLElement | null {
  if (pageContext.surface === 'project-issue-pane') {
    return doc.getElementById('issue-viewer-sticky-header');
  }

  return doc.querySelector('main');
}
