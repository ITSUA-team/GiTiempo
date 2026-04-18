---
title: Use Message Queues for Background Jobs
impact: MEDIUM-HIGH
impactDescription: Queues enable reliable background processing
tags: microservices, queues, bullmq, background-jobs, redis
---

## Use Message Queues for Background Jobs

Use `@nestjs/bullmq` with Redis for background job processing. Queues decouple long-running tasks from HTTP requests, enable retry logic, and distribute workload across workers. Use them for emails, file processing, AI tasks, notifications, and any task that shouldn't block user requests.

**Incorrect (long-running tasks in HTTP handlers):**

```typescript
@Controller('reports')
export class ReportsController {
  @Post()
  async generate(@Body() dto: GenerateReportDto): Promise<Report> {
    // This blocks the request for potentially minutes
    const data = await this.fetchLargeDataset(dto);
    const report = await this.processData(data); // Slow!
    await this.sendEmail(dto.email, report); // Can fail!
    return report; // Client times out
  }
}

// Fire-and-forget without retry
@Injectable()
export class EmailService {
  async sendWelcome(email: string): Promise<void> {
    await this.mailer.send({ to: email, template: 'welcome' });
    // No retry, no tracking, no visibility
  }
}
```

**Correct (use BullMQ for background processing):**

```typescript
// Configure BullMQ with Redis
// src/redis.config.ts
export function getBullMQRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASS || undefined,
  };
}

// Feature module registers its queues
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'ai-tasks' },
    ),
  ],
  providers: [AiTasksProcessor, EmailProcessor],
})
export class AiTasksModule {}

// Or configure globally
@Module({
  imports: [
    BullModule.forRoot({
      connection: getBullMQRedisConfig(),
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
  ],
})
export class AppModule {}

// Producer: Add jobs to queue
@Injectable()
export class AiTasksService {
  constructor(@InjectQueue('ai-tasks') private queue: Queue) {}

  async requestGeneration(dto: GenerateDto): Promise<{ jobId: string }> {
    const job = await this.queue.add('generate', dto, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return { jobId: job.id! };
  }

  async getStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    return {
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
    };
  }
}

// Consumer: Process jobs
@Processor('ai-tasks')
export class AiTasksProcessor {
  private readonly logger = new Logger(AiTasksProcessor.name);

  @Process('generate')
  async generate(job: Job<GenerateDto>): Promise<GenerationResult> {
    this.logger.log(`Processing AI task ${job.id}`);
    await job.updateProgress(10);

    const data = await this.prepareData(job.data);
    await job.updateProgress(50);

    const result = await this.runGeneration(data);
    await job.updateProgress(100);

    return result;
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}

// Email queue with retry
@Processor('email')
export class EmailProcessor {
  @Process('send')
  async sendEmail(job: Job<SendEmailDto>): Promise<void> {
    await this.mailer.send({
      to: job.data.to,
      template: job.data.template,
      context: job.data.data,
    });
  }
}

// Usage in service
@Injectable()
export class NotificationService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendWelcome(user: User): Promise<void> {
    await this.emailQueue.add('send', {
      to: user.email,
      template: 'welcome',
      data: { name: user.name },
    });
  }
}
```

Reference: [NestJS Queues](https://docs.nestjs.com/techniques/queues), [BullMQ](https://docs.bullmq.io/)
