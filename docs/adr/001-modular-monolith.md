# ADR 001: Modular Monolith

**Status:** Approved  
**Date:** 2025-01-15

## Context

We need to choose between microservices, modular monolith, or a single application for the GiTiempo backend, with separate applications for each backend and frontend.

## Decision

Modular monolith with NestJS. Single codebase containing backend runtime, 2 independent frontends, chrome extension, shared contracts between backend and frontend, all configuration and infrastructure. This allows managing everything in one place and keeping a shared context, which is especially valuable for AI-driven development.

## Consequences

- Simple deployment (one docker-compose)
- Easy to evolve into separate services later if needed
- Shared DB transactions within modules
- Lower operational complexity than microservices
- All backend modules share one DB (mitigated by schema discipline)
- Shared contracts between backend and frontend
