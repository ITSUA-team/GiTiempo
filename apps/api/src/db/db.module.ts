import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE, PG_POOL } from './db.constants';
import type { Env } from '../config/env.validation';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        return new Pool({
          connectionString: config.get('DATABASE_URL', { infer: true }),
          max: 20,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        });
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => {
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DbModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Closing PG pool (signal: ${signal ?? 'none'})`);
    await this.pool.end();
  }
}
