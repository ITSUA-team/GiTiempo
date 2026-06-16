import { describe, expect, it } from 'vitest';
import { getRegistrationValidationCode } from './registration-errors';

describe('getRegistrationValidationCode', () => {
  it('maps password-only validation issues to weak_password', () => {
    expect(
      getRegistrationValidationCode([
        { path: ['password'] },
        { path: ['password'] },
      ]),
    ).toBe('weak_password');
  });

  it('maps workspaceName-only validation issues to invalid_workspace_name', () => {
    expect(getRegistrationValidationCode([{ path: ['workspaceName'] }])).toBe(
      'invalid_workspace_name',
    );
  });

  it('returns null for mixed-field validation issues', () => {
    expect(
      getRegistrationValidationCode([
        { path: ['password'] },
        { path: ['workspaceName'] },
      ]),
    ).toBeNull();
  });
});
