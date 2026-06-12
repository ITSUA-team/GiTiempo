import { describe, expect, it } from 'vitest';

import { parseGitHubIssueExternalKey } from './github-issue-external-key';

describe('parseGitHubIssueExternalKey', () => {
  it('parses valid GitHub issue external keys', () => {
    expect(parseGitHubIssueExternalKey('octo/repo#184')).toEqual({
      githubRepo: 'octo/repo',
      issueNumber: 184,
    });
  });

  it.each([
    null,
    '',
    'octo/repo',
    '#184',
    'octo/repo#',
    'octo/repo#0',
    'octo/repo#1.5',
    'octo/repo/extra#184',
    'octo/repo#extra#184',
  ])('returns null for invalid external key %s', (externalKey) => {
    expect(parseGitHubIssueExternalKey(externalKey)).toBeNull();
  });
});
