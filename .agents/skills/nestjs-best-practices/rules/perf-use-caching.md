---
title: Use Caching Strategically
impact: HIGH
impactDescription: Dramatically reduces database load and response times
tags: performance, caching, redis, ioredis, optimization
---

## Use Caching Strategically

Implement caching for expensive operations, frequently accessed data, and external API calls. Use Redis (ioredis) directly for granular control, or NestJS CacheModule for simpler scenarios. Don't cache everything - focus on high-impact areas.

**Incorrect (no caching or caching everything):**

```typescript
// No caching for expensive, repeated queries
@Injectable()
export class ProductsService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async getPopular(): Promise<Product[]> {
    // Runs complex aggregation query EVERY request
    return this.db
      .select({
        id: products.id,
        name: products.name,
        orderCount: sql<number>`COUNT(${orderItems.id})`,
      })
      .from(products)
      .leftJoin(orderItems, eq(products.id, orderItems.productId))
      .groupBy(products.id)
      .orderBy(desc(sql`orderCount`))
      .limit(20);
  }
}

// Cache everything without thought
@Injectable()
export class UsersService {
  @CacheKey('users')
  @CacheTTL(3600)
  @UseInterceptors(CacheInterceptor)
  async findAll(): Promise<User[]> {
    // Caching user list for 1 hour is wrong if data changes frequently
    return this.db.select().from(users);
  }
}
```

**Correct (strategic caching with direct Redis/ioredis):**

```typescript
// Setup Redis module
// src/redis.config.ts
export function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASS || undefined,
  };
}

// src/redis.module.ts
import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const config = getRedisConfig();
        return new Redis({
          host: config.host,
          port: config.port,
          password: config.password,
          maxRetriesPerRequest: 3,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

// Manual caching for granular control
@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE) private db: DB,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async getPopular(): Promise<Product[]> {
    const cacheKey = 'products:popular';

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const products = await this.fetchPopularProducts();
    await this.redis.setex(cacheKey, 300, JSON.stringify(products)); // 5 min TTL
    return products;
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const [product] = await this.db
      .update(products)
      .set(dto)
      .where(eq(products.id, id))
      .returning();

    await this.redis.del('products:popular');
    return product;
  }
}

// Cache with typed keys and consistent patterns
@Injectable()
export class ProfilesService {
  private static CACHE_PREFIX = 'profile';
  private static CACHE_TTL = 3600; // 1 hour

  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async getProfile(uid: string): Promise<Profile | null> {
    const cached = await this.redis.get(`${ProfilesService.CACHE_PREFIX}:${uid}`);
    if (cached) return JSON.parse(cached);
    return null;
  }

  async setProfile(uid: string, profile: Profile): Promise<void> {
    await this.redis.setex(
      `${ProfilesService.CACHE_PREFIX}:${uid}`,
      ProfilesService.CACHE_TTL,
      JSON.stringify(profile),
    );
  }

  async invalidateProfile(uid: string): Promise<void> {
    await this.redis.del(`${ProfilesService.CACHE_PREFIX}:${uid}`);
  }
}

// Event-based cache invalidation
@Injectable()
export class CacheInvalidationListener {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  @OnEvent('product.created')
  @OnEvent('product.updated')
  @OnEvent('product.deleted')
  async invalidateProductCaches(event: ProductEvent) {
    await Promise.all([
      this.redis.del('products:popular'),
      this.redis.del(`product:${event.productId}`),
    ]);
  }
}

// Alternative: NestJS CacheModule for simpler scenarios
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT'),
        ttl: 60, // seconds
      }),
    }),
  ],
})
export class AppModule {}
```

Reference: [NestJS Caching](https://docs.nestjs.com/techniques/caching), [ioredis](https://github.com/redis/ioredis)
