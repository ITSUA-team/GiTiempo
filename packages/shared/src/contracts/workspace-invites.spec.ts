import { describe, expect, it } from 'vitest';

import { acceptWorkspaceInviteSchema } from './workspace-invites.js';

describe('acceptWorkspaceInviteSchema', () => {
  const basePayload = {
    firebaseIdToken: 'firebase-id-token',
    token: 'invite-token',
  };

  it('keeps Google proof optional for password-based invite acceptance', () => {
    expect(acceptWorkspaceInviteSchema.parse(basePayload)).toEqual(basePayload);
  });

  it('accepts a bounded Google identity proof for social invite acceptance', () => {
    expect(
      acceptWorkspaceInviteSchema.parse({
        ...basePayload,
        googleIdToken: 'google-id-token',
      }),
    ).toEqual({
      ...basePayload,
      googleIdToken: 'google-id-token',
    });
  });

  it('rejects blank, overlong, and unknown proof fields', () => {
    expect(
      acceptWorkspaceInviteSchema.safeParse({
        ...basePayload,
        googleIdToken: '',
      }).success,
    ).toBe(false);
    expect(
      acceptWorkspaceInviteSchema.safeParse({
        ...basePayload,
        googleIdToken: 'g'.repeat(16_385),
      }).success,
    ).toBe(false);
    expect(
      acceptWorkspaceInviteSchema.safeParse({
        ...basePayload,
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
