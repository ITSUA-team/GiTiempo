# Advanced Schemas

Relations, indexes, constraints, and database-specific features.

## Relations

### One-to-Many

```typescript
import { relations } from 'drizzle-orm';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
});

export const orders = mysqlTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  status: mysqlEnum('status', ['pending', 'completed', 'cancelled']).default('pending'),
  total: int('total').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

// Query with relations (requires schema passed to drizzle())
const usersWithOrders = await db.query.users.findMany({
  with: { orders: true },
  where: eq(users.email, 'user@example.com'),
});
```

### Many-to-Many

```typescript
export const users = mysqlTable('users', { id: varchar('id', { length: 36 }).primaryKey() });
export const workspaces = mysqlTable('workspaces', { id: varchar('id', { length: 36 }).primaryKey() });

export const workspaceMembers = mysqlTable('workspace_members', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  role: mysqlEnum('role', ['owner', 'admin', 'member']).default('member'),
}, (table) => [
  primaryKey({ columns: [table.userId, table.workspaceId] }),
]);

export const usersRelations = relations(users, ({ many }) => ({
  workspaceMembers: many(workspaceMembers),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
}));
```

## Indexes

```typescript
// Single column index
export const orders = mysqlTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_orders_user_id').on(table.userId),
  index('idx_orders_status').on(table.status),
  index('idx_orders_created_at').on(table.createdAt),
  index('idx_orders_user_status').on(table.userId, table.status), // composite
]);

// Unique index
export const users = mysqlTable('users', {
  email: varchar('email', { length: 255 }).notNull(),
}, (table) => [
  uniqueIndex('idx_users_email').on(table.email),
]);

// PostgreSQL partial index
export const users = pgTable('users', {
  email: varchar('email', { length: 255 }),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  activeEmailIdx: uniqueIndex('active_email_idx')
    .on(table.email)
    .where(sql`${table.deletedAt} IS NULL`),
}));

// PostgreSQL full-text search
export const posts = pgTable('posts', {
  title: text('title').notNull(),
  content: text('content').notNull(),
}, (table) => ({
  searchIdx: index('search_idx').using(
    'gin',
    sql`to_tsvector('english', ${table.title} || ' ' || ${table.content})`
  ),
}));
```

## Check Constraints

```typescript
// PostgreSQL
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  price: integer('price').notNull(),
  discountPrice: integer('discount_price'),
}, (table) => ({
  priceCheck: check('price_check', sql`${table.price} > 0`),
  discountCheck: check('discount_check', sql`${table.discountPrice} < ${table.price}`),
}));
```

## Composite Primary Keys

```typescript
export const userSettings = mysqlTable('user_settings', {
  userId: varchar('user_id', { length: 36 }).notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.key] }),
]);
```

## JSON Columns with Type Safety

```typescript
import { z } from 'zod';

const MetadataSchema = z.object({ theme: z.enum(['light', 'dark']), locale: z.string() });
type Metadata = z.infer<typeof MetadataSchema>;

// MySQL
export const users = mysqlTable('users', {
  metadata: json('metadata').$type<Metadata>(),
});

// PostgreSQL (jsonb is preferred)
export const users = pgTable('users', {
  metadata: jsonb('metadata').$type<Metadata>(),
});

// Runtime validation before write
async function updateMetadata(userId: string, metadata: unknown) {
  const validated = MetadataSchema.parse(metadata);
  await db.update(users).set({ metadata: validated }).where(eq(users.id, userId));
}
```

## Soft Delete Pattern

```typescript
export const decks = mysqlTable('decks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_decks_workspace').on(table.workspaceId),
]);

// Always filter out soft-deleted rows
const activeDecks = await db
  .select()
  .from(decks)
  .where(and(eq(decks.workspaceId, workspaceId), isNull(decks.deletedAt)))
  .orderBy(desc(decks.updatedAt));

// Soft delete
await db.update(decks).set({ deletedAt: new Date() }).where(eq(decks.id, id));
```

## Timestamp Patterns

```typescript
// MySQL
export const baseColumns = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
};

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  ...baseColumns,
});

// PostgreSQL
export const baseColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};
// Note: PostgreSQL doesn't have onUpdateNow - use a trigger or set in app code

// SQLite
export const baseColumns = {
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
};
```

## Schema-per-Feature Organization

```
src/
├── db/
│   ├── database.module.ts      # Global module, provides DATABASE token
│   ├── database.provider.ts    # Pool + Drizzle instance factory
│   ├── database.service.ts     # OnApplicationShutdown, pool.end()
│   ├── schema.ts               # Re-exports: export * from '../users/schemas/...'
│   └── types/
│       └── db.d.ts             # type DB = MySql2Database<typeof schema>
├── users/
│   ├── schemas/
│   │   ├── users.schema.ts
│   │   └── refresh-tokens.schema.ts
│   ├── dto/
│   ├── users.service.ts
│   └── users.module.ts
└── orders/
    ├── schemas/
    │   └── orders.schema.ts
    ├── services/
    │   ├── order-query.service.ts    # Complex read queries
    │   └── order-status.service.ts   # Status transition logic
    ├── orders.service.ts             # Orchestration + writes
    └── orders.module.ts
```

## Type Inference Helpers

```typescript
import { InferSelectModel, InferInsertModel, Eq } from 'drizzle-orm';

type User = InferSelectModel<typeof users>;
type NewUser = InferInsertModel<typeof users>;

// Extract specific column type
type UserId = typeof users.$inferSelect['id']; // string

// Partial for updates
type UserUpdate = Partial<NewUser> & { id: string };

// Nested relation types
type UserWithOrders = User & { orders: Order[] };
```

## Database-Specific Features

### PostgreSQL: Arrays, JSONB operators

```typescript
export const posts = pgTable('posts', {
  tags: text('tags').array(),
});

await db.select().from(posts).where(arrayContains(posts.tags, ['typescript']));

// JSONB path query
await db.select().from(settings).where(sql`${settings.config} @> '{"theme": "dark"}'::jsonb`);
```

### MySQL: Spatial Types

```typescript
import { geometry } from 'drizzle-orm/mysql-core';

export const locations = mysqlTable('locations', {
  point: geometry('point', { type: 'point', srid: 4326 }),
});

await db.select().from(locations).where(
  sql`ST_Distance_Sphere(${locations.point}, POINT(${lng}, ${lat})) < 1000`
);
```

### SQLite: FTS5

```sql
-- Migration
CREATE VIRTUAL TABLE documents_fts USING fts5(title, content, content='documents');
```
