# Architecture — Simple Banking App

## System Overview

Simple Banking App is an internal banking application with two user roles: **Customer** and **Admin**.
It follows a **Client-Server** model, communicating via a REST API with JWT authentication.

---

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Docker Network: banking-net                   │
│                                                                      │
│  ┌─────────────────┐     HTTP/HTTPS      ┌─────────────────────────┐ │
│  │   React App     │ ◄─────────────────► │   NestJS API Server     │ │
│  │  (Ant Design)   │   REST + JWT        │   (Port 3000)           │ │
│  │  (Port 5173)    │                     │                         │ │
│  │                 │                     │  ┌───────────────────┐  │ │
│  │  Zustand        │                     │  │   AuthModule      │  │ │
│  │  React Query    │                     │  │   UserModule      │  │ │
│  │  Axios          │                     │  │   AccountModule   │  │ │
│  └─────────────────┘                     │  │   TransactionMod  │  │ │
│                                          │  │   AdminModule     │  │ │
│                                          │  └───────┬───────────┘  │ │
│                                          │          │ TypeORM      │ │
│                                          └──────────┼─────────────┘  │
│                                                     │                 │
│                                          ┌──────────▼──────────────┐ │
│                                          │   PostgreSQL Database   │ │
│                                          │   (Port 5432)           │ │
│                                          │                         │ │
│                                          │  users                  │ │
│                                          │  accounts               │ │
│                                          │  transactions           │ │
│                                          │  refresh_tokens         │ │
│                                          └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
SimpleBankingApp/
├── backend/                        # NestJS application
│   ├── src/
│   │   ├── auth/                   # AuthModule
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── guards/
│   │   │   ├── strategies/
│   │   │   ├── auth.constants.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.utils.ts
│   │   │   └── auth.module.ts
│   │   ├── users/                  # UserModule
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   ├── accounts/               # AccountModule
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── accounts.controller.ts
│   │   │   ├── accounts.service.ts
│   │   │   └── accounts.module.ts
│   │   ├── transactions/           # TransactionModule
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── transactions.controller.ts
│   │   │   ├── transactions.service.ts
│   │   │   └── transactions.module.ts
│   │   ├── admin/                  # AdminModule
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── admin.module.ts
│   │   ├── common/                 # Shared utilities
│   │   │   ├── decorators/         # @CurrentUser, @Roles
│   │   │   ├── filters/            # GlobalExceptionFilter
│   │   │   ├── guards/             # RolesGuard
│   │   │   ├── interceptors/       # TransformInterceptor, LoggingInterceptor
│   │   │   └── pipes/              # ValidationPipe config
│   │   ├── config/                 # Configuration
│   │   │   ├── database.config.ts
│   │   │   └── jwt.config.ts
│   │   ├── database/               # DB management
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   └── main.ts
│   ├── test/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                       # React application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TransferPage.tsx
│   │   │   ├── TransactionsPage.tsx
│   │   │   └── admin/
│   │   │       ├── AdminSettingsPage.tsx
│   │   │       ├── AdminTransactionsPage.tsx
│   │   │       └── AdminUsersPage.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   └── AdminLayout.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── AdminRoute.tsx
│   │   │   └── shared/
│   │   ├── services/               # Axios API layer
│   │   │   ├── api.ts              # Axios instance + interceptors
│   │   │   ├── auth.service.ts
│   │   │   ├── account.service.ts
│   │   │   └── transaction.service.ts
│   │   ├── store/                  # Zustand stores
│   │   │   ├── auth.store.ts
│   │   │   └── ui.store.ts
│   │   ├── hooks/                  # React Query hooks
│   │   │   ├── admin/
│   │   │   │   ├── useAdminSettings.ts
│   │   │   │   ├── useAdminTransactions.ts
│   │   │   │   └── useAdminUsers.ts
│   │   │   ├── useAccount.ts
│   │   │   └── useTransactions.ts
│   │   ├── types/                  # TypeScript types/interfaces
│   │   └── utils/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                           # Documentation
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## NestJS Module Architecture

### Layered Architecture

```
HTTP Request
    │
    ▼
┌─────────────┐
│  Controller │  Handle HTTP: parse request, call service, return response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  Business logic: validation, orchestration
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Repository │  Data access: TypeORM Entity operations
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │  PostgreSQL
└─────────────┘
```

**Conventions:**
- Controller: NO business logic. Only `@Body()`, `@Param()`, calling service, and returning response.
- Service: NO raw DB queries. Use repository or EntityManager.
- Repository: CRUD + queries only. NO business logic.

### Module Dependencies

```
AppModule
├── ConfigModule (global)
├── TypeOrmModule (global)
├── AuthModule
│   └── uses: UserModule (UserService)
├── UserModule
│   └── provides: UserService (used by Auth)
├── AccountModule
│   └── uses: UserModule
├── TransactionModule
│   └── uses: AccountModule
└── AdminModule
    └── uses: UserModule, AccountModule, TransactionModule
```

---

## Authentication & Authorization Architecture

### JWT Strategy

```
Login Flow:
  User → POST /auth/login
       → AuthService.validateUser() → bcrypt.compare()
       → Generate accessToken (JWT, 15m) + refreshToken (opaque UUID, 7d)
       → Hash refreshToken → save to DB
       → Return both tokens

Protected Route Flow:
  Request → JwtAuthGuard → JwtStrategy.validate() → decode JWT → attach user to request
          → RolesGuard (if @Roles decorator present) → check role
          → Controller

Refresh Flow:
  → POST /auth/refresh with refreshToken
  → Query token hash in DB → check if is_revoked, expires_at
  → Mark old token as is_revoked = true → generate new pair → store new refreshToken
```

### Guards

| Guard | Purpose |
|---|---|
| `JwtAuthGuard` | Validates access token, attaches user entity to request object |
| `RolesGuard` | Checks the role in `user.role` against values specified in the `@Roles()` decorator |
| `RefreshTokenGuard` | Validates the refresh token for `/auth/refresh` |

### Custom Decorators

| Decorator | Purpose |
|---|---|
| `@CurrentUser()` | Extracts the user object from the request (attached by JwtAuthGuard) |
| `@Roles('admin')` | Decorates routes to permit only specified roles |
| `@Public()` | Bypasses JwtAuthGuard (used for register, login) |

---

## Database Transaction Architecture

### Internal Transfer Flow (Single DB Transaction)

```
TransactionService.transfer()
  │
  ├─ BEGIN TRANSACTION
  │
  ├─ SELECT * FROM accounts WHERE id = fromId FOR UPDATE  (Pessimistic Lock)
  ├─ SELECT * FROM accounts WHERE id = toId   FOR UPDATE  (Pessimistic Lock)
  │
  ├─ Validate: balance sufficiency, status is active, no self-transfer
  │
  ├─ UPDATE accounts SET balance = balance - amount WHERE id = fromId
  ├─ UPDATE accounts SET balance = balance + amount WHERE id = toId
  ├─ INSERT INTO transactions (from_account_id, to_account_id, amount, ...)
  │
  ├─ COMMIT
  │    └─ Return transaction record
  │
  └─ ROLLBACK (if any exception is thrown)
       └─ Balances unchanged, no transaction record created
```

---

## Frontend Architecture

### State Management Strategy

| State Type | Tool | Examples / Usage |
|---|---|---|
| Auth state (user, tokens) | **Zustand** | `useAuthStore` — stores user, accessToken, set/clear auth |
| UI state | **Zustand** | Modal open/close status, sidebar collapse |
| Server data (GET) | **React Query** | `useAccount()`, `useTransactions()` — caching, auto-refetching |
| Mutations (POST/PATCH) | **React Query** `useMutation` | `useTransfer()`, `useUpdateStatus()` |

**Why not Redux Toolkit:**
- Excess boilerplate for an app of this size.
- Zustand + React Query is lighter, cleaner, and extremely powerful.
- React Query manages caching, background refetching, and stale-while-revalidate out of the box.

### Routing

```
/ → redirect to /dashboard (if authenticated) or /login
/login → LoginPage (public)
/register → RegisterPage (public)
/dashboard → DashboardPage (ProtectedRoute)
/transfer → TransferPage (ProtectedRoute)
/transactions → TransactionsPage (ProtectedRoute)
/admin/users → AdminUsersPage (AdminRoute — role=admin only)
/admin/transactions → AdminTransactionsPage (AdminRoute)
/admin/settings → AdminSettingsPage (AdminRoute)
```

---

## Docker Architecture

```yaml
# docker-compose.yml structure
services:
  postgres:           # PostgreSQL database
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]

  backend:            # NestJS API
    build: ./backend
    depends_on: [postgres]
    environment: [from .env]

  frontend:           # React (Nginx serve static files)
    build: ./frontend  (multi-stage: build + nginx)
    depends_on: [backend]

networks:
  banking-net: (bridge)

volumes:
  postgres_data:
```

---

## Technology Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Backend Framework | NestJS | v10+ |
| Backend Language | TypeScript | v5+ |
| Configuration | @nestjs/config (dotenv) | v4+ |
| ORM | TypeORM | v0.3+ |
| Database | PostgreSQL | v16 |
| Frontend Framework | React | v18+ |
| Frontend Language | TypeScript | v6+ |
| UI Library | Ant Design | v5+ |
| Server State | React Query (TanStack) | v5 |
| Client State | Zustand | v4+ |
| HTTP Client | Axios | v1+ |
| Auth | JWT (access) + Opaque (refresh) | — |
| Password Hashing | bcrypt | — |
| Validation | class-validator + class-transformer | — |
| Container | Docker + docker-compose | — |
| API Docs | Swagger (@nestjs/swagger) | — |
