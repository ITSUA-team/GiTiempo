import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { projectAssignments } from '../schemas/project-assignments.schema';
import { projects } from '../schemas/projects.schema';
import { ProjectsService } from './projects.service';

const pmUser: AuthUser = {
  sub: 'pm-1',
  email: 'pm@example.com',
  firebaseUid: 'pm-uid',
  workspaceId: 'workspace-1',
  role: 'pm',
};

const adminUser: AuthUser = {
  ...pmUser,
  sub: 'admin-1',
  email: 'admin@example.com',
  firebaseUid: 'admin-uid',
  role: 'admin',
};

const projectRow = {
  id: 'project-1',
  workspaceId: 'workspace-1',
  name: 'Project',
  color: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function selectRows(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

describe('ProjectsService', () => {
  it('auto-assigns a PM to a project created by that PM', async () => {
    const assignmentValues = vi.fn().mockResolvedValue(undefined);
    const tx = {
      insert: vi.fn((table) => {
        if (table === projects) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([projectRow]),
            }),
          };
        }
        if (table === projectAssignments) {
          return { values: assignmentValues };
        }
        throw new Error('Unexpected insert table');
      }),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = {
      requireRole: vi.fn().mockResolvedValue({ role: 'pm' }),
    };
    const service = new ProjectsService(db as never, members as never);

    const result = await service.createProject(pmUser, { name: 'Project' });

    expect(result.id).toBe(projectRow.id);
    expect(assignmentValues).toHaveBeenCalledWith({
      workspaceId: pmUser.workspaceId,
      projectId: projectRow.id,
      userId: pmUser.sub,
      assignedBy: pmUser.sub,
    });
  });

  it('rejects assignment targets with admin role', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([projectRow]))
        .mockReturnValueOnce(selectRows([{ role: 'admin' }])),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = { requireAdmin: vi.fn().mockResolvedValue(undefined) };
    const service = new ProjectsService(db as never, members as never);

    await expect(
      service.createAssignment(adminUser, projectRow.id, { userId: 'admin-2' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects duplicate assignments before insert', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([projectRow]))
        .mockReturnValueOnce(selectRows([{ role: 'member' }]))
        .mockReturnValueOnce(selectRows([{ id: 'assignment-1' }])),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = { requireAdmin: vi.fn().mockResolvedValue(undefined) };
    const service = new ProjectsService(db as never, members as never);

    await expect(
      service.createAssignment(adminUser, projectRow.id, { userId: 'user-2' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects PM project active state updates', async () => {
    const db = { update: vi.fn() };
    const members = {
      requireRole: vi.fn().mockResolvedValue({ role: 'pm' }),
    };
    const service = new ProjectsService(db as never, members as never);
    vi.spyOn(service, 'requireVisibleProject').mockResolvedValue(projectRow);

    await expect(
      service.updateProject(pmUser, projectRow.id, { isActive: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.update).not.toHaveBeenCalled();
  });
});
