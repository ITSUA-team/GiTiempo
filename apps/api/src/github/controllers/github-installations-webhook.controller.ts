import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SkipAuth } from '../../auth/decorators/skip-auth.decorator';
import { GithubInstallationsService } from '../services/github-installations.service';

@Controller('github/installations')
export class GithubInstallationsWebhookController {
  constructor(private readonly installations: GithubInstallationsService) {}

  @Post('webhook')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Headers('x-github-delivery') deliveryId: string | undefined,
    @Headers('x-github-event') event: string | undefined,
  ): Promise<void> {
    // Nest preserves this only when bootstrap enables rawBody. Never rebuild it
    // from parsed JSON; the signature is over the exact byte sequence.
    if (!request.rawBody)
      throw new Error('GitHub webhook raw body is unavailable');
    await this.installations.handleWebhook(
      { signature, deliveryId, event },
      request.rawBody,
    );
  }
}
