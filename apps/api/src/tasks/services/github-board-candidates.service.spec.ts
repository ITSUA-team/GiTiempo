import { describe, expect, it, vi } from 'vitest';

import { GithubTaskMaterializationService } from './github-task-materialization.service';

describe('GithubTaskMaterializationService board candidates', () => {
  it('keeps only active-board rows owned by the issue organization', async () => {
    const where = vi.fn().mockResolvedValue([
      {
        id: 'board-1',
        metadata: { githubProjectOwner: 'Octo-Org' },
      },
      {
        id: 'board-2',
        metadata: { githubProjectOwner: 'another-org' },
      },
      {
        id: 'board-3',
        metadata: {},
      },
    ]);
    const query = {
      from: vi.fn(),
      innerJoin: vi.fn(),
      where,
    };
    query.from.mockReturnValue(query);
    query.innerJoin.mockReturnValue(query);
    const subject = new GithubTaskMaterializationService(
      { select: vi.fn().mockReturnValue(query) } as never,
      {} as never,
    );

    await expect(
      subject.listMappedBoardIds('workspace-1', 'octo-org'),
    ).resolves.toEqual(['board-1']);
    expect(query.innerJoin).toHaveBeenCalledOnce();
  });
});
