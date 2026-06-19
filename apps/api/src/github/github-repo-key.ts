const githubRepoPattern = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

export interface GitHubRepoKeyParts {
  owner: string;
  repo: string;
}

export function normalizeGitHubLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function parseGitHubRepoKey(
  githubRepo: string,
): GitHubRepoKeyParts | null {
  const match = githubRepo.trim().match(githubRepoPattern);
  if (!match) {
    return null;
  }

  return {
    owner: match[1]!,
    repo: match[2]!,
  };
}

export function buildGitHubRepoKey(parts: GitHubRepoKeyParts): string {
  return `${parts.owner}/${parts.repo}`;
}

export function normalizeGitHubRepoKey(githubRepo: string): string | null {
  const parts = parseGitHubRepoKey(githubRepo);
  if (!parts) {
    return null;
  }

  return buildGitHubRepoKey({
    owner: normalizeGitHubLogin(parts.owner),
    repo: normalizeGitHubLogin(parts.repo),
  });
}

export function rewriteGitHubRepoOwner(
  githubRepo: string,
  owner: string,
): string | null {
  const parts = parseGitHubRepoKey(githubRepo);
  if (!parts) {
    return null;
  }

  return buildGitHubRepoKey({
    owner,
    repo: parts.repo,
  });
}

export function normalizeGitHubIssueExternalKey(
  issueKey: string,
): string | null {
  const separatorIndex = issueKey.lastIndexOf('#');
  if (separatorIndex <= 0 || separatorIndex === issueKey.length - 1) {
    return null;
  }

  const githubRepo = normalizeGitHubRepoKey(issueKey.slice(0, separatorIndex));
  if (!githubRepo) {
    return null;
  }

  return `${githubRepo}#${issueKey.slice(separatorIndex + 1)}`;
}

export function rewriteGitHubIssueOwner(
  issueKey: string,
  owner: string,
): string | null {
  const separatorIndex = issueKey.lastIndexOf('#');
  if (separatorIndex <= 0 || separatorIndex === issueKey.length - 1) {
    return null;
  }

  const githubRepo = rewriteGitHubRepoOwner(
    issueKey.slice(0, separatorIndex),
    owner,
  );
  if (!githubRepo) {
    return null;
  }

  return `${githubRepo}#${issueKey.slice(separatorIndex + 1)}`;
}
