---
title: Use Database Migrations
impact: HIGH
impactDescription: Enables safe, repeatable database schema changes
tags: database, migrations, drizzle, schema, drizzle-kit
---

## Use Database Migrations

Never modify production database schemas manually or rely on auto-sync. Use Drizzle Kit migrations for all schema changes. Migrations provide version control for your database, enable safe rollbacks, and ensure consistency across all environments.

**Incorrect (manual schema changes or no migrations):**

```typescript
// Manually running ALTER TABLE in production
@Injectable()
export class DatabaseService {
  async addColumn(): Promise<void> {
    await this.db.execute(sql`ALTER TABLE users ADD COLUMN age INT`);
    // No version control, no rollback, inconsistent across envs
  }
}

// Editing schema files and hoping they auto-sync
// schemas/users.schema.ts
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  age: int('age'), // Added without running migration
  // Production DB doesn't have this column yet - will crash!
});
```

**Correct (use Drizzle Kit for all schema changes):**

```typescript
// 1. Define schema in feature module
// src/users/schemas/users.schema.ts
import { mysqlTable, varchar, int, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  age: int('age').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Aggregate in central schema file
// src/db/schema.ts
export * from '../users/schemas/users.schema';
export * from '../orders/schemas/orders.schema';
export * from '../products/schemas/products.schema';

// 3. Configure Drizzle Kit
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: 'src/**/schemas/*.schema.ts',
  out: 'migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    database: process.env.DB_NAME!,
  },
  tablesFilter: ['!__drizzle_migrations__'],
});

// 4. Generate migration after schema change
// $ npx drizzle-kit generate
// This creates: migrations/0003_add_user_age.sql
// Contains: ALTER TABLE `users` ADD `age` int DEFAULT 0;

// 5. Run migrations in production
// package.json scripts:
// "migration:run": "npx drizzle-kit migrate"
// "migration:run:prod": "dotenv -e .env.production -- npx drizzle-kit migrate"

// 6. Review generated SQL before running in production
// migrations/0003_add_user_age.sql
ALTER TABLE `users` ADD `age` int DEFAULT 0;
--> statement-break
CREATE INDEX `idx_users_age` ON `users` (`age`);

// 7. Workflow for safe schema changes:
// Step 1: Edit schema file (e.g., add column)
// Step 2: Run `npx drizzle-kit generate` to create migration SQL
// Step 3: REVIEW the generated SQL carefully
// Step 4: Run `npx drizzle-kit migrate` on staging first
// Step 5: Verify application works with new schema
// Step 6: Run migration on production

// 8. Database module setup
// src/db/database.module.ts
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
        });
        return drizzle(pool, { mode: 'default', schema });
      },
    },
    DatabaseService,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}

// src/db/types/db.d.ts
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type * as schema from '../schema';
type DB = MySql2Database<typeof schema>;
```

**Safe column rename workflow:**

```bash
# Step 1: Add new column via schema + generate migration
npx drizzle-kit generate
# migration: ALTER TABLE users ADD full_name varchar(255)

# Step 2: Update code to write to both columns
# Step 3: Backfill data
# migration: UPDATE users SET full_name = name WHERE full_name IS NULL

# Step 4: Update code to read from new column only
# Step 5: Drop old column in a later migration
# migration: ALTER TABLE users DROP COLUMN name
```

**Useful Drizzle Kit commands:**

```bash
npx drizzle-kit generate   # Generate migration from schema diff
npx drizzle-kit migrate    # Run pending migrations
npx drizzle-kit studio     # Visual DB browser
npx drizzle-kit push       # Push schema directly (dev only!)
```

Reference: [Drizzle Kit Migrations](https://orm.drizzle.team/kit-docs/overview)
