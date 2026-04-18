# NestJS Integration

How to integrate Drizzle ORM into a NestJS application using the DatabaseModule pattern observed in real projects.

## DatabaseModule Setup

```typescript
import { Module, Global } from '@nestjs/common';
import { DATABASE } from './database.provider';
import { DatabaseService } from './database.service';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => {
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
        return drizzle(pool, { mode: 'default', schema });
      },
    },
    DatabaseService,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
```

## Database Service (Shutdown Cleanup)

```typescript
import { Injectable, Inject, OnApplicationShutdown } from '@nestjs/common';
import { DATABASE } from './database.provider';
import type { DB } from './types/db';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private db: DB) {}

  async onApplicationShutdown() {
    await pool.end();
  }
}
```

## Injection Token and DB Type

```typescript
export const DATABASE = Symbol('DATABASE');

// src/db/types/db.d.ts
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type * as schema from '../schema';

type DB = MySql2Database<typeof schema>;
```

## Usage in Feature Services

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { DATABASE } from '../db/database.provider';
import type { DB } from '../db/types/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async create(dto: { email: string; name: string; passwordHash: string }) {
    const [user] = await this.db
      .insert(users)
      .values({ id: uuid(), ...dto })
      .$returningId();
    return user;
  }
}
```

## Transactions in NestJS Services

```typescript
import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class WalletsService {
  constructor(@Inject(DATABASE) private db: DB) {}

  async deduct(userId: string, amount: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.balance < amount) throw new BadRequestException('Insufficient funds');
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} - ${amount}` })
        .where(eq(wallets.userId, userId));
      await tx.insert(transactionLogs).values({ userId, amount, type: 'deduction' });
    });
  }

  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [source] = await tx.select().from(wallets).where(eq(wallets.userId, fromId));
      if (!source || source.balance < amount) throw new BadRequestException('Insufficient funds');
      await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${amount}` }).where(eq(wallets.userId, fromId));
      await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${amount}` }).where(eq(wallets.userId, toId));
      await tx.insert(transferLogs).values({ fromId, toId, amount });
    });
  }
}
```

## Mocking Drizzle DB in Tests

```typescript
function createMockDb() {
  const chainable = () => {
    const handler: any = jest.fn().mockResolvedValue([]);
    const proxy = new Proxy(handler, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        target[prop] = jest.fn().mockReturnValue(proxy);
        return target[prop];
      },
    });
    return proxy;
  };

  return {
    select: jest.fn().mockReturnValue(chainable()),
    insert: jest.fn().mockReturnValue(chainable()),
    update: jest.fn().mockReturnValue(chainable()),
    delete: jest.fn().mockReturnValue(chainable()),
    execute: jest.fn().mockResolvedValue([]),
    transaction: jest.fn((fn) => fn({
      select: jest.fn().mockReturnValue(chainable()),
      insert: jest.fn().mockReturnValue(chainable()),
      update: jest.fn().mockReturnValue(chainable()),
      delete: jest.fn().mockReturnValue(chainable()),
    })),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    db = createMockDb();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DATABASE, useValue: db },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('should find user by id', async () => {
    const mockUser = { id: '1', name: 'John', email: 'john@test.com' };
    db.select().from.mockResolvedValueOnce([mockUser]);
    const result = await service.findById('1');
    expect(result).toEqual(mockUser);
  });
});
```

## Feature Module Registration

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../db/database.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Reference: [Drizzle ORM Docs](https://orm.drizzle.team)
