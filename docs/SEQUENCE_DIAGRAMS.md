# Sequence Diagrams — Simple Banking App

> This document describes the step-by-step processing flows for the main business operations,
> showing interactions between: **Client**, **Controller**, **Service**, **Repository**, and **Database**.

---

## 1. Login Flow (Login + JWT)

```mermaid
sequenceDiagram
    actor Client
    participant AuthController
    participant AuthService
    participant UserRepository
    participant Database
    participant JwtService

    Client->>AuthController: POST /auth/login {email, password}
    AuthController->>AuthController: Validate DTO (class-validator)
    
    alt Validation fails
        AuthController-->>Client: 400 Bad Request {error details}
    end

    AuthController->>AuthService: login(loginDto)
    AuthService->>UserRepository: findOneByEmail(email)
    UserRepository->>Database: SELECT * FROM users WHERE email = $1
    Database-->>UserRepository: User record or null
    UserRepository-->>AuthService: user | null

    alt Email does not exist
        AuthService-->>AuthController: throw UnauthorizedException
        AuthController-->>Client: 401 Unauthorized
    end

    AuthService->>AuthService: bcrypt.compare(password, user.password_hash)
    
    alt Password incorrect
        AuthService-->>AuthController: throw UnauthorizedException
        AuthController-->>Client: 401 Unauthorized
    end

    alt Account locked
        AuthService->>AuthService: Check if user.status === 'locked'
        AuthService-->>AuthController: throw ForbiddenException
        AuthController-->>Client: 403 Forbidden
    end

    AuthService->>JwtService: sign({sub: user.id, role: user.role}, {expiresIn: '15m'})
    JwtService-->>AuthService: accessToken (JWT)

    AuthService->>AuthService: crypto.randomUUID() → refreshToken (opaque)
    AuthService->>AuthService: sha256(refreshToken) → tokenHash

    AuthService->>Database: INSERT INTO refresh_tokens (user_id, token_hash, expires_at=now+7d)
    Database-->>AuthService: OK

    AuthService-->>AuthController: {accessToken, refreshToken}
    AuthController-->>Client: 200 OK {access_token, refresh_token, expires_in: 900}
```

---

## 2. Refresh Token Rotation Flow

```mermaid
sequenceDiagram
    actor Client
    participant AuthController
    participant AuthService
    participant RefreshTokenRepository
    participant Database
    participant JwtService

    Client->>AuthController: POST /auth/refresh {refresh_token}
    AuthController->>AuthService: refreshTokens(refreshToken)

    AuthService->>AuthService: sha256(refreshToken) → tokenHash
    AuthService->>RefreshTokenRepository: findByHash(tokenHash)
    RefreshTokenRepository->>Database: SELECT * FROM refresh_tokens WHERE token_hash = $1
    Database-->>RefreshTokenRepository: RefreshToken record | null

    alt Token not found
        AuthService-->>AuthController: throw UnauthorizedException
        AuthController-->>Client: 401 Unauthorized
    end

    alt Token already revoked (is_revoked = true)
        Note over AuthService: ⚠️ REUSE DETECTION — Suspected Attack
        AuthService->>Database: UPDATE refresh_tokens SET is_revoked=true WHERE user_id = $1
        Note over Database: Revoke ALL tokens for this user
        AuthService-->>AuthController: throw UnauthorizedException("Abnormal session activity")
        AuthController-->>Client: 401 Unauthorized
    end

    alt Token expired (expires_at < NOW())
        AuthService-->>AuthController: throw UnauthorizedException
        AuthController-->>Client: 401 Unauthorized
    end

    Note over AuthService: Token valid — proceed with rotation

    AuthService->>Database: UPDATE refresh_tokens SET is_revoked=true WHERE id = $1
    Note over Database: Invalidate old token immediately

    AuthService->>JwtService: sign({sub: user.id, role}) → newAccessToken
    AuthService->>AuthService: crypto.randomUUID() → newRefreshToken
    AuthService->>AuthService: sha256(newRefreshToken) → newTokenHash
    AuthService->>Database: INSERT INTO refresh_tokens (user_id, token_hash=newHash, expires_at=now+7d)

    AuthService-->>AuthController: {newAccessToken, newRefreshToken}
    AuthController-->>Client: 200 OK {access_token, refresh_token, expires_in: 900}
```

---

## 3. Internal Transfer Flow (with Database Transaction)

```mermaid
sequenceDiagram
    actor Client
    participant TransactionController
    participant TransactionService
    participant AccountRepository
    participant Database

    Client->>TransactionController: POST /transactions/transfer<br/>{to_account_number, amount, description, idempotency_key}
    Note over TransactionController: Header: Authorization: Bearer <access_token>

    TransactionController->>TransactionController: JwtAuthGuard validates JWT
    TransactionController->>TransactionController: Validate DTO (amount > 0, uuid format, etc.)

    alt JWT invalid
        TransactionController-->>Client: 401 Unauthorized
    end
    alt Validation fails
        TransactionController-->>Client: 400 Bad Request
    end

    TransactionController->>TransactionService: transfer(dto, currentUser.accountId)

    Note over TransactionService: Check Idempotency Key
    TransactionService->>Database: SELECT * FROM transactions WHERE idempotency_key = $1
    
    alt Idempotency key already exists
        Database-->>TransactionService: Existing transaction
        TransactionService-->>TransactionController: Existing transaction (no duplicate process)
        TransactionController-->>Client: 200 OK {existing transaction}
    end

    Note over TransactionService: ══════ BEGIN TRANSACTION ══════
    TransactionService->>Database: BEGIN

    TransactionService->>Database: SELECT * FROM accounts WHERE id=$fromId FOR UPDATE
    TransactionService->>Database: SELECT * FROM accounts WHERE account_number=$toNum FOR UPDATE
    Note over Database: ⚠️ Row-level lock — concurrent requests<br/>accessing these rows will be BLOCKED

    Database-->>TransactionService: fromAccount (locked)
    Database-->>TransactionService: toAccount (locked)

    alt toAccount does not exist
        TransactionService->>Database: ROLLBACK
        TransactionService-->>TransactionController: throw NotFoundException
        TransactionController-->>Client: 404 Not Found
    end

    alt Transfer to self
        TransactionService->>Database: ROLLBACK
        TransactionService-->>TransactionController: throw BadRequestException
        TransactionController-->>Client: 400 Bad Request
    end

    alt fromAccount or toAccount locked
        TransactionService->>Database: ROLLBACK
        TransactionService-->>TransactionController: throw UnprocessableEntityException
        TransactionController-->>Client: 422 Unprocessable Entity
    end

    alt Insufficient balance (fromAccount.balance < amount)
        TransactionService->>Database: ROLLBACK
        TransactionService-->>TransactionController: throw UnprocessableEntityException("Insufficient balance")
        TransactionController-->>Client: 422 Unprocessable Entity
    end

    Note over TransactionService: All validation passed — proceed with transfer

    TransactionService->>Database: UPDATE accounts SET balance = balance - amount WHERE id=$fromId
    TransactionService->>Database: UPDATE accounts SET balance = balance + amount WHERE id=$toId
    TransactionService->>Database: INSERT INTO transactions (from_id, to_id, amount, idempotency_key, status='success')

    alt Any step fails (DB error, constraint violation, etc.)
        Database-->>TransactionService: Error
        TransactionService->>Database: ROLLBACK
        Note over Database: Balances unchanged<br/>No transaction record created
        TransactionService-->>TransactionController: throw InternalServerErrorException
        TransactionController-->>Client: 500 Internal Server Error
    end

    TransactionService->>Database: COMMIT
    Note over Database: ══════ END TRANSACTION ══════<br/>Balances updated<br/>Transaction record recorded

    Database-->>TransactionService: Transaction record
    TransactionService-->>TransactionController: transaction
    TransactionController-->>Client: 201 Created {transaction details}
```

---

## 4. Retrieve Transaction History Flow (Paginated)

```mermaid
sequenceDiagram
    actor Client
    participant TransactionController
    participant TransactionService
    participant Database

    Client->>TransactionController: GET /transactions?page=1&limit=10
    Note over TransactionController: Header: Authorization: Bearer <access_token>

    TransactionController->>TransactionController: JwtAuthGuard → currentUser
    TransactionController->>TransactionService: findAll(currentUser.accountId, queryDto)

    TransactionService->>Database: SELECT * FROM transactions<br/>WHERE from_account_id=$id OR to_account_id=$id<br/>ORDER BY created_at DESC<br/>LIMIT $limit OFFSET $offset
    
    TransactionService->>Database: SELECT COUNT(*) FROM transactions<br/>WHERE from_account_id=$id OR to_account_id=$id

    Database-->>TransactionService: [transactions], total count

    TransactionService->>TransactionService: Map direction: debit/credit<br/>Lookup counterpart account name

    TransactionService-->>TransactionController: {data, meta: {page, limit, total, total_pages}}
    TransactionController-->>Client: 200 OK {data, meta}
```

---

## 5. Admin Lock Account Flow

```mermaid
sequenceDiagram
    actor Admin
    participant AdminController
    participant AdminService
    participant Database

    Admin->>AdminController: PATCH /admin/users/:id/status {status: "locked", reason: "..."}
    
    AdminController->>AdminController: JwtAuthGuard → currentUser
    AdminController->>AdminController: RolesGuard: currentUser.role === 'admin'?

    alt Not admin
        AdminController-->>Admin: 403 Forbidden
    end

    AdminController->>AdminService: updateUserStatus(userId, dto)
    AdminService->>Database: SELECT * FROM users WHERE id = $1
    
    alt User not found
        AdminService-->>AdminController: throw NotFoundException
        AdminController-->>Admin: 404 Not Found
    end

    alt Admin tries to lock own account
        AdminService-->>AdminController: throw BadRequestException
        AdminController-->>Admin: 400 Bad Request
    end

    AdminService->>Database: UPDATE users SET status=$status, updated_at=NOW() WHERE id=$1
    AdminService->>Database: UPDATE accounts SET status=$status WHERE user_id=$1
    Note over Database: Locks both user account and bank account

    Database-->>AdminService: OK
    AdminService-->>AdminController: updated user
    AdminController-->>Admin: 200 OK {id, status, updated_at}
```
