---
title: Organize by Feature Modules
impact: CRITICAL
impactDescription: "3-5x faster onboarding and development"
tags: architecture, modules, organization, drizzle
---

## Organize by Feature Modules

Organize your application into feature modules that encapsulate related functionality. Each feature module should be self-contained with its own controllers, services, schemas, and DTOs. Avoid organizing by technical layer (all controllers together, all services together). This enables 3-5x faster onboarding and feature development.

**Incorrect (technical layer organization):**

```typescript
// Technical layer organization (anti-pattern)
src/
├── controllers/
│   ├── users.controller.ts
│   ├── orders.controller.ts
│   └── products.controller.ts
├── services/
│   ├── users.service.ts
│   ├── orders.service.ts
│   └── products.service.ts
├── schemas/
│   ├── user.schema.ts
│   ├── order.schema.ts
│   └── product.schema.ts
└── app.module.ts  // Imports everything directly
```

**Correct (feature module organization with Drizzle):**

```typescript
// Feature module organization
src/
├── db/
│   ├── database.module.ts     // Global DatabaseModule
│   ├── database.provider.ts   // Pool + Drizzle instance
│   ├── database.service.ts    // Shutdown/cleanup
│   ├── schema.ts              // Re-exports all schemas
│   └── types/
│       └── db.d.ts            // type DB = MySql2Database<typeof schema>
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── schemas/
│   │   └── users.schema.ts    // mysqlTable('users', {...})
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── orders/
│   ├── dto/
│   ├── schemas/
│   │   └── orders.schema.ts
│   ├── services/
│   │   ├── order-query.service.ts  // Complex read queries
│   │   └── order-status.service.ts // Status transitions
│   ├── orders.controller.ts
│   ├── orders.service.ts           // Orchestration
│   └── orders.module.ts
├── shared/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   ├── constants/
│   ├── types/
│   └── utils/
└── app.module.ts

// Schema file per feature module
// src/users/schemas/users.schema.ts
import { mysqlTable, varchar, int, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Central schema aggregation
// src/db/schema.ts
export * from '../users/schemas/users.schema';
export * from '../orders/schemas/orders.schema';
export * from '../products/schemas/products.schema';

// Feature module imports DatabaseModule (global)
// users.module.ts
@Module({
  imports: [DatabaseModule], // Global, provides DATABASE token
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

// Complex domains can decompose further
// orders.module.ts
@Module({
  imports: [DatabaseModule],
  controllers: [CustomerOrdersController, AdminOrdersController],
  providers: [
    OrdersService,
    OrderQueryService,
    OrderStatusService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule, // Global DB module
    UsersModule,
    OrdersModule,
    SharedModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

// DB type for injection
// src/db/types/db.d.ts
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type * as schema from '../schema';

type DB = MySql2Database<typeof schema>;

// Usage in service
@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }
}
```

Reference: [NestJS Modules](https://docs.nestjs.com/modules)
