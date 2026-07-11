# Changelog — Simple Banking App

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [2026-07-11]

### Added
- **In-Memory OTP Cache**: Replaced the database-backed `Otp` entity with an in-memory `lru-cache` on the backend, deleting the database-backed `Otp` entity.
- **Enforced Customer OTP Rules**: Enforced OTP verification for all customer transfers regardless of the amount, and for withdrawals exceeding the settings threshold.
- **Frontend OTP Verification UI**: Integrated a new `OtpVerificationModal` component on the frontend `TransferPage` to support verification code inputs and countdown timers.
- **Unified API Layer**: Introduced `transactionService` on the frontend to centralize all transaction-related API endpoints (deposit, withdraw, transfer, verify-otp, resend-otp).

### Changed
- **React Query for Audit Logs**: Refactored `useAuditLogs` hook and `AdminAuditLogsPage` to use `@tanstack/react-query`'s `useQuery` for cleaner caching, search, and pagination.
- **Transaction Modals Refactoring**: Updated `DepositModal` and `WithdrawModal` to use client-generated UUIDv4 idempotency keys and invalidate query caches on success.

---

## [2026-07-09]

### Added
- **Two-Factor Authentication (OTP) for Transactions**: Implemented OTP 2FA for high-value transactions (online transfers or cash withdrawals exceeding a dynamic threshold). Added `Otp` entity and `OtpService` to handle SHA-256 OTP hashing, verification (with expiry and 3-attempt lockouts), and resend operations.
- **Dynamic Transaction Rate Limiting**: Added `TransactionRateLimitGuard` and dynamic throttler configuration (`throttler.config.ts`) to restrict transaction frequency using parameters defined in settings.
- **Dedicated System Settings Module**: Extracted the system settings entity and service into a root-level `SystemSettingsModule` (`src/system-settings/`) to decouple it from `AdminModule` and resolve circular dependency risks.

### Changed
- **Eager Settings Caching**: Refactored `SystemSettingsService` to pre-load all configuration settings into RAM on application startup (`OnApplicationBootstrap`) and refresh them atomically, making lookups synchronous (0ms RAM cache reads).
- **Service Refactoring & Logic Separation**: Separated high-level orchestration (`TransactionsService`) from lower-level transaction execution (`TransactionsHelper`).
- **Clean Code & SRP Decomposition**: Decomposed long transactional methods across `TransactionsHelper`, `ReversalService`, and `TransactionRequestsService` (e.g., `executeMovement`, `reverseTransaction`, `adminDeposit/Withdraw`, `approve/rejectRequest`) into small, focused private helper functions.
- **Synchronous Service Integrations**: Refactored `FeesService` and `TasksService` to fetch system configurations synchronously from the memory cache instead of executing raw database queries.

---

## [2026-07-08]

### Added
- **System Revenue Account (`SYS_REVENUE`)**: Introduced a dedicated real account belonging to `SYSTEM_CORE` user (`system@banking.local`) to hold swept fees from standard transfers.
- **Account View Tabs**: Added "Tài khoản khách hàng" (Customer Accounts) and "Tài khoản hệ thống" (System Accounts) tabs on the admin accounts page.
- **Transaction Details Modal**: Added a details modal popup (icon button) on the admin transaction table, displaying detailed transaction info (including "Original Transaction ID" for reversals and a quick copy function).
- **User Update Timestamp**: Displayed the "Ngày cập nhật" (Updated At) date-time column on the admin users management page, which defaults to `createdAt` upon user creation.
- **Optimistic Locking**: Added `version` column via `@VersionColumn()` to `User` and `SystemSetting` entities to support optimistic concurrency control.

### Changed
- **Double-Entry Fee Settlement Routing**: Refactored `fee-settlement.cron.ts` to sweep fees from `SYS_FEE_SUSPENSE` into the newly created `SYS_REVENUE` treasury account.
- **Virtual Fee Suspense Sink**: Replaced custom `fee_ledger` tables and Redis queues with real-time credit ledger entries to `SYS_FEE_SUSPENSE` (an insert-only ledger account with `0.00` sentinel balance).
- **System Guards & Protections**: Enforced strict validation preventing soft deletes, freezing, or editing system accounts (`SYS_FEE_SUSPENSE`, `SYS_REVENUE`) or system users (`SYSTEM_CORE`).
- **UI Clean-up**: Hidden or disabled sensitive admin operations (deposit/freeze) for system accounts in the admin UI. Removed description and reversal columns from the main admin transaction list table in favor of the details modal.
- **Transaction Request Locking**: Applied pessimistic locking (`pessimistic_write`) to `TransactionRequest` row retrieval during approval and rejection to eliminate race conditions.
- **Concurrency Protection**: Updated `UsersService` and `SystemSettingsService` to catch `OptimisticLockVersionMismatchError` and throw `ConflictException` upon update conflicts.

---

## [0.5.0] - 2026-07-07

### Added
- **Async Fee Processing**: Implemented asynchronous transaction fee processing using BullMQ and Redis.
- **Fee Settlement**: Added `FeeLedger` and `FeeSettlementLog` entities, a queue processor, and cron jobs for daily settlement.
- **Infrastructure**: Added `redis` service to Docker Compose.
- **Transaction Fee**: Added transaction fee processing in backend to deduct fee and credit the admin account.
- Endpoint `GET /transactions/transfer-fee` to fetch current fee from system settings.
- UI elements in `TransferReviewModal`, `TransactionDetailModal`, `TransactionColumns`, and `AdminTransactionTable` to display fee and total amount breakdown.
- Support for `decimal` data type in `SystemSettingsService`.

### Changed
- **Performance**: Removed synchronous fee transfer to the admin account during standard transfers to improve database lock time and reduce latency.
- **Documentation**: Completely revamped and translated `README.md` into Vietnamese with a professional layout and structure.
- **Daily Limit**: Updated transfer logic to only count the principal `amount` towards the daily limit, excluding the transaction fee.
- **Frontend Refactoring**: Replaced `parseFloat` with `Number()` for fee conversions across UI components to standardize numeric handling.
- **Seeds**: Updated `run-seeds.ts` to initialize `transfer_fee` and `daily_limit` as `decimal` types.
- **Agent Skills**: Updated `commit-message` skill to make CHANGELOG updates optional.

### Planned
- Docker Compose configurations
- Database migrations and seed datasets setup

---

## [0.4.0] - 2026-07-03

### Added
- **Audit Logs**: Introduced a comprehensive audit log system for recording both admin and customer actions.
- **Backend Decorators & Interceptor**: Implemented `@AdminLog` and `@CustomerLog` decorators along with a global `AuditInterceptor` for automatic logging of successful and failed requests.
- **Audit Tables**: Created `admin_audit_logs` and `customer_audit_logs` entities with detailed tracking (action, status, ip_address, metadata, and transaction association).
- **Audit Cleanup Cron Job**: Added a nightly cron job to automatically delete old logs based on configurable retention periods (default: 365 days for admins, 180 days for customers).
- **Admin Settings**: Added an "Audit Logs" (Lưu trữ nhật ký) group in the System Settings UI to configure retention days.
- **Admin Audit Logs UI**: Created a new page (`/admin/audit-logs`) with distinct tabs for "Admin Actions" and "Customer Actions" to search, filter, and monitor system activities.

---

## [0.3.0] - 2026-06-30

### Added
- **Deposit and Withdraw** features added to `AccountDetailPage` with responsive popup modals.
- Backend API endpoints `POST /transactions/deposit` and `POST /transactions/withdraw` with TypeORM transaction blocks, pessimistic locking, and idempotency key validation.
- Agent Guardrails: Added explicit project rules in `AGENTS.md` and `frontend-ui-guidelines` to enforce Clean Code/SRP and React Query Cache Invalidation.

### Changed
- Translated `TransferReviewModal` UI from Vietnamese to English to standardize language usage.
- Refactored `AccountDetailPage` component by splitting monolithic code into isolated components (`AccountQuickActions`, `AccountSettingsForm`, `AccountTransactions`) following Clean Code and SRP principles.
- Optimised network usage in frontend by aggressively utilizing `useQuery` caching (`DashboardPage`, `AccountsPage`, `AccountDetailPage`) to prevent redundant fetch calls.
- Resolved layout thrashing issue by migrating inline styles from `Sidebar` to a global stylesheet `style.css`.
- Fixed navigation logic in "Back" buttons within `AccountDetailPage` to use `navigate(-1)` instead of hardcoded paths.

---

## [0.2.0] - 2026-06-30

### Added
- `AccountsPage` and `AccountDetailPage` to view user accounts and filter specific transaction history.`
- Dynamic layout updates to display authenticated user information in `Sidebar`, `AppLayout`, and `AdminLayout`.
- Backend endpoints `GET /accounts/me` and `GET /accounts/:id`.
- Advanced query filters for `GET /transactions` supporting `accountId`, `search`, `fromDate`, and `toDate`.
- Added `name` field to `accounts` table in the data model.

### Changed
- Refactored `DashboardPage` layout to a vertical list of accounts and their recent transactions (removed carousel and transfer button).
- Transitioned transaction filtering logic to support granular search within specific accounts.
- Removed partially completed frontend boilerplate tasks from Planned.

---

## [0.1.0] - 2026-06-29

### Added
- Initialize project documentation and agent configuration assets.
- `docs/ARCHITECTURE.md` — Detailed system architectural overview.
- `docs/DATA_MODEL.md` — Database data model with schema mappings for users, accounts, transactions, and refresh_tokens.
- `docs/API_SPEC.md` — API specification describing endpoints for Auth, Account, Transaction, and Admin.
- `docs/SECURITY.md` — Security specification covering DB transactions, locking, idempotency, and Refresh Token Rotation.
- `docs/SEQUENCE_DIAGRAMS.md` — Mermaid sequence diagrams mapping core application flows.
- `docs/FRONTEND_GUIDE.md` — Frontend guidelines documenting routing, Zustand/React Query state architecture, and Ant Design.
- `docs/DEVELOPMENT_GUIDE.md` — Development setups, default credentials, CLI scripts, and troubleshooting steps.
- `.agents/AGENTS.md` — Workspace agent guardrail constraints with Prompt Routing support.
- `.agents/skills/typeorm-transaction/` — Banking database transactions patterns skill.
- `.agents/skills/nestjs-module-scaffold/` — NestJS feature/module scaffolding standards skill.
- `.agents/skills/jwt-refresh-rotation/` — JWT authentication and rotation flows skill.
- `.agents/skills/react-api-layer/` — React client-side Axios/Zustand/Query HTTP handler skill.
- `.agents/skills/docker-compose-setup/` — Dockerized container deployment settings skill.

### Technical Decisions
- **State Management**: Zustand (local/auth state) + React Query (async server state) — Redux Toolkit excluded.
- **UI Library**: Ant Design v5
- **Authentication**: JWT Access Token (15m) + Opaque Refresh Token with Rotation (7d).
- **Admin Module**: Fully required scope.
- **Currency Data Representation**: `numeric(18,2)` database type for financial figures (no floats).
- **Concurrency & Duplication Control**: Pessimistic write locking + Unique idempotency keys.

---

<!-- Template for subsequent entries:

## [x.y.z] - YYYY-MM-DD

### Added
- New features added

### Changed
- Changes to existing features

### Fixed
- Bug fixes completed

### Removed
- Removed features

### Security
- Changes related to security updates

-->
