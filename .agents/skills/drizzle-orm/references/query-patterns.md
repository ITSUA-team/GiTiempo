# Query Patterns

Advanced querying: subqueries, CTEs, dynamic filters, locking, unions, and raw SQL.

## Dynamic WHERE Clauses

```typescript
import { and, SQL } from 'drizzle-orm';

interface OrderFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

async function findOrders(filters: OrderFilters) {
  const conditions: (SQL | undefined)[] = [
    isNull(orders.deletedAt),
    filters.status ? eq(orders.status, filters.status) : undefined,
    filters.userId ? eq(orders.userId, filters.userId) : undefined,
    filters.dateFrom ? gte(orders.createdAt, new Date(filters.dateFrom)) : undefined,
    filters.dateTo ? lte(orders.createdAt, new Date(filters.dateTo)) : undefined,
  ].filter(Boolean);

  return db.select().from(orders).where(and(...conditions));
}
```

## Subqueries

### Scalar Subquery

```typescript
const avgPrice = db.select({ value: avg(products.price) }).from(products);
const expensive = await db.select().from(products).where(gt(products.price, avgPrice));
```

### Correlated Subquery

```typescript
const authorsWithCount = await db.select({
  author: authors,
  postCount: sql<number>`(
    SELECT COUNT(*) FROM ${posts}
    WHERE ${posts.authorId} = ${authors.id}
  )`,
}).from(authors);
```

### EXISTS

```typescript
const withPosts = await db.select().from(authors).where(
  sql`EXISTS (SELECT 1 FROM ${posts} WHERE ${posts.authorId} = ${authors.id})`
);
```

## Common Table Expressions (CTEs)

```typescript
const topAuthors = db.$with('top_authors').as(
  db.select({
    id: authors.id,
    name: authors.name,
    postCount: sql<number>`COUNT(${posts.id})`.as('post_count'),
  })
  .from(authors)
  .leftJoin(posts, eq(authors.id, posts.authorId))
  .groupBy(authors.id)
  .having(sql`COUNT(${posts.id}) > 10`)
);

const result = await db.with(topAuthors).select().from(topAuthors);
```

## Aggregations

```typescript
import { count, sum, avg, min, max } from 'drizzle-orm';

// Multiple aggregates
const stats = await db.select({
  count: count(),
  total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
  average: avg(orders.total),
}).from(orders).where(eq(orders.userId, userId));

// GROUP BY with HAVING
const prolificAuthors = await db.select({
  name: authors.name,
  postCount: count(posts.id),
}).from(authors)
  .leftJoin(posts, eq(authors.id, posts.authorId))
  .groupBy(authors.id)
  .having(sql`COUNT(${posts.id}) > 5`);

// Window functions
const ranked = await db.select({
  product: products,
  priceRank: sql<number>`RANK() OVER (PARTITION BY ${products.categoryId} ORDER BY ${products.price} DESC)`,
}).from(products);
```

## Raw SQL Expressions

```typescript
// Parameterized (safe from injection)
const result = await db.execute(sql`SELECT * FROM ${users} WHERE ${users.id} = ${userId}`);

// Computed fields
const withFinalPrice = await db.select({
  id: products.id,
  name: products.name,
  finalPrice: sql<number>`${products.price} * (1 - COALESCE(${products.discount}, 0) / 100)`,
}).from(products);

// Reusable SQL fragments
function activeFilter() {
  return isNull(orders.deletedAt);
}

// Conditional SQL
const fulfilledQty = sql<number>`COALESCE(SUM(CASE WHEN ${orderItems.status} = 'fulfilled' THEN ${orderItems.quantity} ELSE 0 END), 0)`;
```

## Locking (PostgreSQL)

```typescript
// FOR UPDATE - pessimistic lock for critical sections
await db.transaction(async (tx) => {
  const [wallet] = await tx.select().from(wallets)
    .where(eq(wallets.userId, userId))
    .for('update'); // Row locked until transaction commits

  if (wallet.balance < amount) throw new BadRequestException('Insufficient funds');
  await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${amount}` }).where(eq(wallets.userId, userId));
});

// SKIP LOCKED - for job queues
const nextTask = await db.select().from(tasks)
  .where(eq(tasks.status, 'pending'))
  .limit(1)
  .for('update', { skipLocked: true });
```

## UNION

```typescript
const allContent = await db
  .select({ id: posts.id, title: posts.title, type: sql<string>`'post'` })
  .from(posts)
  .union(
    db.select({ id: articles.id, title: articles.title, type: sql<string>`'article'` })
      .from(articles)
  );
```

## DISTINCT

```typescript
const uniqueRoles = await db.selectDistinct({ role: users.role }).from(users);

// PostgreSQL: DISTINCT ON
const latestPerUser = await db
  .selectDistinctOn([posts.userId], { post: posts })
  .from(posts)
  .orderBy(posts.userId, desc(posts.createdAt));
```

## Batch Operations

```typescript
// Bulk insert
await db.insert(users).values([
  { email: 'a@test.com', name: 'A' },
  { email: 'b@test.com', name: 'B' },
]).returning();

// Upsert (PostgreSQL)
await db.insert(users).values(bulkData).onConflictDoUpdate({
  target: users.email,
  set: { name: sql`EXCLUDED.name` },
});

// Upsert (MySQL)
await db.insert(users).values(bulkData).onDuplicateKeyUpdate({
  set: { name: sql`VALUES(name)` },
});

// Batch delete
await db.delete(users).where(inArray(users.id, idsToDelete));

// Chunked processing
async function* chunks<T>(arr: T[], size: number) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

for await (const chunk of chunks(largeDataset, 100)) {
  await db.transaction(async (tx) => {
    for (const item of chunk) {
      await tx.insert(users).values(item);
    }
  });
}
```

## Query Builder Pattern

```typescript
class OrderQueryBuilder {
  private conditions: (SQL | undefined)[] = [];
  private limitValue = 20;
  private offsetValue = 0;

  forUser(userId: string) {
    this.conditions.push(eq(orders.userId, userId));
    return this;
  }

  withStatus(status?: string) {
    if (status) this.conditions.push(eq(orders.status, status));
    return this;
  }

  active() {
    this.conditions.push(isNull(orders.deletedAt));
    return this;
  }

  paginate(page: number, limit: number = 20) {
    this.limitValue = limit;
    this.offsetValue = (page - 1) * limit;
    return this;
  }

  async execute() {
    const items = await db.select().from(orders)
      .where(and(...this.conditions.filter(Boolean)))
      .orderBy(desc(orders.createdAt))
      .limit(this.limitValue)
      .offset(this.offsetValue);

    const [{ total }] = await db.select({ total: sql<number>`count(*)` })
      .from(orders)
      .where(and(...this.conditions.filter(Boolean)));

    return { items, meta: { total, page: Math.floor(this.offsetValue / this.limitValue) + 1, limit: this.limitValue } };
  }
}

// Usage
const result = await new OrderQueryBuilder()
  .forUser(userId)
  .withStatus('pending')
  .active()
  .paginate(2, 10)
  .execute();
```

## Prepared Statements

```typescript
// Prepare once, execute many times
const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user_by_id');

const user1 = await getUserById.execute({ id: 'abc' });
const user2 = await getUserById.execute({ id: 'def' });
```
