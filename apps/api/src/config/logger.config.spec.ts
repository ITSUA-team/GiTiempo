import { describe, expect, it } from 'vitest';
import { SENSITIVE_LOG_REDACT_PATHS } from './logger.config';

describe('SENSITIVE_LOG_REDACT_PATHS', () => {
  it('redacts session credentials and registration passwords', () => {
    expect(SENSITIVE_LOG_REDACT_PATHS).toContain('req.headers.authorization');
    expect(SENSITIVE_LOG_REDACT_PATHS).toContain('req.body.firebaseIdToken');
    expect(SENSITIVE_LOG_REDACT_PATHS).toContain('req.body.refreshToken');
    expect(SENSITIVE_LOG_REDACT_PATHS).toContain('req.body.password');
    expect(SENSITIVE_LOG_REDACT_PATHS).toContain('res.body.accessToken');
    expect(SENSITIVE_LOG_REDACT_PATHS).toContain('res.body.refreshToken');
  });
});
