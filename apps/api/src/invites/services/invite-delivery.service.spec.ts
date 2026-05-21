import { describe, expect, it, vi } from 'vitest';
import { InviteDeliveryService } from './invite-delivery.service';

const sendMailMock = vi.fn().mockResolvedValue(undefined);

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

function makeService(
  consoleFallback: boolean,
  showSecrets = false,
) {
  const configGet = vi.fn((key: string) => {
    if (key === 'INVITES_EMAIL_CONSOLE_FALLBACK') return consoleFallback;
    if (key === 'INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS') {
      return showSecrets;
    }
    if (key === 'SMTP_HOST') return 'smtp.example.com';
    if (key === 'SMTP_PORT') return 587;
    if (key === 'EMAIL_FROM') return 'noreply@example.com';
    if (key === 'SMTP_USER') return undefined;
    if (key === 'SMTP_PASSWORD') return undefined;
    if (key === 'USER_SPA_URL') return 'http://localhost:5173';
    return undefined;
  });
  const config = { get: configGet } as never;
  return new InviteDeliveryService(config);
}

describe('InviteDeliveryService', () => {
  it('skips console fallback when NODE_ENV is production even if config is true', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    sendMailMock.mockClear();

    try {
      const service = makeService(true);
      const logSpy = vi.spyOn(service['logger'], 'log');

      await service.deliver({
        email: 'test@example.com',
        inviteUrl: 'http://localhost:5173/invites/accept?token=secret-token',
        passwordSetupUrl: 'https://firebase.test/reset',
        workspaceName: 'Test Workspace',
      });

      expect(logSpy).not.toHaveBeenCalled();
      expect(sendMailMock).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('uses console fallback in development when config is true', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    sendMailMock.mockClear();

    try {
      const service = makeService(true);
      const logSpy = vi.spyOn(service['logger'], 'log');

      await service.deliver({
        email: 'test@example.com',
        inviteUrl: 'http://localhost:5173/invites/accept?token=secret-token',
        passwordSetupUrl: 'https://firebase.test/reset',
        workspaceName: 'Test Workspace',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'invites.delivery.console_fallback',
          email: 'test@example.com',
          passwordSetupUrl: 'https://firebase.test/reset',
          inviteUrl: 'http://localhost:5173/invites/accept?token=%5Bredacted%5D',
        }),
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          inviteUrl: 'http://localhost:5173/invites/accept?token=secret-token',
        }),
      );
      expect(sendMailMock).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('allows full invite links in development when the debug flag is true', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    sendMailMock.mockClear();

    try {
      const service = makeService(true, true);
      const logSpy = vi.spyOn(service['logger'], 'log');

      await service.deliver({
        email: 'test@example.com',
        inviteUrl: 'http://localhost:5173/invites/accept?token=secret-token',
        passwordSetupUrl:
          'https://firebase.test/reset?mode=resetPassword&oobCode=test-code&continueUrl=http%3A%2F%2Flocalhost%3A5173%2Finvites%2Faccept%3Ftoken%3Dsecret-token',
        workspaceName: 'Test Workspace',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'invites.delivery.console_fallback',
          email: 'test@example.com',
          inviteUrl: 'http://localhost:5173/invites/accept?token=secret-token',
          passwordSetupUrl:
            'https://firebase.test/reset?mode=resetPassword&oobCode=test-code&continueUrl=http%3A%2F%2Flocalhost%3A5173%2Finvites%2Faccept%3Ftoken%3Dsecret-token',
        }),
      );
      expect(sendMailMock).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('uses SMTP when console fallback is false', async () => {
    sendMailMock.mockClear();
    const service = makeService(false);
    const logSpy = vi.spyOn(service['logger'], 'log');

    await service.deliver({
      email: 'test@example.com',
      inviteUrl: 'http://localhost:5173/invites/accept?token=secret-token',
      passwordSetupUrl: 'https://firebase.test/reset',
      workspaceName: 'Test Workspace',
    });

    expect(logSpy).not.toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        text: expect.stringContaining(
          'Open this app-hosted password setup link if you need to set or reset your Firebase password:',
        ),
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('https://firebase.test/reset'),
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          'After saving your password, return to this invite accept page:',
        ),
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          'http://localhost:5173/invites/accept?token=secret-token',
        ),
      }),
    );
  });
});
