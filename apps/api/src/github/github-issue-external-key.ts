import {
  syncedGitHubIssueSchema,
  type SyncedGitHubIssue,
} from '@gitiempo/shared';

export function parseGitHubIssueExternalKey(
  externalKey: string | null,
): SyncedGitHubIssue | null {
  if (!externalKey) {
    return null;
  }

  const separatorIndex = externalKey.lastIndexOf('#');

  if (separatorIndex <= 0 || separatorIndex === externalKey.length - 1) {
    return null;
  }

  const parsedIssue = syncedGitHubIssueSchema.safeParse({
    githubRepo: externalKey.slice(0, separatorIndex),
    issueNumber: Number(externalKey.slice(separatorIndex + 1)),
  });

  return parsedIssue.success ? parsedIssue.data : null;
}
