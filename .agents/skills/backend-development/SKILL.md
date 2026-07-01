---
name: backend-development
description: >
  Dispatcher for NestJS backend development, database management, authentication, clean code, and transactions.
  Trigger when: working on backend development, NestJS modules, TypeORM entities,
  database migrations, JWT authentication, code quality, or handling race conditions.
---

# Skill: Backend Development Dispatcher

You are working on the NestJS backend of the Simple Banking App. This skill acts as a central dispatcher for backend-related rules and standards.

Before making changes, you **MUST** use the `view_file` tool to read the specific reference documents below that match your current task:

- **NestJS Conventions & Architecture**: `.agents/skills/backend-development/references/backend-nestjs.md`
  *(Read when writing or editing general NestJS backend code, controllers, or services)*
- **Module & Feature Scaffolding**: `.agents/skills/backend-development/references/nestjs-module-scaffold.md`
  *(Read when creating new NestJS Features, Modules, Entities, or DTOs)*
- **Clean Code & SRP**: `.agents/skills/backend-development/references/clean-code.md`
  *(Read when refactoring, performing code review, or applying Clean Code and SOLID principles)*
- **Database & Migrations**: `.agents/skills/backend-development/references/database.md`
  *(Read when writing schema migrations, database seeding, or creating TypeORM entities)*
- **TypeORM Transactions & Race Conditions**: `.agents/skills/backend-development/references/typeorm-transaction.md`
  *(Read when implementing database transactions, money transfers, pessimistic locks, or preventing double-submit)*
- **JWT & Authentication**: `.agents/skills/backend-development/references/jwt-refresh-rotation.md`
  *(Read when setting up auth guards, login/logout, JWT strategy, or refresh token rotation)*

## Priority Rules
1. **Security First**: Authentication and transaction integrity take precedence over other rules.
2. **Clean Code**: Follow SOLID principles. Keep services focused and controllers thin.
3. **Robust Transactions**: Always handle race conditions and ensure data consistency during financial operations.
