# Security Specification — Simple Banking App

> This document details the critical security mechanisms of the system, focusing on:
> Database Transactions, Row Locking (Race Condition prevention), Anti Double-Submit (Idempotency),
> and Refresh Token Rotation.

---

## 1. Database Transaction — Atomicity in Transfer Flow

### Requirement

The entire transfer operation **MUST** execute within a single database transaction. If any step fails, the database must roll back to its original state.

### Steps in a Transaction

```
BEGIN TRANSACTION
  ├─ [1] Lock account rows (SELECT FOR UPDATE)
  ├─ [2] Validate business logic (balance, status, idempotency key)
  ├─ [3] Debit: UPDATE balance = balance - amount WHERE id = fromId
  ├─ [4] Credit: UPDATE balance = balance + amount WHERE id = toId
  └─ [5] Record: INSERT INTO transactions (...)
COMMIT
```

If any of the steps [1] through [5] throw an exception, a **ROLLBACK** is triggered.

### Implementation with TypeORM QueryRunner

```typescript
async transfer(dto: TransferDto, fromUserId: string): Promise<Transaction> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // [1] Lock both account rows — see Race Condition section below
    const [fromAccount, toAccount] = await Promise.all([
      queryRunner.manager.findOne(Account, {
        where: { id: fromAccountId },
        lock: { mode: 'pessimistic_write' },
      }),
      queryRunner.manager.findOne(Account, {
        where: { account_number: dto.to_account_number },
        lock: { mode: 'pessimistic_write' },
      }),
    ]);

    // [2] Validate
    if (!fromAccount || fromAccount.user_id !== fromUserId)
      throw new ForbiddenException();
    if (!toAccount)
      throw new NotFoundException('Destination account does not exist');
    if (fromAccount.id === toAccount.id)
      throw new BadRequestException('Cannot transfer to the same account');
    if (fromAccount.status !== AccountStatus.ACTIVE)
      throw new UnprocessableEntityException('Source account is locked');
    if (toAccount.status !== AccountStatus.ACTIVE)
      throw new UnprocessableEntityException('Destination account is locked');
    if (new Decimal(fromAccount.balance).lt(dto.amount))
      throw new UnprocessableEntityException('Insufficient balance');

    // [3] Debit
    await queryRunner.manager.update(Account, fromAccount.id, {
      balance: () => `balance - ${dto.amount}`,
    });

    // [4] Credit
    await queryRunner.manager.update(Account, toAccount.id, {
      balance: () => `balance + ${dto.amount}`,
    });

    // [5] Record
    const transaction = queryRunner.manager.create(Transaction, {
      from_account_id: fromAccount.id,
      to_account_id: toAccount.id,
      amount: dto.amount,
      description: dto.description,
      idempotency_key: dto.idempotency_key,
      status: TransactionStatus.SUCCESS,
    });
    await queryRunner.manager.save(transaction);

    await queryRunner.commitTransaction();
    return transaction;

  } catch (error) {
    await queryRunner.rollbackTransaction(); // Rollback all changes
    throw error;
  } finally {
    await queryRunner.release(); // Always release connection back to pool
  }
}
```

### State After Rollback

- Balance of `fromAccount`: **unchanged**
- Balance of `toAccount`: **unchanged**
- Bảng `transactions`: **no new record created**
- Zero risk of mismatched or partially updated balances.

---

## 2. Row Locking — Preventing Race Conditions

### The Problem

When two concurrent transactions attempt to debit/credit the same account simultaneously:
```
T1: Reads balance = 500,000
T2: Reads balance = 500,000
T1: Deducts 400,000 → updates balance to 100,000 ✅
T2: Deducts 400,000 → updates balance to 100,000 ✅ (INCORRECT! Balance should be negative or T2 rejected)
```

### The Solution: Pessimistic Locking (`SELECT FOR UPDATE`)

TypeORM's `lock: { mode: 'pessimistic_write' }` issues a `SELECT ... FOR UPDATE` statement in SQL.

**Mechanism:**
1. T1 acquires a row lock on Account row A.
2. T2 attempts to acquire a lock on Account row A → **blocked**, waiting for T1 to finish.
3. T1 commits the transaction → releases the lock.
4. T2 acquires the lock, reads the updated balance (100,000), and validates against it.

**Result:**
```
T1: Lock → Reads balance=500,000 → Deducts 400,000 → Commits → Balance=100,000
T2: Waits for lock → Reads balance=100,000 → Validates: 400,000 > 100,000 → REJECTED ✅
```

### Locking Order (Avoiding Deadlocks)

Always lock rows in ascending order of `account.id`:

```typescript
const [firstId, secondId] = [fromAccount.id, toAccount.id].sort();
// Lock in sorted order of IDs to prevent circular wait deadlock
```

### Timeout Configuration

Set a `lock_timeout` in the DB or query properties to prevent infinite hanging:

```typescript
lock: { mode: 'pessimistic_write', onLocked: 'nowait' }
// If lock is not immediately available → throws LockNotAvailableError → retry or return 503
```

---

## 3. Anti Double-Submit (Idempotency)

### The Problem

A user double-clicks "Submit" or network retries trigger duplicate API requests, resulting in multiple transfers.

### The Solution: Idempotency Key

1. **Client** generates a unique UUID v4 for each intent to transfer money (generated when opening the transfer form).
2. **Client** passes `idempotency_key` in the request body.
3. **Server** checks the key before executing the business logic:
   - If the key does not exist: Process the transfer, and save the key along with the transaction record.
   - If the key already exists: Skip processing, and return the previously completed transaction record.

```typescript
// Check idempotency before starting the transaction
const existingTx = await this.transactionRepo.findOne({
  where: { idempotency_key: dto.idempotency_key }
});
if (existingTx) {
  // Return the cached result (HTTP 200 or 409 depending on conventions)
  return existingTx;
}
```

### Idempotency Key Expiry

Keys are stored permanently in the `transactions` table. If the user intends to perform a second transaction with identical properties, the client must generate a new UUID v4.

### DB-Level Uniqueness

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency_key
  ON transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

Even if a race condition bypasses application-level checks, the database constraint blocks the duplicate request.

---

## 4. Refresh Token Rotation

### Completed Flow

```
[LOGIN]
Client → POST /auth/login {email, password}
Server:
  1. validateUser() → bcrypt.compare()
  2. Generate accessToken (JWT, exp: 15 minutes)
  3. Generate refreshToken (crypto.randomUUID() — opaque UUID)
  4. hash(refreshToken) → save to refresh_tokens {user_id, token_hash, expires_at: now+7d}
  5. Return {access_token, refresh_token}

[PROTECTED REQUEST]
Client → GET /accounts/me {Authorization: Bearer <accessToken>}
Server: JwtStrategy.validate() → decode JWT → attach user metadata to request

[ACCESS TOKEN EXPIRED]
Client → POST /auth/refresh {refresh_token: <refreshToken>}
Server:
  1. hash(refreshToken) → search in refresh_tokens table
  2. Validate: is_revoked=false AND expires_at > NOW()
  3. Mark old token record: is_revoked = true
  4. Generate new accessToken + new raw refreshToken
  5. Save new refreshToken hash to DB
  6. Return {access_token, refresh_token}

[REUSE DETECTION — SECURITY BREACH FLOW]
If in step 2, the server finds is_revoked = true:
  → ATTACKER is attempting to reuse an invalidated refresh token.
  → Immediately revoke ALL refresh tokens for the compromised user (force logout all devices).
  → Return HTTP 401 with message: "Session expired, please login again"

[LOGOUT]
Client → POST /auth/logout {refresh_token}
Server:
  1. hash(refreshToken) → search in DB
  2. Mark is_revoked = true
  3. Return 200 OK
```

### Token Storage Strategy

| Storage | Pros | Cons |
|---|---|---|
| HttpOnly Cookie | Safe from XSS, browser handles transmission | Requires precise CORS/SameSite setup |
| localStorage | Easy to implement | Vulnerable to XSS |
| **In-Memory (Zustand)** | Safest for Access Tokens | Cleared on page refresh (needs refresh token to restore) |

**Recommendation**: Use **HttpOnly Cookies** for the Refresh Token to mitigate XSS risks. Access tokens are stored in Zustand (in-memory).

---

## 5. Security Checklist

### Authentication & Authorization
- [x] Password hashing using bcrypt (cost factor ≥ 10).
- [x] Plaintext passwords are never stored.
- [x] Sensitive fields like `password_hash` excluded from API responses (`@Exclude()`).
- [x] JWT access token TTL configured to 15 minutes.
- [x] Refresh Token Rotation implemented (each refresh token used only once).
- [x] Token reuse detection triggers immediate revocation of all sessions.
- [x] Users restricted to their own resources (retrieve `user_id` from JWT, not from request parameters).
- [x] Admin routes protected with `RolesGuard` + `@Roles('admin')`.

### Input Validation
- [x] All DTOs validated using `class-validator` decorators.
- [x] `amount`: Positive decimal string, > 0, maximum 2 decimal places.
- [x] Transfer destination cannot be equal to the source (`from !== to`).
- [x] Validate destination account existence and `active` status before execution.
- [x] Reject invalid inputs (non-numeric, excessively large amounts, weird strings).
- [x] `idempotency_key`: Required for transfer, must be valid UUID v4.

### Database Security
- [x] TypeORM parameterized queries utilized (no string concatenation in SQL queries).
- [x] `CHECK constraint` balance >= 0 enforced on the database level.
- [x] `CHECK constraint` amount > 0 enforced on the database level.
- [x] `CHECK constraint` from_account_id <> to_account_id enforced on the database level.
- [x] Refresh tokens stored hashed (SHA-256), never in plaintext.

### Infrastructure & Operations Security
- [x] CORS restricted to authorized frontend origin (`FRONTEND_URL` environment variable).
- [x] All credentials/secrets defined in `.env`, kept out of Git repository via `.gitignore`.
- [x] Sensitive variables (passwords, tokens) excluded from log outputs.
- [x] Rate limiting configured on `/auth/login` and `/auth/refresh` endpoints (Throttler).

### Application-Level Control
- [x] SQL injection protection (parameterized queries).
- [x] XSS protection (Ant Design escapes values by default, sanitization on input).
- [x] Database transactions utilized for money transfers (atomicity guaranteed).
- [x] Pessimistic locking to avoid race conditions.
- [x] Idempotency keys to prevent double-submit.
