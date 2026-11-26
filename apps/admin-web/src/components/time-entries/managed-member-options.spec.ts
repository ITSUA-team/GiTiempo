import { describe, expect, it } from 'vitest';

import { managedMemberOptions } from './managed-member-options';

describe('managedMemberOptions', () => {
  it('distinguishes equal names by email and equal names and emails by account ID', () => {
    const members = [
      { id: '11111111-0000-4000-8000-000000000001', displayName: 'Alex', email: 'alex@example.com' },
      { id: '22222222-0000-4000-8000-000000000002', displayName: 'Alex', email: 'alex@example.com' },
      { id: '33333333-0000-4000-8000-000000000003', displayName: 'ALEX', email: 'other@example.com' },
      { id: '44444444-0000-4000-8000-000000000004', displayName: 'Sam', email: 'sam@example.com' },
    ];

    expect(managedMemberOptions(members)).toEqual([
      { ...members[0], label: '11111111 · Alex (alex@example.com)' },
      { ...members[1], label: '22222222 · Alex (alex@example.com)' },
      { ...members[2], label: 'ALEX (other@example.com)' },
      { ...members[3], label: 'Sam' },
    ]);
  });

  it('uses the full account IDs when the short IDs also collide', () => {
    const members = [
      { id: '11111111-0000-4000-8000-000000000001', displayName: null, email: 'alex@example.com' },
      { id: '11111111-0000-4000-8000-000000000002', displayName: null, email: 'alex@example.com' },
    ];

    expect(managedMemberOptions(members)).toEqual(members.map(member => ({
      ...member, label: `${member.id} · ${member.email}`,
    })));
  });
});
