import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

export function buildInviteAcceptUrl(
  config: ConfigService<Env, true>,
  token: string,
): string {
  const url = new URL(
    '/invites/accept',
    config.get('USER_SPA_URL', { infer: true }),
  );
  url.searchParams.set('token', token);
  return url.toString();
}
