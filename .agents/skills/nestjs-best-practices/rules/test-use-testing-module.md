---
title: Use Testing Module for Unit Tests
impact: HIGH
impactDescription: Enables proper isolated testing with mocked dependencies
tags: testing, unit-tests, mocking, jest, drizzle
---

## Use Testing Module for Unit Tests

Use `@nestjs/testing` module to create isolated test environments with mocked dependencies. This ensures your tests run fast, don't depend on external services, and properly test your business logic in isolation.

**Incorrect (manual instantiation bypassing DI):**

```typescript
// Instantiate services manually without DI
describe('UsersService', () => {
  it('should create user', async () => {
    const db = drizzle(realPool); // Real DB!
    const service = new UsersService(db);
    const user = await service.create({ name: 'Test' });
    // This hits the real database!
  });
});

// Test implementation details
describe('UsersController', () => {
  it('should call service', async () => {
    const service = { create: jest.fn() };
    const controller = new UsersController(service as any);
    await controller.create({ name: 'Test' });
    expect(service.create).toHaveBeenCalled(); // Tests implementation, not behavior
  });
});
```

**Correct (use Test.createTestingModule with mocked dependencies):**

```typescript
import { Test, TestingModule } from '@nestjs/testing';

// Mock Drizzle DB for testing services
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DATABASE, useValue: db },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should save and return user', async () => {
      const dto = { name: 'John', email: 'john@test.com' };
      const expectedUser = { id: '1', ...dto };

      // Mock the chain: db.insert().values().$returningId()
      db.insert().values.mockResolvedValueOnce([expectedUser]);

      const result = await service.create(dto);
      expect(result).toEqual(expectedUser);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw on duplicate email', async () => {
      // Mock: db.select().from().where() returns existing user
      db.select().from.mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: '1', email: 'test@test.com' }]),
      });

      await expect(
        service.create({ name: 'Test', email: 'test@test.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = { id: '1', name: 'John' };
      db.select().from.mockReturnValue({
        where: jest.fn().mockResolvedValue([user]),
      });

      const result = await service.findById('1');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when not found', async () => {
      db.select().from.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });
});

// Testing guards and interceptors
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow when no roles required', () => {
    const context = createMockExecutionContext({ user: { roles: [] } });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow admin for admin-only route', () => {
    const context = createMockExecutionContext({ user: { roles: ['admin'] } });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(context)).toBe(true);
  });
});

function createMockExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as ExecutionContext;
}
```

Reference: [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
