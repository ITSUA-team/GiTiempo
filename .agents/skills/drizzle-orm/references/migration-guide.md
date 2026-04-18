# Migration Guide

Drizzle Kit workflow, safe migration strategies, and rollback patterns.

## ⚠ Critical: Never Apply Migrations Without User Approval

**NEVER run `drizzle-kit migrate`, `drizzle-kit push`, or execute migration SQL without explicit user confirmation.** Generate, review, and prepare — but do not apply unless the user explicitly approves.

## Drizzle Kit Configuration

### MySQL

```typescript
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
```

### PostgreSQL

```typescript
export default defineConfig({
  schema: 'src/**/schemas/*.schema.ts',
  out: 'migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### SQLite

```typescript
export default defineConfig({
  schema: 'src/**/schemas/*.schema.ts',
  out: 'migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Migration Workflow

```bash
# 1. Edit schema file in your feature module
#    src/users/schemas/users.schema.ts

# 2. Generate migration from schema diff
npx drizzle-kit generate
# Creates: migrations/0003_add_user_age.sql

# 3. REVIEW the generated SQL
cat migrations/0003_add_user_age.sql

# 4. Apply on staging first
# ⚠ STOP — only run the following commands after explicit user approval
npx drizzle-kit migrate

# 5. Verify, then apply on production
dotenv -e .env.production -- npx drizzle-kit migrate
```

## Migration Commands

```bash
npx drizzle-kit generate   # Generate migration from schema diff
npx drizzle-kit migrate    # Run pending migrations
npx drizzle-kit push       # Push schema directly (dev only!)
npx drizzle-kit studio     # Visual DB browser
npx drizzle-kit introspect # Generate schema from existing DB
npx drizzle-kit check      # Check migration state without applying
```

## Safe Schema Change Patterns

### Adding a Column

```typescript
// 1. Add to schema
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  age: int('age').default(0), // New column with safe default
});

// 2. Generate migration
// npx drizzle-kit generate
// Output: ALTER TABLE `users` ADD `age` int DEFAULT 0;
```

### Renaming a Column (Safe Multi-Step)

```bash
# Step 1: Add new column
# migration: ALTER TABLE users ADD full_name varchar(255)

# Step 2: Update code to write to both old and new

# Step 3: Backfill data
# migration: UPDATE users SET full_name = name WHERE full_name IS NULL

# Step 4: Update code to read from new column only

# Step 5: Drop old column (later migration)
# migration: ALTER TABLE users DROP COLUMN name
```

### Adding a Non-Nullable Column

```sql
-- Step 1: Add as nullable with default
ALTER TABLE users ADD role varchar(50) DEFAULT 'user';

-- Step 2: Backfill existing rows
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Step 3: Make non-nullable (next migration)
ALTER TABLE users MODIFY COLUMN role varchar(50) NOT NULL DEFAULT 'user';
```

## Running Migrations Programmatically

> **Warning:** Programmatic migration runs must also be approved by the user. Only add auto-migration to startup if the user explicitly requests it.

```typescript
// For NestJS: run migrations on app startup
import { migrate } from 'drizzle-orm/mysql2/migrator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const db = app.get(DATABASE);
  await migrate(db, { migrationsFolder: './migrations' });

  await app.listen(3000);
}

// Or as a package.json script
// "migration:run": "npx drizzle-kit migrate"
// "migration:run:prod": "dotenv -e .env.production -- npx drizzle-kit migrate"
```

## Migration in CI/CD

```yaml
# GitHub Actions
- name: Run Migrations
  run: npx drizzle-kit migrate
  env:
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_USER: ${{ secrets.DB_USER }}
    DB_PASS: ${{ secrets.DB_PASS }}
    DB_NAME: ${{ secrets.DB_NAME }}
```

## Common Pitfalls

1. **Never use `drizzle-kit push` in production** - it applies schema directly without migration files
2. **Always review generated SQL** before applying to production
3. **Add columns with defaults** to handle existing rows
4. **Rename columns in multiple steps** to avoid downtime
5. **Test migrations on staging** with production-like data
6. **Keep schema files in sync** - if you edit a schema, generate the migration immediately

Reference: [Drizzle Kit Docs](https://orm.drizzle.team/kit-docs/overview)
