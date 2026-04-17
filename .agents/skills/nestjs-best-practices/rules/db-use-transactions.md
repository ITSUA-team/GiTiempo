---
title: Use Transactions for Multi-Step Operations
impact: HIGH
impactDescription: Prevents race conditions and ensures data consistency
tags: database, transactions, drizzle, consistency, race-conditions
---

## Use Transactions for Multi-Step Operations

Transaction management, race condition prevention, and multi-step mutation patterns are covered in detail by the **drizzle-orm** skill.

When using Drizzle ORM, wrap any read-then-write or multi-step mutation in `db.transaction()`. See the drizzle-orm skill for:
- Race condition examples and prevention
- Transfer, wallet, and order patterns with transactions
- When transactions are mandatory vs optional

Reference: [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions)
