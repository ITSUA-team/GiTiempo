# Performance

Connection pooling, caching, pagination, monitoring, and database-specific optimizations.

## Connection Pooling

### MySQL (mysql2)

```typescript
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
});

export const db = drizzle(pool, { mode: 'default', schema });

// Cleanup on shutdown
process.on('SIGTERM', async () => { await pool.end(); });
```

### PostgreSQL (node-postgres)

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  application_name: 'myapp',
  statement_timeout: 30000,
});

export const db = drizzle(pool, { schema });
```

### SQLite (better-sqlite3)

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database('sqlite.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = normal');
sqlite.pragma('cache_size = -64000'); // 64MB
sqlite.pragma('temp_store = memory');

export const db = drizzle(sqlite, { schema });
```

## Select Only Needed Columns

```typescript
// BAD: fetches all columns
const users = await db.select().from(usersTable);

// GOOD: fetch only what you need
const emails = await db.select({ email: users.email, name: users.name }).from(usersTable);

// GOOD: use aggregates instead of fetching rows
const stats = await db.select({
  total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
  count: count(),
}).from(orders).where(eq(orders.userId, userId));
```

## Pagination Strategies

### Offset Pagination

```typescript
async function paginate(page: number, limit: number = 20) {
  const offset = (page - 1) * limit;

  const items = await db.select().from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(orders);

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
```

### Cursor Pagination (faster for large datasets)

```typescript
// Constant-time regardless of position
const page = await db.select().from(orders)
  .where(lt(orders.createdAt, cursorTimestamp))
  .orderBy(desc(orders.createdAt))
  .limit(20);

// ID-based cursor
const page = await db.select().from(orders)
  .where(gt(orders.id, lastSeenId))
  .orderBy(asc(orders.id))
  .limit(20);
```

## Caching with Redis (ioredis)

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASS,
  maxRetriesPerRequest: 3,
});

// Cache-aside pattern
async function getCached<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Usage
const popularProducts = await getCached('products:popular', () =>
  db.select().from(products).orderBy(desc(products.views)).limit(20),
  300 // 5 min
);

// Invalidate on mutation
await db.update(products).set(dto).where(eq(products.id, id));
await redis.del('products:popular');
await redis.del(`product:${id}`);
```

## Index Strategy

```typescript
// Index foreign keys
export const orders = mysqlTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),    // FK
  status: varchar('status', { length: 50 }).notNull(),     // frequently filtered
  createdAt: timestamp('created_at').defaultNow().notNull(), // frequently sorted
}, (table) => [
  index('idx_orders_user_id').on(table.userId),
  index('idx_orders_status').on(table.status),
  index('idx_orders_created').on(table.createdAt),
  // Composite for common query: WHERE userId = ? AND status = ?
  index('idx_orders_user_status').on(table.userId, table.status),
]);

// Verify index usage
// PostgreSQL: EXPLAIN ANALYZE SELECT ...
// MySQL: EXPLAIN SELECT ...
```

## Query Monitoring

```typescript
// Custom logger
const db = drizzle(pool, {
  schema,
  logger: {
    logQuery(query: string, params: unknown[]) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SQL] ${query}`, params);
      }
    },
  },
});

// Measure slow queries
async function measureQuery<T>(name: string, query: Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await query;
  } finally {
    const duration = Date.now() - start;
    if (duration > 1000) console.warn(`Slow query [${name}]: ${duration}ms`);
  }
}

const users = await measureQuery('fetchUsers', db.select().from(users).limit(100));
```

## N+1 Prevention

```typescript
// BAD: N+1
const courses = await db.select().from(courses);
for (const course of courses) {
  course.decks = await db.select().from(decks).where(eq(decks.courseId, course.id));
}

// GOOD: Batch + Map grouping (2 queries)
const courses = await db.select().from(courses);
const allDecks = await db.select().from(decks).where(inArray(decks.courseId, courses.map(c => c.id)));
const byCourse = new Map<string, Deck[]>();
for (const d of allDecks) { (byCourse.get(d.courseId) ?? []).push(d); byCourse.set(d.courseId, byCourse.get(d.courseId) ?? [d]); }
// Simpler:
for (const d of allDecks) {
  const arr = byCourse.get(d.courseId) || [];
  arr.push(d);
  byCourse.set(d.courseId, arr);
}

// GOOD: Single join query
const result = await db.select({
  courseId: courses.id,
  courseName: courses.name,
  deckId: decks.id,
  deckName: decks.name,
}).from(courses).leftJoin(decks, eq(courses.id, decks.courseId));
// Then group in memory
```

## Read Replicas

```typescript
// Primary for writes
const primaryDb = drizzle(new Pool({ connectionString: process.env.PRIMARY_DB_URL }), { schema });

// Replica for reads
const replicaDb = drizzle(new Pool({ connectionString: process.env.REPLICA_DB_URL }), { schema });

// Route appropriately
async function getUsers() { return replicaDb.select().from(users); }
async function createUser(data: NewUser) { return primaryDb.insert(users).values(data).returning(); }
```

## Serverless Optimization

```typescript
// Reuse connection across warm starts
let cachedDb: DB | null = null;

export function getDb(): DB {
  if (!cachedDb) {
    const pool = mysql.createPool({
      connectionString: process.env.DATABASE_URL,
      connectionLimit: 1, // Single connection per instance
    });
    cachedDb = drizzle(pool, { mode: 'default', schema });
  }
  return cachedDb;
}
```

## SQLite Bulk Operations

```typescript
// 100x faster with native transaction
const insertMany = sqlite.transaction((rows: NewUser[]) => {
  for (const row of rows) {
    db.insert(users).values(row).run();
  }
});

insertMany(largeDataset);
```
