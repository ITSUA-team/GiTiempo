import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from '../../db/db.constants';
import type { Env } from '../../config/env.validation';

@Controller('commons')
export class CommonsController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('health')
  async health() {
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

  @Get('status')
  status() {
    return {
      environment: this.config.get('NODE_ENV', { infer: true }),
      swagger: this.config.get('SWAGGER_ENABLED', { infer: true }),
      uptime: Math.floor(process.uptime()),
    };
  }
}
