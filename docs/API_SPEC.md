# API Specification — Simple Banking App

## Overview

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token (JWT Access Token) in the `Authorization: Bearer <token>` header
- **API Version**: v1 (no version prefix in MVP)

---

## Standard Error Response

All errors are returned in a unified format:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "User-friendly error description",
  "details": [
    {
      "field": "amount",
      "message": "The amount must be greater than 0"
    }
  ]
}
```

| Field | Description |
|---|---|
| `statusCode` | HTTP status code |
| `error` | Standard error code (see reference table below) |
| `message` | User-friendly message |
| `details` | (Optional) Field-level validation details |

### Standard Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `BAD_REQUEST` | 400 | Invalid input / Validation failure |
| `UNAUTHORIZED` | 401 | Unauthenticated or expired token |
| `FORBIDDEN` | 403 | Unauthorized access / Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., email, idempotency key) |
| `UNPROCESSABLE_ENTITY` | 422 | Business logic violation (e.g., insufficient balance) |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Authentication & Token Flow

### Token Types

| Token | TTL | Storage (Client) | Notes |
|---|---|---|---|
| Access Token (JWT) | 15 minutes | In-Memory (Zustand store) | Never store in localStorage |
| Refresh Token (Opaque) | 7 days | HttpOnly Cookie or localStorage with secure flag | Stored as SHA-256 hash in DB |

### Refresh Token Rotation Flow

```
1. POST /auth/login → Receive accessToken + refreshToken
2. When accessToken expires → POST /auth/refresh with refreshToken
3. Server validates, revokes the used token, and issues a new pair
4. If the refreshToken was already revoked → Reuse detected → Revoke all sessions → Return 401
```

---

## Endpoints

### 🔓 Auth (Public — No JWT required)

#### `POST /auth/register`

Register a new user account. Automatically creates a bank account for the user.

**Request Body:**
```json
{
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "password": "Password@123"
}
```

**Validation:**
- `fullName`: Required, 2–100 characters
- `email`: Required, valid email format, unique
- `password`: Required, minimum 6 characters, must contain uppercase, lowercase, numbers, and special characters

**Response `201 Created`:**
```json
{
  "id": "uuid",
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "role": "customer",
  "status": "active",
  "createdAt": "2026-06-29T03:00:00Z"
}
```

**Errors:** `400` (Validation failed), `409` (Email already exists)

---

#### `POST /auth/login`

Authenticate user and issue token pair.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "opaque-refresh-token-string",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

**Errors:** `400` (Validation failed), `401` (Invalid email/password), `403` (Account locked)

---

#### `POST /auth/refresh`

Exchange an active refresh token for a new token pair (Refresh Token Rotation).

**Request Body:**
```json
{
  "refreshToken": "opaque-refresh-token-string"
}
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "new-opaque-refresh-token",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

**Errors:** `401` (Invalid/expired token, already revoked, or reuse detected)

---

#### `POST /auth/logout`

Revoke the current refresh token.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "refreshToken": "opaque-refresh-token-string"
}
```

**Response `200 OK`:**
```json
{ "message": "Logged out successfully" }
```

---

### 🔒 Accounts (JWT required)

#### `GET /accounts/me`

Retrieve bank account information and balance of the currently authenticated user.

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "accountNumber": "VN17198234561234",
  "balance": "1500000.00",
  "currency": "VND",
  "status": "active",
  "createdAt": "2026-06-29T03:00:00Z",
  "owner": {
    "id": "uuid",
    "fullName": "Nguyen Van A",
    "email": "user@example.com"
  }
}
```

> **Note:** The `balance` is returned as a string to prevent precision loss in client-side JSON parsing.

**Errors:** `401` (Unauthorized), `404` (No account found for user — anomaly case)

---

### 🔒 Transactions (JWT required)

#### `POST /transactions/transfer`

Perform an internal transfer. Processed within a single database transaction.

**Request Body:**
```json
{
  "to_accountNumber": "VN17198234569999",
  "amount": "500000.00",
  "description": "Coffee share",
  "idempotencyKey": "uuid-v4-generated-by-client"
}
```

**Validation:**
- `to_accountNumber`: Required, must exist, cannot be the sender's account, status must be active
- `amount`: Required, positive decimal string, > 0, max 2 decimal places, must be ≤ available balance
- `description`: Optional, max 255 characters
- `idempotencyKey`: Required, valid UUID v4

**Response `201 Created`:**
```json
{
  "id": "uuid",
  "from_accountNumber": "VN17198234561234",
  "to_accountNumber": "VN17198234569999",
  "amount": "500000.00",
  "description": "Coffee share",
  "status": "success",
  "createdAt": "2026-06-29T03:05:00Z"
}
```

**Errors:**
- `400`: Validation failed
- `401`: Unauthorized
- `403`: Accessing an account not owned by user
- `404`: Destination account does not exist
- `409`: Duplicate idempotency key (request already processed)
- `422`: Insufficient balance / sender account locked / receiver account locked

---

#### `GET /transactions`

Retrieve transaction history of the current user account (paginated).

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Current page |
| `limit` | number | 10 | Records per page (max 50) |
| `type` | string | all | Filter by: `transfer` / `deposit` / `withdraw` |
| `fromDate` | ISO date | - | Filter transactions from date |
| `toDate` | ISO date | - | Filter transactions to date |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "transfer",
      "direction": "debit",
      "amount": "500000.00",
      "counterpartAccount": "VN17198234569999",
      "counterpartName": "Tran Thi B",
      "description": "Coffee share",
      "status": "success",
      "createdAt": "2026-06-29T03:05:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

> **Note:** `direction` is evaluated as `debit` (money out) or `credit` (money in) relative to the user's account.

---

### 🔒👑 Admin (JWT required + role = admin)

#### `GET /admin/users`

List all users in the system.

**Query Parameters:** `page`, `limit`, `status` (active/locked), `search` (email/name)

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "Nguyen Van A",
      "email": "user@example.com",
      "role": "customer",
      "status": "active",
      "accountNumber": "VN17198234561234",
      "balance": "1500000.00",
      "createdAt": "2026-06-29T03:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 }
}
```

---

#### `GET /admin/users/:id`

Retrieve details of a specific user.

**Response `200 OK`:** (same format as the user list item above)

**Errors:** `403` (Forbidden — not admin), `404` (User not found)

---

#### `PATCH /admin/users/:id/status`

Lock or unlock a user account.

**Request Body:**
```json
{
  "status": "locked",
  "reason": "Violation of terms"
}
```

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "status": "locked",
  "updatedAt": "2026-06-29T03:10:00Z"
}
```

**Errors:** `400` (Cannot lock yourself), `403`, `404`

---

#### `GET /admin/transactions`

Retrieve all system transactions.

**Query Parameters:** `page`, `limit`, `fromDate`, `toDate`, `status`, `accountNumber`

**Response:** Same format as `GET /transactions` but unfiltered by user.
