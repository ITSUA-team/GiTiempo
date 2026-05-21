import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Env } from '../../config/env.validation';

export interface DeliverInviteInput {
  email: string;
  inviteUrl: string;
  passwordSetupUrl: string;
  workspaceName: string;
}

@Injectable()
export class InviteDeliveryService {
  private readonly logger = new Logger(InviteDeliveryService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async deliver(input: DeliverInviteInput): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    const consoleFallback =
      !isProduction &&
      this.config.get('INVITES_EMAIL_CONSOLE_FALLBACK', { infer: true });

    if (consoleFallback) {
      this.logger.log({
        event: 'invites.delivery.console_fallback',
        email: input.email,
        inviteUrl: input.inviteUrl,
        passwordSetupUrl: input.passwordSetupUrl,
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', { infer: true }),
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure: this.config.get('SMTP_PORT', { infer: true }) === 465,
      auth: this.getAuth(),
    });

    await transporter.sendMail({
      from: this.config.get('EMAIL_FROM', { infer: true }),
      to: input.email,
      subject: `You're invited to ${input.workspaceName}`,
      text: [
        `You've been invited to ${input.workspaceName}.`,
        '',
        'Open this app-hosted password setup link if you need to set or reset your Firebase password:',
        input.passwordSetupUrl,
        '',
        'After saving your password, return to this invite accept page:',
        input.inviteUrl,
        '',
        'Sign in with the invited email, then accept the invite to create workspace access.',
      ].join('\n'),
    });
  }

  private getAuth(): { user: string; pass: string } | undefined {
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASSWORD', { infer: true });
    if (!user || !pass) return undefined;
    return { user, pass };
  }
}
