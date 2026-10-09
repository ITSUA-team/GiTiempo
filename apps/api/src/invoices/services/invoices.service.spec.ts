import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { InvoicesService } from './invoices.service';

const adminUser: AuthUser = {
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001',
  email: 'admin@example.com',
  firebaseUid: 'admin-uid',
  workspaceId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002',
  role: 'admin',
};

const pmUser: AuthUser = {
  ...adminUser,
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003',
  email: 'pm@example.com',
  firebaseUid: 'pm-uid',
  role: 'pm',
};

const memberUser: AuthUser = {
  ...adminUser,
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004',
  email: 'member@example.com',
  firebaseUid: 'member-uid',
  role: 'member',
};

function createMockMembers(role: 'admin' | 'pm' | 'member') {
  return {
    requireRole: vi.fn().mockImplementation(() => {
      if (role === 'member') {
        throw new ForbiddenException('Forbidden');
      }
      return Promise.resolve({ role });
    }),
    requireAdmin: vi.fn().mockImplementation(() => {
      if (role !== 'admin') {
        throw new ForbiddenException('Forbidden');
      }
      return Promise.resolve();
    }),
  };
}

describe('InvoicesService', () => {
  it('rejects member role on list', async () => {
    const members = createMockMembers('member');
    const service = new InvoicesService({} as never, members as never);

    await expect(
      service.listInvoices(memberUser, {
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow('Forbidden');
  });

  it('rejects member role on create', async () => {
    const members = createMockMembers('member');
    const service = new InvoicesService({} as never, members as never);

    await expect(
      service.createInvoice(memberUser, {
        title: 'Test',
        dateFrom: '2027-03-01',
        dateTo: '2027-03-31',
      }),
    ).rejects.toThrow('Forbidden');
  });

  it('rejects PM role on delete', async () => {
    const members = createMockMembers('pm');
    const service = new InvoicesService({} as never, members as never);

    await expect(
      service.deleteInvoice(pmUser, '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005'),
    ).rejects.toThrow('Forbidden');
  });

  it('rejects member role on get', async () => {
    const members = createMockMembers('member');
    const service = new InvoicesService({} as never, members as never);

    await expect(
      service.getInvoice(memberUser, '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005'),
    ).rejects.toThrow('Forbidden');
  });

  it('rejects member role on update', async () => {
    const members = createMockMembers('member');
    const service = new InvoicesService({} as never, members as never);

    await expect(
      service.updateInvoice(
        memberUser,
        '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005',
        {
          notes: 'test',
        },
      ),
    ).rejects.toThrow('Forbidden');
  });
});
