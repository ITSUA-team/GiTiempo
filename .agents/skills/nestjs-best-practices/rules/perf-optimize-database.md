---
title: Optimize Database Queries
impact: HIGH
impactDescription: Database queries are typically the largest source of latency
tags: performance, database, queries, optimization, drizzle
---

## Optimize Database Queries

Select only needed columns, use proper indexes, avoid over-fetching joins, and consider query performance when designing your data access. Most API slowness traces back to inefficient database queries.

**Incorrect (over-fetching data and missing indexes):**

```typescript
// Select everything when you need few fields
@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async findAllEmails(): Promise<string[]> {
    const result = await this.db.select().from(users);
    // Fetches ALL columns for ALL users
    return result.map((u) => u.email);
  }

  async getUserSummary(id: string): Promise<UserSummary> {
    const result = await this.db
      .select()
      .from(users)
      .leftJoin(posts, eq(users.id, posts.userId))
      .leftJoin(comments, eq(posts.id, comments.postId))
      .leftJoin(followers, eq(users.id, followers.userId))
      .where(eq(users.id, id));
    // Over-fetches massive join tree for just name + postCount
  }
}

// No indexes on frequently queried columns
export const orders = mysqlTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(), // No index!
  status: varchar('status', { length: 50 }).notNull(),  // No index!
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Correct (select only needed data with proper indexes):**

```typescript
// Select only needed columns
@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async findAllEmails(): Promise<string[]> {
    const result = await this.db.select({ email: users.email }).from(users);
    // Only fetches email column
    return result.map((u) => u.email);
  }

  // Use aggregates for computed values
  async getUserSummary(id: string): Promise<UserSummary> {
    const [result] = await this.db
      .select({
        name: users.name,
        postCount: count(posts.id),
      })
      .from(users)
      .leftJoin(posts, eq(users.id, posts.userId))
      .where(eq(users.id, id))
      .groupBy(users.id);
    return result;
  }

  // Fetch specific columns from joins
  async getOrderSummaries(userId: string): Promise<OrderSummary[]> {
    return this.db
      .select({
        id: orders.id,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId));
  }
}

// Add indexes in schema definitions
import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core';

export const orders = mysqlTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_orders_user_id').on(table.userId),
  index('idx_orders_status').on(table.status),
  index('idx_orders_created_at').on(table.createdAt),
  index('idx_orders_user_status').on(table.userId, table.status), // Composite for common filter
]);

// Always paginate large datasets
@Injectable()
export class OrdersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async findAll(filters: OrderFilters): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20, status } = filters;
    const offset = (page - 1) * limit;

    const conditions = [
      isNull(orders.deletedAt),
      status ? eq(orders.status, status) : undefined,
    ].filter(Boolean);

    const items = await this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(orders)
      .where(and(...conditions));

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// Use sql template for computed fields
@Injectable()
export class ProductsService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async getWithPricing(productId: string) {
    return this.db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        discount: products.discount,
        finalPrice: sql<number>`${products.price} * (1 - COALESCE(${products.discount}, 0) / 100)`,
      })
      .from(products)
      .where(eq(products.id, productId));
  }
}
```

Reference: [Drizzle ORM Select](https://orm.drizzle.team/docs/select)
