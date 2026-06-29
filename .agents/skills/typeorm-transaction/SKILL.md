---
name: typeorm-transaction
description: >
  Implement database transaction with TypeORM for banking transfers.
  Trigger when: need QueryRunner, rollback, pessimistic lock, race condition, transfer,
  balance updates, idempotency key, double-submit prevention.
triggers:
  - "database transaction"
  - "QueryRunner"
  - "transfer"
  - "transfer money"
  - "pessimistic lock"
  - "race condition"
  - "rollback"
  - "idempotency"
  - "double-submit"
  - "atomic balance update"
---

# Skill: TypeORM Transaction — Banking Transfer Pattern

## When to Use This Skill

Use this skill when implementing any atomic multi-step database write operation in the Simple Banking App:
- Money transfers (debiting sender + crediting receiver + inserting logs).
- Any write operation modifying multiple rows/tables where consistency is required.

## Standard Pattern — QueryRunner with Pessimistic Locking

```typescript
// transactions.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { Account } from '@/accounts/entities/account.entity';
import { Transaction } from './entities/transaction.entity';
import { TransferDto } from './dto/transfer.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async transfer(dto: TransferDto, currentUserId: string): Promise<Transaction> {
    // === STEP 0: Check Idempotency Key BEFORE opening the transaction ===
    const existing = await this.dataSource
      .getRepository(Transaction)
      .findOne({ where: { idempotency_key: dto.idempotency_key } });

    if (existing) {
      return existing; // Return cached result, skip processing
    }

    // === STEP 1: Initialize QueryRunner ===
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // === STEP 2: Fetch and lock sender account ===
      const fromAccount = await queryRunner.manager.findOne(Account, {
        where: { user_id: currentUserId },
        lock: { mode: 'pessimistic_write' }, // SELECT FOR UPDATE
      });

      if (!fromAccount) {
        throw new NotFoundException('Source account not found');
      }

      // === STEP 3: Fetch and lock receiver account — sorted by ID to prevent deadlocks ===
      const toAccount = await queryRunner.manager.findOne(Account, {
        where: { account_number: dto.to_account_number },
        lock: { mode: 'pessimistic_write' },
      });

      // === STEP 4: Perform Business Validation ===
      if (!toAccount) {
        throw new NotFoundException('Destination account does not exist');
      }
      if (fromAccount.id === toAccount.id) {
        throw new BadRequestException('Cannot transfer to the same account');
      }
      if (fromAccount.status !== 'active') {
        throw new UnprocessableEntityException('Source account is locked');
      }
      if (toAccount.status !== 'active') {
        throw new UnprocessableEntityException('Destination account is locked');
      }

      // Perform monetary calculations using Decimal
      const amount = new Decimal(dto.amount);
      const balance = new Decimal(fromAccount.balance);
      if (amount.gt(balance)) {
        throw new UnprocessableEntityException('Insufficient balance');
      }
      if (amount.lte(0)) {
        throw new BadRequestException('Transfer amount must be greater than 0');
      }
      if (amount.decimalPlaces() > 2) {
        throw new BadRequestException('Amount has a maximum of 2 decimal places');
      }

      // === STEP 5: Debit sender account using database-level SQL expression ===
      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance - ${amount.toFixed(2)}` })
        .where('id = :id', { id: fromAccount.id })
        .execute();

      // === STEP 6: Credit receiver account ===
      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance + ${amount.toFixed(2)}` })
        .where('id = :id', { id: toAccount.id })
        .execute();

      // === STEP 7: Save transaction audit log record ===
      const transaction = queryRunner.manager.create(Transaction, {
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount: dto.amount,
        description: dto.description,
        idempotency_key: dto.idempotency_key,
        status: 'success',
        type: 'transfer',
      });
      await queryRunner.manager.save(Transaction, transaction);

      // === STEP 8: Commit transaction ===
      await queryRunner.commitTransaction();
      return transaction;

    } catch (error) {
      // === ROLLBACK on error ===
      await queryRunner.rollbackTransaction();
      throw error; // Re-throw to propagate exception back to filter

    } finally {
      // === RELEASE connections ===
      await queryRunner.release();
    }
  }
}
```

## Standard Transfer DTO

```typescript
// dto/transfer.dto.ts
import { IsString, IsNotEmpty, IsUUID, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ example: 'VN17198234569999' })
  @IsString()
  @IsNotEmpty()
  to_account_number: string;

  @ApiProperty({ example: '500000.00', description: 'Decimal string, max 2 decimal places' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'Invalid transfer amount (maximum 2 decimal places)' })
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ required: false, example: 'Dinner share' })
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  @IsNotEmpty()
  idempotency_key: string;
}
```

## Skill Implementation Checklist

- [ ] Check the idempotency key in database repository BEFORE initializing QueryRunner.
- [ ] Implement query runner wrapper: `connect()` → `startTransaction()`.
- [ ] Lock both account rows via pessimistic write configurations (`lock: { mode: 'pessimistic_write' }`).
- [ ] Sort account locks by ID to avoid deadlocks.
- [ ] Update account values via SQL queries, not by re-saving model modifications in JS.
- [ ] Enforce try/catch block with rollback inside catch and query runner release inside finally.
- [ ] Use `Decimal.js` for precise balance checks, avoiding floating-point logic.
- [ ] Re-throw errors from transaction block to keep standard HTTP errors intact.
