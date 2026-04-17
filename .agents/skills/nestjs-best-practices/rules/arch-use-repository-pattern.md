---
title: Encapsulate Database Queries
impact: HIGH
impactDescription: Keeps services maintainable and testable
tags: architecture, data-access, queries, drizzle, encapsulation
---

## Encapsulate Database Queries

When using Drizzle ORM, services inject the database directly and write queries inline. For simple CRUD this is fine. But as query complexity grows, extract complex queries into dedicated methods or separate query services to keep business logic readable and testable.

### Pattern 1: Simple Services (direct queries inline)

For straightforward modules, keep queries directly in the service. This is the most common pattern.

```typescript
@Injectable()
export class DecksService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async findById(id: string): Promise<Deck | null> {
    const [deck] = await this.db
      .select()
      .from(decks)
      .where(eq(decks.id, id));
    return deck ?? null;
  }

  async findByWorkspace(workspaceId: string): Promise<Deck[]> {
    return this.db
      .select()
      .from(decks)
      .where(and(eq(decks.workspaceId, workspaceId), isNull(decks.deletedAt)))
      .orderBy(desc(decks.updatedAt));
  }

  async create(dto: CreateDeckDto): Promise<Deck> {
    const [deck] = await this.db
      .insert(decks)
      .values({ id: uuid(), ...dto })
      .returning();
    return deck;
  }

  async update(id: string, dto: UpdateDeckDto): Promise<Deck> {
    const [deck] = await this.db
      .update(decks)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(decks.id, id))
      .returning();
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(decks)
      .set({ deletedAt: new Date() })
      .where(eq(decks.id, id));
  }
}
```

### Pattern 2: Private Query Methods (moderate complexity)

When some queries are complex but the service is still manageable, extract queries into private methods.

```typescript
@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const [user] = await this.db
      .insert(users)
      .values({
        id: uuid(),
        email: dto.email,
        name: dto.name,
        passwordHash: await bcrypt.hash(dto.password, 10),
      })
      .$returningId();

    return this.findByIdOrThrow(user.id);
  }

  async getUserProfile(id: string): Promise<UserProfile> {
    const result = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        balance: wallets.balance,
      })
      .from(users)
      .leftJoin(wallets, eq(users.id, wallets.userId))
      .where(eq(users.id, id));

    if (!result.length) {
      throw new NotFoundException('User not found');
    }

    return result[0];
  }

  private async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user ?? null;
  }

  private async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
```

### Pattern 3: Separate Query Services (complex domains)

For domains with complex reporting, aggregation, or many query variants, extract read-heavy query logic into a dedicated query service. The main service handles writes and business logic.

```typescript
// order-query.service.ts - Handles all complex read queries
@Injectable()
export class OrderQueryService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async findOrdersWithStats(filters: OrderFilters): Promise<PaginatedResult<OrderWithStats>> {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = filters;
    const offset = (page - 1) * limit;

    const baseConditions = [
      isNull(orders.deletedAt),
      status ? eq(orders.status, status) : undefined,
      dateFrom ? gte(orders.createdAt, new Date(dateFrom)) : undefined,
      dateTo ? lte(orders.createdAt, new Date(dateTo)) : undefined,
    ].filter(Boolean);

    const items = await this.db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
        fulfilledQuantity: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        fulfilledAmount: sql<number>`COALESCE(SUM(${orderItems.price} * ${orderItems.quantity}), 0)`,
      })
      .from(orders)
      .leftJoin(orderItems, and(
        eq(orders.id, orderItems.orderId),
        eq(orderItems.status, 'fulfilled'),
      ))
      .where(and(...baseConditions))
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count: total }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...baseConditions));

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderDetails(orderId: string): Promise<OrderDetails | null> {
    const result = await this.db
      .select({
        orderId: orders.id,
        status: orders.status,
        total: orders.total,
        itemId: orderItems.id,
        itemQuantity: orderItems.quantity,
        itemPrice: orderItems.price,
        productName: products.name,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.id, orderId));

    if (!result.length) return null;
    return this.mapToOrderDetails(result);
  }
}

// orders.service.ts - Handles writes and business logic
@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE) private db: DB,
    private orderQueryService: OrderQueryService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({ id: uuid(), userId, status: 'pending', ...dto })
        .$returningId();

      for (const item of dto.items) {
        await tx.insert(orderItems).values({ orderId: order.id, ...item });
      }

      return order;
    });
  }

  async listOrders(filters: OrderFilters) {
    return this.orderQueryService.findOrdersWithStats(filters);
  }
}

// orders.module.ts
@Module({
  imports: [DatabaseModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderQueryService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

### Choosing the Right Pattern

| Complexity Level | Pattern | When to Use |
|-----------------|---------|-------------|
| Simple CRUD | Direct inline queries | Most feature modules |
| Moderate | Private query methods | When a few queries are complex but the service is manageable |
| Complex domain | Separate QueryService | Reporting, aggregations, many query variants, multi-entity joins |

### Testing with Mocked Database

```typescript
// Create a mock DB that can be injected
const createMockDb = () => ({
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockResolvedValue([{ id: '1', name: 'Test' }]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockResolvedValue([{ id: '1' }]),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  transaction: jest.fn((fn) => fn(createMockDb())),
});

describe('DecksService', () => {
  let service: DecksService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = createMockDb();
    const module = await Test.createTestingModule({
      providers: [
        DecksService,
        { provide: DATABASE, useValue: mockDb },
      ],
    }).compile();

    service = module.get(DecksService);
  });

  it('should find deck by id', async () => {
    const result = await service.findById('1');
    expect(mockDb.select).toHaveBeenCalled();
  });
});
```

Reference: [Drizzle ORM Select](https://orm.drizzle.team/docs/select)
