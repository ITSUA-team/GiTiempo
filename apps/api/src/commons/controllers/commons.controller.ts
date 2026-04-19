import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Pool } from 'pg';
import { SkipThrottle } from '@nestjs/throttler';
import { PG_POOL } from '../../db/db.constants';
import type { Env } from '../../config/env.validation';

@ApiTags('commons')
@SkipThrottle()
@Controller('commons')
export class CommonsController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Liveness probe — does NOT touch external dependencies.
   * Used by orchestrators to decide whether to restart the container.
   */
  @Get('health/live')
  live() {
    return { status: 'ok' };
  }

  /**
   * Readiness probe — checks that the API can serve traffic
   * (here: that DB is reachable).
   */
  @Get('health/ready')
  async ready() {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        db: 'disconnected',
      });
    }
  }

  /**
   * Backwards-compatible alias for readiness.
   */
  @Get('health')
  async health() {
    return this.ready();
  }

  @Get('status')
  status() {
    return {
      environment: this.config.get('NODE_ENV', { infer: true }),
      swagger: this.config.get('SWAGGER_ENABLED', { infer: true }),
      uptime: Math.floor(process.uptime()),
    };
  }
}
