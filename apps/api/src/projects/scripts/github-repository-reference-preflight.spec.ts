import { describe, expect, it, vi } from 'vitest';
import { inspectGithubRepositoryReferencePreflight } from './github-repository-reference-preflight';

describe('inspectGithubRepositoryReferencePreflight', () => {
  it('reports every record involved in a case-only collision', async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ repository_reference_count: '4' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              workspace_id: 'workspace-1',
              repository_key: 'customer/api',
              reference_ids: ['ref-1', 'ref-2'],
              project_ids: ['project-1', 'project-2'],
              external_keys: ['Customer/API', 'customer/api'],
            },
          ],
        }),
    };

    await expect(
      inspectGithubRepositoryReferencePreflight(pool as never),
    ).resolves.toEqual({
      repositoryReferenceCount: 4,
      collisions: [
        {
          workspaceId: 'workspace-1',
          repositoryKey: 'customer/api',
          referenceIds: ['ref-1', 'ref-2'],
          projectIds: ['project-1', 'project-2'],
          externalKeys: ['Customer/API', 'customer/api'],
        },
      ],
    });
  });

  it('returns an empty collision list when every reference has a unique identity', async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ repository_reference_count: '2' }] })
        .mockResolvedValueOnce({ rows: [] }),
    };

    await expect(
      inspectGithubRepositoryReferencePreflight(pool as never),
    ).resolves.toEqual({ repositoryReferenceCount: 2, collisions: [] });
  });
});
