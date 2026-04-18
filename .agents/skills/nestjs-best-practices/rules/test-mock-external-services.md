---
title: Mock External Services in Tests
impact: HIGH
impactDescription: Ensures fast, reliable, deterministic tests
tags: testing, mocking, external-services, jest, drizzle
---

## Mock External Services in Tests

Never call real external services (APIs, databases, message queues) in unit tests. Mock them to ensure tests are fast, deterministic, and don't incur costs. Use realistic mock data and test edge cases like timeouts and errors.

**Incorrect (calling real APIs and databases):**

```typescript
// Call real APIs in tests
describe('PaymentService', () => {
  it('should process payment', async () => {
    const service = new PaymentService(new StripeClient(realApiKey));
    // Hits real Stripe API! Slow, costs money, flaky
    const result = await service.charge('tok_visa', 1000);
  });
});

// Use real database
describe('UsersService', () => {
  beforeEach(async () => {
    await connection.query('DELETE FROM users'); // Modifies real DB
  });
});

// Incomplete mocks
const mockHttpService = {
  get: jest.fn().mockResolvedValue({ data: {} }),
  // Missing error scenarios, missing other methods
};
```

**Correct (mock all external dependencies):**

```typescript
// Mock Drizzle database with chainable query builder
function createMockDb() {
  const chainable = () => {
    const handler: any = jest.fn().mockResolvedValue([]);
    const proxy = new Proxy(handler, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        // Chainable methods return the proxy itself
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

// Use in tests
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
    // Configure the chain to return mock data
    db.select().from.mockResolvedValueOnce([mockUser]);

    const result = await service.findById('1');
    expect(result).toEqual(mockUser);
  });
});

// For services with simple DB interactions, mock specific methods
describe('DecksService', () => {
  let service: DecksService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockResolvedValue([{ id: '1', name: 'Test Deck' }]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue([{ id: '1' }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      transaction: jest.fn((fn) => fn(mockDb)),
    };

    const module = await Test.createTestingModule({
      providers: [
        DecksService,
        { provide: DATABASE, useValue: mockDb },
      ],
    }).compile();

    service = module.get(DecksService);
  });

  it('should return decks for workspace', async () => {
    const result = await service.findByWorkspace('ws-1');
    expect(result).toEqual([{ id: '1', name: 'Test Deck' }]);
    expect(mockDb.select).toHaveBeenCalled();
  });
});

// Mock HTTP service properly
describe('WeatherService', () => {
  let service: WeatherService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WeatherService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WeatherService);
    httpService = module.get(HttpService);
  });

  it('should handle API timeout', async () => {
    httpService.get.mockReturnValue(
      throwError(() => new Error('ETIMEDOUT')),
    );
    await expect(service.getWeather('NYC')).rejects.toThrow('Weather service unavailable');
  });
});

// Mock time for time-dependent tests
describe('TokenService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should expire token after 1 hour', async () => {
    const token = await service.createToken();
    jest.advanceTimersByTime(61 * 60 * 1000);
    expect(await service.isValid(token)).toBe(false);
  });
});

// Create mock factory for complex SDKs
function createMockStripe(): jest.Mocked<Stripe> {
  return {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  } as any;
}
```

Reference: [Jest Mocking](https://jestjs.io/docs/mock-functions)
