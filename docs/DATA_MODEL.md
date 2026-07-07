# Data Model — Simple Banking App

## Overview

Database: **PostgreSQL**
ORM: **TypeORM** (TypeScript)
All currency fields must use the `numeric(18,2)` data type — **NEVER** use `float`, `double`, or plain JS `number` to represent money.

---

## Entity Relationship Diagram (ERD)

```text
users
  │
  ├──< accounts (1 user can have multiple accounts)
  │         │
  │         ├──<? transactions (from_account_id — NULL for deposit)
  │         └──<? transactions (to_account_id  — NULL for withdraw)
  │
  ├──< customer_audit_logs (actions performed by customer)
  │
  └──< refresh_tokens (1 user can have multiple refresh token sessions)

admins (via users table role)
  │
  └──< admin_audit_logs (actions performed by admin)

transactions
  │
  └──< fee_ledger (fees collected or refunded)
```

*(Note: System settings and fee settlement logs are standalone system tables).*

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

---

## Table: `accounts`

| Field            | Type                       | Constraint              | Description                                    |
|------------------|----------------------------|-------------------------|------------------------------------------------|
| `id`             | `uuid`                     | PRIMARY KEY             |                                                |
| `user_id`        | `uuid`                     | FK → users.id, NOT NULL | Account owner. ON DELETE RESTRICT              |
| `account_number` | `varchar(20)`              | NOT NULL, UNIQUE        | Auto-generated (see strategy below)            |
| `name`           | `varchar(100)`             | NOT NULL                | Account display name (e.g., Savings Account)   |
| `balance`        | `numeric(18,2)`            | NOT NULL, DEFAULT 0.00  | **Never use float**                            |
| `currency`       | `varchar(3)`               | NOT NULL, DEFAULT 'VND' | ISO 4217 currency code                         |
| `status`         | `enum('active','locked')`  | NOT NULL, DEFAULT 'active' | Locked accounts cannot perform transactions |
| `created_at`     | `timestamp with time zone` | NOT NULL, DEFAULT NOW() |                                                |
| `updated_at`     | `timestamp with time zone` | NOT NULL, DEFAULT NOW() |                                                |

**Indexes:**
- `UNIQUE INDEX` on `account_number`
- `INDEX` on `user_id`

---

## Table: `transactions`

| Field              | Type                                   | Constraint              | Description                                          |
|--------------------|----------------------------------------|-------------------------|------------------------------------------------------|
| `id`               | `uuid`                                 | PRIMARY KEY             |                                                      |
| `from_account_id`  | `uuid`                                 | FK → accounts.id, **NULLABLE** | Source account. NULL when `type = 'deposit'`  |
| `to_account_id`    | `uuid`                                 | FK → accounts.id, **NULLABLE** | Destination account. NULL when `type = 'withdraw'` |
| `amount`           | `numeric(18,2)`                        | NOT NULL                | Transfer amount (principal)                          |
| `fee`              | `numeric(18,2)`                        | NOT NULL, DEFAULT 0.00  | Transaction fee applied                              |
| `total_amount`     | `numeric(18,2)`                        | NOT NULL, DEFAULT 0.00  | amount + fee (if sender pays fee)                    |
| `type`             | `enum('transfer','deposit','withdraw')` | NOT NULL, DEFAULT 'transfer' | Transaction type                                |
| `status`           | `enum('success','failed','pending')`   | NOT NULL, DEFAULT 'pending' | Transaction status                               |
| `description`      | `varchar(255)`                         | NULLABLE                | Transaction message input by user                    |
| `idempotency_key`  | `varchar(64)`                          | UNIQUE, NULLABLE        | UUID v4 generated by client to prevent double-submit |
| `created_at`       | `timestamp with time zone`             | NOT NULL, DEFAULT NOW() |                                                      |

**Indexes:**
- `INDEX` on `from_account_id`
- `INDEX` on `to_account_id`
- `UNIQUE INDEX` on `idempotency_key`
- `INDEX` on `created_at DESC`

---

## Table: `fee_ledger`

| Field              | Type                                   | Constraint              | Description                                          |
|--------------------|----------------------------------------|-------------------------|------------------------------------------------------|
| `id`               | `uuid`                                 | PRIMARY KEY             |                                                      |
| `transaction_id`   | `uuid`                                 | FK → transactions.id, NULLABLE | Transaction that incurred the fee             |
| `amount`           | `numeric(18,2)`                        | NOT NULL                | Fee amount                                           |
| `type`             | `enum('credit','debit')`               | NOT NULL, DEFAULT 'credit' | credit (collected) or debit (settled)          |
| `description`      | `varchar(255)`                         | NULLABLE                | Additional details                                   |
| `created_at`       | `timestamp with time zone`             | NOT NULL, DEFAULT NOW() |                                                      |

**Indexes:**
- `INDEX` on `transaction_id`
- `INDEX` on `created_at`

---

## Table: `fee_settlement_logs`

| Field              | Type                                   | Constraint              | Description                                          |
|--------------------|----------------------------------------|-------------------------|------------------------------------------------------|
| `id`               | `uuid`                                 | PRIMARY KEY             |                                                      |
| `amount`           | `numeric(18,2)`                        | NOT NULL, DEFAULT 0.00  | Amount settled in this job execution                 |
| `created_at`       | `timestamp with time zone`             | NOT NULL, DEFAULT NOW() | Execution time                                       |

**Indexes:**
- `INDEX` on `created_at`

---

## Table: `system_settings`

| Field            | Type                       | Constraint              | Description                                    |
|------------------|----------------------------|-------------------------|------------------------------------------------|
| `setting_key`    | `varchar(100)`             | PRIMARY KEY             | Key identifier (e.g., `transfer_fee`)          |
| `setting_value`  | `text`                     | NOT NULL                | String representation of value                 |
| `data_type`      | `varchar(20)`              | NOT NULL                | Data type (e.g., 'int', 'decimal', 'boolean')  |
| `display_name`   | `varchar(150)`             | NOT NULL                | UI friendly name                               |
| `description`    | `text`                     | NULLABLE                | Detail description                             |
| `group_name`     | `varchar(50)`              | NOT NULL                | Group for UI categorization                    |
| `updated_by`     | `varchar(100)`             | NULLABLE                | Admin who last updated                         |
| `updated_at`     | `timestamp with time zone` | NOT NULL, DEFAULT NOW() |                                                |

---

## Table: `customer_audit_logs`

| Field              | Type                       | Constraint                 | Description                                          |
|--------------------|----------------------------|----------------------------|------------------------------------------------------|
| `id`               | `uuid`                     | PRIMARY KEY                |                                                      |
| `customer_id`      | `uuid`                     | FK → users.id, NULLABLE    | User performing the action                           |
| `customer_name`    | `varchar(255)`             | NULLABLE                   | Denormalized name                                    |
| `customer_email`   | `varchar(255)`             | NULLABLE                   | Denormalized email                                   |
| `action`           | `enum(...)`                | NOT NULL                   | Action performed (e.g., LOGIN, TRANSFER)             |
| `status`           | `enum('SUCCESS','FAILED')` | NOT NULL, DEFAULT 'SUCCESS'| Result of action                                     |
| `transaction_id`   | `uuid`                     | FK → transactions, NULLABLE| Associated transaction                               |
| `metadata`         | `jsonb`                    | NULLABLE                   | Additional context (e.g., device, amounts)           |
| `ip_address`       | `varchar(45)`              | NULLABLE                   | User IP address                                      |
| `created_at`       | `timestamp with time zone` | NOT NULL, DEFAULT NOW()    |                                                      |

---

## Table: `admin_audit_logs`

| Field              | Type                       | Constraint                 | Description                                          |
|--------------------|----------------------------|----------------------------|------------------------------------------------------|
| `id`               | `uuid`                     | PRIMARY KEY                |                                                      |
| `admin_id`         | `uuid`                     | FK → users.id, NULLABLE    | Admin performing the action                          |
| `admin_name`       | `varchar(255)`             | NULLABLE                   | Denormalized name                                    |
| `admin_email`      | `varchar(255)`             | NULLABLE                   | Denormalized email                                   |
| `action`           | `enum(...)`                | NOT NULL                   | Action performed (e.g., LOCK_ACCOUNT)                |
| `status`           | `enum('SUCCESS','FAILED')` | NOT NULL, DEFAULT 'SUCCESS'| Result of action                                     |
| `metadata`         | `jsonb`                    | NULLABLE                   | Additional context (e.g., target user id)            |
| `ip_address`       | `varchar(45)`              | NULLABLE                   | Admin IP address                                     |
| `created_at`       | `timestamp with time zone` | NOT NULL, DEFAULT NOW()    |                                                      |

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
