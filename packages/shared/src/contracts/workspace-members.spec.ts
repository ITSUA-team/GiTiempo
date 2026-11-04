import { describe, expect, it } from 'vitest';

import { updateWorkspaceMemberPermissionsSchema } from './workspace-members.js';

describe('updateWorkspaceMemberPermissionsSchema', () => {
  it('accepts a permissions update enabling invoice visibility', () => {
    expect(
      updateWorkspaceMemberPermissionsSchema.parse({ canViewInvoices: true }),
    ).toEqual({
      canViewInvoices: true,
    });
  });

  it('accepts a permissions update disabling invoice visibility', () => {
    expect(
      updateWorkspaceMemberPermissionsSchema.parse({ canViewInvoices: false }),
    ).toEqual({
      canViewInvoices: false,
    });
  });

  it('rejects unknown keys', () => {
    expect(
      updateWorkspaceMemberPermissionsSchema.safeParse({
        canViewInvoices: true,
        role: 'pm',
      }).success,
    ).toBe(false);
  });

  it('rejects a missing canViewInvoices field', () => {
    expect(
      updateWorkspaceMemberPermissionsSchema.safeParse({}).success,
    ).toBe(false);
  });
});