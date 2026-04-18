---
title: Use Message and Event Patterns Correctly
impact: MEDIUM
impactDescription: Proper patterns ensure reliable communication and decoupling
tags: microservices, message-pattern, event-pattern, event-emitter, monolith
---

## Use Message and Event Patterns Correctly

NestJS supports multiple communication patterns. For **event-driven monoliths**, use `@nestjs/event-emitter` with `@OnEvent()` for intra-process decoupling. For **microservices**, use `@MessagePattern` when you need a response and `@EventPattern` for fire-and-forget notifications.

### Event-Driven Monolith (most common)

Use `@nestjs/event-emitter` to decouple modules within a single process. Events allow modules to react to changes without direct dependencies.

```typescript
// app.module.ts
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
  ],
})
export class AppModule {}

// Define typed events
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly items: OrderItem[],
    public readonly total: number,
  ) {}
}

// Service emits events
@Injectable()
export class OrdersService {
  constructor(
    private eventEmitter: EventEmitter2,
    @Inject(DATABASE) private db: DB,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({ id: uuid(), ...dto })
        .$returningId();

      for (const item of dto.items) {
        await tx.insert(orderItems).values({ orderId: order.id, ...item });
      }

      // Emit event - no knowledge of consumers
      this.eventEmitter.emit(
        'order.created',
        new OrderCreatedEvent(order.id, dto.userId, dto.items, dto.total),
      );

      return order;
    });
  }
}

// Listeners in separate modules
@Injectable()
export class EmailListener {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.emailService.sendConfirmation(event.orderId);
  }
}

@Injectable()
export class AnalyticsListener {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.analyticsService.track('order_created', {
      orderId: event.orderId,
      total: event.total,
    });
  }
}
```

### Microservice Patterns

For inter-service communication, use `@MessagePattern` when you need a response and `@EventPattern` for fire-and-forget.

```typescript
// MessagePattern: Request-Response (when you NEED a response)
@Controller()
export class InventoryController {
  @MessagePattern({ cmd: 'check_inventory' })
  async checkInventory(data: CheckInventoryDto): Promise<InventoryResult> {
    const result = await this.inventoryService.check(data.productId, data.quantity);
    return result;
  }
}

// EventPattern: Fire-and-Forget
@Controller()
export class NotificationsController {
  @EventPattern('user.created')
  async handleUserCreated(data: UserCreatedEvent): Promise<void> {
    await this.emailService.sendWelcome(data.email);
  }
}

// Error handling: EventPattern errors should be handled locally
@EventPattern('order.created')
async handleOrderCreated(data: OrderCreatedEvent): Promise<void> {
  try {
    await this.processOrder(data);
  } catch (error) {
    this.logger.error('Failed to process order event', error);
    await this.deadLetterQueue.add('order.created', data);
  }
}
```

Reference: [NestJS Events](https://docs.nestjs.com/techniques/events), [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
