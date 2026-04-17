---
title: Implement Health Checks
impact: MEDIUM-HIGH
impactDescription: Health checks enable orchestrators to manage service lifecycle
tags: health-checks, monitoring, kubernetes, mysql, redis
---

## Implement Health Checks

Implement health checks that verify critical dependencies (database, Redis, external services) are reachable. Keep checks fast with timeouts. Distinguish between liveness (should the service restart?) and readiness (can it handle traffic?).

### Pattern 1: Custom Health Check (commons module)

This is the most common pattern when not using `@nestjs/terminus`. Create a dedicated `CommonsModule` with health endpoints.

```typescript
// commons/commons.service.ts
@Injectable()
export class CommonsService {
  constructor(
    @Inject(DATABASE) private db: DB,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async checkHealth() {
    const checks: Record<string, { status: string; latency?: number }> = {};

    // Check MySQL via pool ping
    try {
      const start = Date.now();
      await this.db.execute(sql`SELECT 1`);
      checks.database = { status: 'ok', latency: Date.now() - start };
    } catch {
      checks.database = { status: 'error' };
    }

    // Check Redis
    try {
      const start = Date.now();
      const pong = await this.redis.ping();
      checks.redis = {
        status: pong === 'PONG' ? 'ok' : 'error',
        latency: Date.now() - start,
      };
    } catch {
      checks.redis = { status: 'error' };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}

// commons/commons.controller.ts
@Controller('commons')
export class CommonsController {
  constructor(private commonsService: CommonsService) {}

  @Get('health')
  async health() {
    return this.commonsService.checkHealth();
  }

  @Get('status')
  async status() {
    return {
      env: process.env.NODE_ENV,
      version: process.env.npm_package_version,
      uptime: process.uptime(),
    };
  }
}
```

### Pattern 2: @nestjs/terminus (recommended for Kubernetes)

For projects that want comprehensive health checks with Kubernetes integration.

```typescript
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

// Custom Drizzle health indicator
@Injectable()
export class DrizzleHealthIndicator extends HealthIndicator {
  constructor(@Inject(DATABASE) private db: DB) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus(key, true);
    } catch {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false),
      );
    }
  }
}

// Custom Redis health indicator
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      return this.getStatus(key, pong === 'PONG');
    } catch {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false),
      );
    }
  }
}

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dbIndicator: DrizzleHealthIndicator,
    private redisIndicator: RedisHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.dbIndicator.pingCheck('database'),
      () => this.redisIndicator.pingCheck('redis'),
    ]);
  }
}
```

### Startup Connection Check

Verify critical connections during bootstrap before accepting traffic.

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Verify connections on startup
  try {
    const commons = app.get(CommonsService);
    const health = await commons.checkHealth();
    logger.log('Health check passed', JSON.stringify(health));
  } catch (error) {
    logger.error('Startup health check failed', error);
    // Optionally exit: process.exit(1);
  }

  await app.listen(3000);
}
```

### Kubernetes Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      containers:
        - name: api
          image: api-service:latest
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
```

Reference: [NestJS Terminus](https://docs.nestjs.com/recipes/terminus)
