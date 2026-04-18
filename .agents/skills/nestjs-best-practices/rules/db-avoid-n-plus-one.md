---
title: Avoid N+1 Query Problems
impact: HIGH
impactDescription: N+1 queries are one of the most common performance killers
tags: database, n-plus-one, queries, performance, drizzle
---

## Avoid N+1 Query Problems

N+1 queries occur when you fetch a list of rows, then make an additional query for each row to load related data. Use Drizzle joins to fetch related data in a single query, or batch lookups to avoid the loop-per-row pattern.

**Incorrect (querying in loops causes N+1):**

```typescript
@Injectable()
export class OrdersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async getOrdersWithItems(userId: string): Promise<OrderWithItems[]> {
    const result = await this.db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId));
    // 1 query for orders

    for (const order of result) {
      // N additional queries - one per order!
      order.items = await this.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
    }

    return result;
  }
}

// Separate queries for related data
@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async getUsersWithSettings(): Promise<UserWithSettings[]> {
    const users = await this.db.select().from(usersTable);

    for (const user of users) {
      // 1 query per user for settings - N+1!
      const [settings] = await this.db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, user.id))
        .limit(1);
      user.settings = settings;
    }

    return users;
  }
}
```

**Correct (use joins and batch queries):**

```typescript
// Use joins for eager loading in a single query
@Injectable()
export class OrdersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async getOrdersWithItems(userId: string): Promise<OrderWithItems[]> {
    return this.db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
        itemId: orderItems.id,
        itemQuantity: orderItems.quantity,
        itemPrice: orderItems.price,
        itemProductId: orderItems.productId,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(eq(orders.userId, userId));
  }
}

// Use a single query with aggregate for counts
@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async getUsersWithPostCounts(): Promise<UserWithPostCount[]> {
    return this.db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        postCount: count(posts.id),
      })
      .from(usersTable)
      .leftJoin(posts, eq(usersTable.id, posts.userId))
      .groupBy(usersTable.id);
  }
}

// Batch pattern: collect IDs, single query, then group in memory
@Injectable()
export class DeckService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async getDecksWithCardCounts(workspaceId: string): Promise<DeckWithCardCount[]> {
    return this.db
      .select({
        id: decks.id,
        name: decks.name,
        cardCount: count(cards.id),
      })
      .from(decks)
      .leftJoin(cards, eq(decks.id, cards.deckId))
      .where(eq(decks.workspaceId, workspaceId))
      .groupBy(decks.id);
  }
}

// For complex nested data, fetch in 2 batched queries instead of N+1
@Injectable()
export class CoursesService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async getCoursesWithDecksAndCards(workspaceId: string) {
    // Query 1: Get courses
    const courseList = await this.db
      .select()
      .from(courses)
      .where(eq(courses.workspaceId, workspaceId));

    // Query 2: Get ALL decks for all courses in one query
    const courseIds = courseList.map((c) => c.id);
    const allDecks = await this.db
      .select()
      .from(decks)
      .where(inArray(decks.courseId, courseIds));

    // Query 3: Get ALL cards for all decks in one query
    const deckIds = allDecks.map((d) => d.id);
    const allCards = await this.db
      .select()
      .from(cards)
      .where(inArray(cards.deckId, deckIds));

    // Group in memory - O(1) per entity instead of O(N) queries
    const cardsByDeckId = new Map<string, Card[]>();
    for (const card of allCards) {
      const list = cardsByDeckId.get(card.deckId) || [];
      list.push(card);
      cardsByDeckId.set(card.deckId, list);
    }

    const decksByCourseId = new Map<string, DeckWithCards[]>();
    for (const deck of allDecks) {
      const list = decksByCourseId.get(deck.courseId) || [];
      list.push({ ...deck, cards: cardsByDeckId.get(deck.id) || [] });
      decksByCourseId.set(deck.courseId, list);
    }

    return courseList.map((course) => ({
      ...course,
      decks: decksByCourseId.get(course.id) || [],
    }));
  }
}

// Detect N+1 during development: log queries or use Drizzle query logging
// database.provider.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  // ... config
  // Enable query logging in development
  ...(process.env.NODE_ENV === 'development' && {
    debug: true,
  }),
});
```

Reference: [Drizzle ORM Joins](https://orm.drizzle.team/docs/joins)
