# Data Model — Simple Banking App

## Overview

Database: **PostgreSQL**
ORM: **TypeORM** (TypeScript)
All currency fields must use the `numeric(18,2)` data type — **NEVER** use `float`, `double`, or plain JS `number` to represent money.

---

## Entity Relationship Diagram (ERD)

```
users
  │
  ├──< accounts (1 user can have multiple accounts)
  │         │
  │         ├──<? transactions (from_account_id — NULL for deposit)
  │         └──<? transactions (to_account_id  — NULL for withdraw)
  │
  └──< refresh_tokens (1 user can have multiple refresh token sessions)
```

---

## Table: `users`

| Field           | Type                        | Constraint              | Description                          |
|-----------------|-----------------------------|-------------------------|--------------------------------------|
| `id`            | `uuid`                      | PRIMARY KEY, DEFAULT gen_random_uuid() | Primary key               |
| `full_name`     | `varchar(100)`              | NOT NULL                | Full name                            |
| `email`         | `varchar(255)`              | NOT NULL, UNIQUE        | Used for login                       |
| `password_hash` | `varchar(255)`              | NOT NULL                | bcrypt hash, cost factor ≥ 10        |
| `role`          | `enum('customer','admin')`  | NOT NULL, DEFAULT 'customer' | Authorization role             |
| `status`        | `enum('active','locked')`   | NOT NULL, DEFAULT 'active' | Admin can lock/unlock accounts     |
| `created_at`    | `timestamp with time zone`  | NOT NULL, DEFAULT NOW() |                                      |
| `updated_at`    | `timestamp with time zone`  | NOT NULL, DEFAULT NOW() | Auto-update on modification          |

**Indexes:**
- `UNIQUE INDEX` on `email`

**TypeORM Entity Notes:**
- Use `@Exclude()` from `class-transformer` on the `password_hash` field to ensure it is never exposed in API responses.
- `role` and `status` should be mapped using TypeScript enums.

---

## Table: `accounts`

| Field            | Type                       | Constraint              | Description                                    |
|------------------|----------------------------|-------------------------|------------------------------------------------|
| `id`             | `uuid`                     | PRIMARY KEY             |                                                |
| `user_id`        | `uuid`                     | FK → users.id, NOT NULL | Account owner. ON DELETE RESTRICT              |
| `account_number` | `varchar(20)`              | NOT NULL, UNIQUE        | Auto-generated (see strategy below)            |
| `balance`        | `numeric(18,2)`            | NOT NULL, DEFAULT 0.00  | **Never use float**                            |
| `currency`       | `varchar(3)`               | NOT NULL, DEFAULT 'VND' | ISO 4217 currency code                         |
| `status`         | `enum('active','locked')`  | NOT NULL, DEFAULT 'active' | Locked accounts cannot perform transactions |
| `created_at`     | `timestamp with time zone` | NOT NULL, DEFAULT NOW() |                                                |
| `updated_at`     | `timestamp with time zone` | NOT NULL, DEFAULT NOW() |                                                |

**Indexes:**
- `UNIQUE INDEX` on `account_number`
- `INDEX` on `user_id` (for fast lookup of user accounts)

**DB-Level Constraint:**
```sql
ALTER TABLE accounts ADD CONSTRAINT chk_balance_non_negative CHECK (balance >= 0);
```

### Account Number Generation Strategy

Format: `VN` + timestamp in milliseconds (10 digits) + random 4 digits = 16 characters.
Example: `VN17198234561234`

Implemented in the service layer with a uniqueness check before saving. In the highly unlikely event of a collision, a new number will be generated.

---

## Table: `transactions`

| Field              | Type                                   | Constraint              | Description                                          |
|--------------------|----------------------------------------|-------------------------|------------------------------------------------------|
| `id`               | `uuid`                                 | PRIMARY KEY             |                                                      |
| `from_account_id`  | `uuid`                                 | FK → accounts.id, **NULLABLE** | Source account. NULL when `type = 'deposit'`  |
| `to_account_id`    | `uuid`                                 | FK → accounts.id, **NULLABLE** | Destination account. NULL when `type = 'withdraw'` |
| `amount`           | `numeric(18,2)`                        | NOT NULL                | Transfer amount, must be > 0                         |
| `type`             | `enum('transfer','deposit','withdraw')` | NOT NULL, DEFAULT 'transfer' | Transaction type                                |
| `status`           | `enum('success','failed','pending')`   | NOT NULL, DEFAULT 'pending' | Transaction status                               |
| `description`      | `varchar(255)`                         | NULLABLE                | Transaction message input by user                    |
| `idempotency_key`  | `varchar(64)`                          | UNIQUE, NULLABLE        | UUID v4 generated by client to prevent double-submit |
| `created_at`       | `timestamp with time zone`             | NOT NULL, DEFAULT NOW() |                                                      |

**Nullable FK Rules by Transaction Type:**

| `type`     | `from_account_id` | `to_account_id` |
|------------|-------------------|-----------------|
| `transfer` | NOT NULL          | NOT NULL        |
| `deposit`  | NULL              | NOT NULL        |
| `withdraw` | NOT NULL          | NULL            |

**Indexes:**
- `INDEX` on `from_account_id` (lookup outgoing transactions)
- `INDEX` on `to_account_id` (lookup incoming transactions)
- `UNIQUE INDEX` on `idempotency_key` (prevent duplicate processing)
- `INDEX` on `created_at DESC` (sorting by time)

**DB-Level Constraints:**
```sql
ALTER TABLE transactions ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);

-- Self-transfer is only relevant when both sides are present (transfer type)
ALTER TABLE transactions ADD CONSTRAINT chk_no_self_transfer
  CHECK (from_account_id IS NULL OR to_account_id IS NULL OR from_account_id <> to_account_id);

-- Enforce account ID presence based on transaction type
ALTER TABLE transactions ADD CONSTRAINT chk_account_ids_by_type CHECK (
  (type = 'transfer' AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL) OR
  (type = 'deposit'  AND from_account_id IS NULL     AND to_account_id IS NOT NULL) OR
  (type = 'withdraw' AND from_account_id IS NOT NULL AND to_account_id IS NULL)
);
```

---

## Table: `refresh_tokens`

| Field        | Type                       | Constraint              | Description                                          |
|--------------|----------------------------|-------------------------|------------------------------------------------------|
| `id`         | `uuid`                     | PRIMARY KEY             |                                                      |
| `user_id`    | `uuid`                     | FK → users.id, NOT NULL | Token owner                                          |
| `token_hash` | `varchar(255)`             | NOT NULL, UNIQUE        | SHA-256 hash of raw refresh token, never plaintext   |
| `is_revoked` | `boolean`                  | NOT NULL, DEFAULT false | Revoked upon use or when reuse is detected           |
| `expires_at` | `timestamp with time zone` | NOT NULL                | TTL: 7 days from creation                            |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT NOW() |                                                      |

**Indexes:**
- `INDEX` on `user_id`
- `UNIQUE INDEX` on `token_hash`

**Refresh Token Rotation Logic:**
1. Upon login: Generate a pair of tokens (accessToken, refreshToken), hash the refreshToken and store it in this table.
2. Upon refresh request: Locate the record by token hash, check if `is_revoked = false` and `expires_at > NOW()`.
3. If valid: Mark the current record as `is_revoked = true`, generate a new pair, and store the new hashed refresh token.
4. If token is already revoked (reuse detection): **Immediately revoke all active refresh tokens for that user** (force logout).

---

## TypeORM Entities Design (Summary)

```typescript
// Relationship examples
@Entity('users')
export class User {
  @OneToMany(() => Account, account => account.user)
  accounts: Account[];

  @OneToMany(() => RefreshToken, token => token.user)
  refreshTokens: RefreshToken[];
}

@Entity('accounts')
export class Account {
  @ManyToOne(() => User, user => user.accounts)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Transaction, tx => tx.fromAccount)
  outgoingTransactions: Transaction[];

  @OneToMany(() => Transaction, tx => tx.toAccount)
  incomingTransactions: Transaction[];
}

@Entity('transactions')
export class Transaction {
  // NULL when type = 'deposit' (money comes from an external source, not an internal account)
  @ManyToOne(() => Account, account => account.outgoingTransactions, { nullable: true })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: Account | null;

  // NULL when type = 'withdraw' (money leaves to an external destination, not an internal account)
  @ManyToOne(() => Account, account => account.incomingTransactions, { nullable: true })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: Account | null;
}
```

---

## Design Rationale

| Decision | Rationale |
|---|---|
| `numeric(18,2)` for balance/amount | Prevents floating-point precision errors during calculation. `18,2` supports up to 9,999,999,999,999,999.99 VND. |
| `uuid` for primary keys | Prevents enumeration attacks, simplifies database merges, and avoids leaking table sizes. |
| `idempotency_key` in transactions | Prevents double-submit issues caused by rapid double-clicks or network retries. |
| Dedicated `refresh_tokens` table | Enables secure Refresh Token Rotation and granular session revocation. |
| DB-level `CHECK constraints` | Serves as the final safety net protecting the data model in case of application bugs. |
| Account `status` flag | Allows administrators to lock or suspend accounts without deleting audit history. |
| Nullable `from_account_id` / `to_account_id` | Supports `deposit` (external money in, no sender account) and `withdraw` (external money out, no receiver account) without needing separate tables. A `chk_account_ids_by_type` DB constraint enforces the correct NULL pattern per transaction type. |
