---
name: drizzle-orm
description: "Type-safe query builder for TypeScript with zero runtime overhead. Use this skill whenever working with Drizzle ORM, drizzle-kit, database schemas, SQL queries in TypeScript, migrations, or any database-related code in projects that use Drizzle. Also use when reviewing, refactoring, or debugging Drizzle queries, setting up database connections, or designing schema patterns. Triggers on mentions of drizzle, drizzle-orm, drizzle-kit, mysqlTable, pgTable, sqliteTable, db.select, db.insert, db.transaction, schema definitions, or database migrations in TypeScript projects."
---

# Drizzle ORM

TypeScript-first query builder with zero dependencies, compile-time type safety, and SQL-like syntax. Supports MySQL, PostgreSQL, and SQLite with a unified API.

## Critical Rule: Transactions for Multi-Step Operations

**Any read-then-write or multi-step mutation MUST use `db.transaction()`.** Without transactions, concurrent requests cause race conditions:

```typescript
// WRONG - race condition between read and write
const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
if (wallet.balance < amount) throw new Error('Insufficient funds');
await db.update(wallets).set({ balance: wallet.balance - amount }).where(eq(wallets.userId, userId));

// CORRECT - transaction prevents race condition
await db.transaction(async (tx) => {
  const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
  if (wallet.balance < amount) throw new Error('Insufficient funds');
  await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${amount}` }).where(eq(wallets.userId, userId));
  await tx.insert(transferLogs).values({ fromId, toId, amount });
});
```

## Critical Rule: Never Apply Migrations Without User Approval

**NEVER run `drizzle-kit migrate`, `drizzle-kit push`, or execute SQL migration files against a database without explicit user confirmation.** You MAY generate migrations, show the resulting SQL, and prepare changes — but applying them requires the user's say-so.

Safe actions (no approval needed):
- `npx drizzle-kit generate` — generate migration files from schema diff
- `npx drizzle-kit check` — check migration state without applying
- `npx drizzle-kit studio` — visual DB browser (read-only)
- Showing, reviewing, or explaining migration SQL

Actions requiring explicit user approval:
- `npx drizzle-kit migrate` — run pending migrations
- `npx drizzle-kit push` — push schema directly to database
- Running `migrate()` programmatically
- Any direct `ALTER TABLE`, `CREATE TABLE`, `DROP TABLE`, or data-modifying DDL

## Database Setup by Driver

### MySQL (mysql2)

```typescript
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

export const db = drizzle(pool, { mode: 'default', schema });
```

### PostgreSQL (node-postgres)

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
```

### SQLite (better-sqlite3)

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('sqlite.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = normal');

export const db = drizzle(sqlite, { schema });
```

## Schema Organization

Each feature module owns its schema. A central file re-exports everything.

```typescript
// src/users/schemas/users.schema.ts (MySQL example)
import { mysqlTable, varchar, int, timestamp, index } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index('idx_users_email').on(table.email),
]);

// src/users/schemas/refresh-tokens.schema.ts
export const refreshTokens = mysqlTable('refresh_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_refresh_tokens_user').on(table.userId),
]);

// PostgreSQL equivalent
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_users_email').on(table.email),
]);

// SQLite equivalent
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// src/db/schema.ts - central aggregation
export * from '../users/schemas/users.schema';
export * from '../users/schemas/refresh-tokens.schema';
export * from '../orders/schemas/orders.schema';
export * from '../products/schemas/products.schema';

// src/db/types/db.d.ts
// MySQL:
import type { MySql2Database } from 'drizzle-orm/mysql2';
// PostgreSQL:
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
// SQLite:
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import type * as schema from '../schema';
type DB = MySql2Database<typeof schema>; // swap per driver
```

## Common Schema Patterns

### Soft Delete

```typescript
export const decks = mysqlTable('decks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  deletedAt: timestamp('deleted_at'), // null = active
});

// Query with soft delete filter
const activeDecks = await db.select().from(decks).where(isNull(decks.deletedAt));
```

### Enum Columns

```typescript
// MySQL
import { mysqlEnum } from 'drizzle-orm/mysql-core';
export const orders = mysqlTable('orders', {
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'cancelled']).default('pending'),
});

// PostgreSQL
import { pgEnum } from 'drizzle-orm/pg-core';
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'completed', 'cancelled']);
export const orders = pgTable('orders', {
  status: orderStatusEnum('status').default('pending'),
});

// SQLite - use text with app-level validation
export const orders = sqliteTable('orders', {
  status: text('status', { enum: ['pending', 'processing', 'completed', 'cancelled'] }).default('pending'),
});
```

### Type Inference

```typescript
type User = typeof users.$inferSelect;    // Select result
type NewUser = typeof users.$inferInsert; // Insert input
```

## Queries

### CRUD

```typescript
import { eq, and, or, inArray, isNull, desc, asc, sql, count } from 'drizzle-orm';

// Insert
const [user] = await db.insert(users).values({ id: uuid(), email, name }).returning();
// MySQL without returning:
const [inserted] = await db.insert(users).values({ id: uuid(), email, name }).$returningId();

// Select by ID
const [user] = await db.select().from(users).where(eq(users.id, id));
const userOrNull = user ?? null;

// Select specific columns
const emails = await db.select({ email: users.email, name: users.name }).from(users);

// Update
await db.update(users).set({ name: 'New Name', updatedAt: new Date() }).where(eq(users.id, id));

// Soft delete
await db.update(decks).set({ deletedAt: new Date() }).where(eq(decks.id, id));

// Delete
await db.delete(users).where(eq(users.id, id));
```

### Filtering

```typescript
// Multiple conditions
const result = await db.select().from(orders).where(
  and(
    eq(orders.userId, userId),
    isNull(orders.deletedAt),
    status ? eq(orders.status, status) : undefined,
  ).filter(Boolean) // removes undefined from optional filters
);

// IN clause
const result = await db.select().from(decks).where(inArray(decks.courseId, courseIds));

// Dynamic filters
const conditions = [isNull(orders.deletedAt)];
if (status) conditions.push(eq(orders.status, status));
if (dateFrom) conditions.push(gte(orders.createdAt, new Date(dateFrom)));
const result = await db.select().from(orders).where(and(...conditions));
```

### Joins

```typescript
// Left join with selected columns
const result = await db
  .select({
    id: orders.id,
    status: orders.status,
    total: orders.total,
    itemName: orderItems.name,
    itemQuantity: orderItems.quantity,
  })
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
  .where(eq(orders.userId, userId));

// Join with aggregate
const stats = await db
  .select({
    userId: users.id,
    userName: users.name,
    orderCount: count(orders.id),
    totalSpent: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
  })
  .from(users)
  .leftJoin(orders, eq(users.id, orders.userId))
  .groupBy(users.id);
```

### Pagination

```typescript
async function findPaginated(filters: { page?: number; limit?: number; status?: string }) {
  const { page = 1, limit = 20, status } = filters;
  const offset = (page - 1) * limit;

  const conditions = [isNull(orders.deletedAt)];
  if (status) conditions.push(eq(orders.status, status));

  const items = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(orders)
    .where(and(...conditions));

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
```

### Avoid N+1

```typescript
// BAD: N+1 queries
const courses = await db.select().from(courses).where(inArray(courses.id, ids));
for (const course of courses) {
  course.decks = await db.select().from(decks).where(eq(decks.courseId, course.id));
}

// GOOD: 2 batched queries + Map grouping
const courses = await db.select().from(courses).where(inArray(courses.id, ids));
const courseIds = courses.map((c) => c.id);
const allDecks = await db.select().from(decks).where(inArray(decks.courseId, courseIds));

const decksByCourse = new Map<string, Deck[]>();
for (const deck of allDecks) {
  const list = decksByCourse.get(deck.courseId) || [];
  list.push(deck);
  decksByCourse.set(deck.courseId, list);
}

return courses.map((c) => ({ ...c, decks: decksByCourse.get(c.id) || [] }));
```

## Transactions

```typescript
// Auto-rollback on error
await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values({ userId, status: 'pending', total }).$returningId();
  for (const item of items) {
    await tx.insert(orderItems).values({ orderId: order.id, ...item });
    await tx.update(inventory)
      .set({ stock: sql`${inventory.stock} - ${item.quantity}` })
      .where(eq(inventory.productId, item.productId));
  }
  // If anything throws, ALL changes roll back
});

// Transfer with validation inside tx
await db.transaction(async (tx) => {
  const [source] = await tx.select().from(wallets).where(eq(wallets.userId, fromId));
  if (source.balance < amount) throw new Error('Insufficient funds');
  await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${amount}` }).where(eq(wallets.userId, fromId));
  await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${amount}` }).where(eq(wallets.userId, toId));
  await tx.insert(transfers).values({ fromId, toId, amount });
});
```

## Migrations

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: 'src/**/schemas/*.schema.ts', // glob for feature-module schemas
  out: 'migrations',
  dialect: 'mysql', // or 'postgresql', 'sqlite'
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    database: process.env.DB_NAME!,
  },
});
```

```bash
npx drizzle-kit generate   # Generate migration from schema diff
npx drizzle-kit migrate    # Run pending migrations
npx drizzle-kit studio     # Visual DB browser
npx drizzle-kit push       # Push schema directly (dev only!)
```

## Raw SQL Expressions

```typescript
import { sql } from 'drizzle-orm';

// Computed fields in select
const result = await db.select({
  id: products.id,
  name: products.name,
  finalPrice: sql<number>`${products.price} * (1 - COALESCE(${products.discount}, 0) / 100)`,
}).from(products);

// Full raw query
const hexResult = await db.execute(sql`SELECT HEX(${products.sku}) as skuHex FROM ${products}`);

// Conditional SQL fragment
const fulfilled = sql<number>`COALESCE(SUM(CASE WHEN ${orderItems.status} = 'fulfilled' THEN ${orderItems.quantity} ELSE 0 END), 0)`;
```

## Column Type Reference

| TypeScript | PostgreSQL | MySQL | SQLite |
|------------|-----------|-------|--------|
| `number` | `serial()`, `integer()` | `serial()`, `int()` | `integer()` |
| `string` | `text()`, `varchar()` | `text()`, `varchar()` | `text()` |
| `boolean` | `boolean()` | `boolean()` | `integer({ mode: 'boolean' })` |
| `Date` | `timestamp()` | `timestamp()`, `datetime()` | `integer({ mode: 'timestamp' })` |
| `string` (uuid) | `uuid()` | `varchar(36)` | `text()` |
| `unknown` (json) | `json()`, `jsonb()` | `json()` | `text({ mode: 'json' })` |

## Red Flags

**Stop and reconsider if you:**
- Read then write a value without a transaction (race condition)
- Use `select()` without columns on large tables
- Build raw SQL strings instead of using `sql` template (injection risk)
- Query inside a loop (N+1)
- Fetch all rows without pagination in production
- Use `any` for JSON columns without `$type<>()`
- Forget indexes on foreign keys

## Detailed References

- **[Advanced Schemas](./references/advanced-schemas.md)** - Relations, indexes, constraints, multi-tenant, DB-specific features
- **[Query Patterns](./references/query-patterns.md)** - Subqueries, CTEs, dynamic filters, locking, unions
- **[Performance](./references/performance.md)** - Pooling, caching with Redis, pagination, monitoring, prepared statements
- **[Migration Guide](./references/migration-guide.md)** - Drizzle Kit workflow, safe migration strategies, rollback patterns
- **[NestJS Integration](./references/nestjs-integration.md)** - DatabaseModule, DI tokens, service patterns, testing mocks

Reference: [Drizzle ORM Docs](https://orm.drizzle.team)
