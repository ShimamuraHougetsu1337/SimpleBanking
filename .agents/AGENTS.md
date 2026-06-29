# Agent Rules — Simple Banking App

> These rules apply to all agents working in the `SimpleBankingApp` workspace.
> They leverage the **Prompt Routing** technique: each group of rules is tagged with a `[ROUTE: ...]`
> identifier to help the agent match the correct context during execution.

---

## [ROUTE: coding-conventions] — Applies when: writing any TypeScript file

- Always use **TypeScript strict mode** (`"strict": true` in `tsconfig.json`).
- Backend file naming convention: `kebab-case` (e.g., `transfer-money.service.ts`, `jwt-auth.guard.ts`).
- Frontend component file naming convention: `PascalCase` (e.g., `TransferForm.tsx`, `DashboardPage.tsx`).
- Frontend hook/util/service file naming convention: `camelCase` (e.g., `useTransactions.ts`, `api.ts`).
- Use `DECIMAL` / `numeric(18,2)` for all monetary database fields — **NEVER** use float, double, or plain JavaScript `number` variables to represent money in calculations.
- Use `decimal.js` (or an equivalent precision math library) when performing currency calculations in backend services.
- Define variables and function names in clear, expressive English. Avoid obscure abbreviations.
- **All code comments MUST be written in English** — this applies to inline comments, block comments, JSDoc, and TODO/FIXME notes. No exceptions.
- Each file should export a single primary responsibility (Single Responsibility Principle).
- **Path aliases**: All cross-module imports in `backend/src/` and `frontend/src/` MUST use the `@/` path alias (e.g., `import { User } from '@/users/entities/user.entity'`). Same-module (sibling) imports use relative paths (`./` or `../`). Never use deep relative paths like `../../` to cross module boundaries.

---

## [ROUTE: backend-nestjs] — Applies when: writing or editing NestJS backend code

- Each domain feature must occupy its own NestJS module: `AuthModule`, `UserModule`, `AccountModule`, `TransactionModule`, `AdminModule`.
- Mandatory folder structure per module: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `entities/`, `dto/`.
- **Controller Layer**: Handles HTTP requests/responses only. NO business logic allowed. Controllers should only retrieve parameters (`@Body()`, `@Param()`, `@Query()`), invoke services, and return responses.
- **Service Layer**: Handles core business logic. Do not execute raw SQL strings directly. Use TypeORM repositories or the `EntityManager`.
- **Repository/Entity Layer**: Handles CRUD and query operations only. NO business logic.
- All request payloads must be defined via DTO classes validated with `class-validator` decorators.
- Protect all authenticated endpoints with the `@UseGuards(JwtAuthGuard)` decorator.
- Protect admin-restricted endpoints with `@UseGuards(JwtAuthGuard, RolesGuard)` and the `@Roles('admin')` decorator.
- Use a custom parameter decorator `@CurrentUser()` to extract user details from the JWT request object. Avoid using `@Req()` to prevent `any` typing.
- Configure the global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`.
- Exclude `password_hash` or other sensitive fields from API responses using `@Exclude()` and the `ClassSerializerInterceptor`.
- Always use TypeORM parameterized queries — **NEVER** build queries via string concatenation.
- Return standardized API error formats and correct HTTP status codes as specified in `API_SPEC.md`.

---

## [ROUTE: backend-auth] — Applies when: writing auth, JWT strategy, or token lifecycle logic

- Implement **Refresh Token Rotation**: each refresh token must be usable exactly once.
- On refresh token usage: mark the old token as `is_revoked = true` IMMEDIATELY before generating the new token pair.
- **Reuse Detection**: If an already revoked refresh token is sent to the `/auth/refresh` endpoint → immediately revoke ALL refresh tokens belonging to that user (force logout on all devices).
- Access Token TTL: **15 minutes** (`expiresIn: '15m'`).
- Refresh Token TTL: **7 days** (`expires_at = NOW() + 7 days`).
- Store refresh tokens as a **SHA-256 hash** in the database — do not save plaintext values.
- Store access tokens in Zustand client memory — do not persist access tokens in `localStorage`.
- Store refresh tokens in secure **HttpOnly Cookies** to mitigate XSS risks.
- JWT payload definition: `{ sub: user.id, email: user.email, role: user.role }`. Do not include credentials or hashes in the payload.
- Leverage `@nestjs/passport` and `@nestjs/jwt` — do not roll custom JWT handlers.

---

## [ROUTE: backend-transaction] — Applies when: implementing money transfers or balance modifications

- The entire transfer flow (debiting sender, crediting receiver, and writing transaction logs) MUST be executed within a single database transaction using a TypeORM `QueryRunner`.
- Use a **Pessimistic Write Lock** (`lock: { mode: 'pessimistic_write' }`) when reading account records to process transfers.
- Lock accounts in ascending order of `account.id` to prevent **deadlocks**.
- Validate the `idempotency_key` BEFORE starting the database transaction — if the key exists, return the cached result immediately.
- Enforce the transaction flow structure: `try/catch/finally` where `catch` calls `rollbackTransaction()` and `finally` calls `queryRunner.release()`.
- Update account balances via database-level SQL expressions (`balance = balance - :amount`) rather than reading, updating in memory, and saving to avoid stale read anomalies.
- Validate transfer values: amount must be > 0, have at most 2 decimal places, and not exceed the available balance.
- Validate destination accounts: must exist, have an `active` status, and cannot be identical to the sender's account.
- **NEVER** allow account balances to drop below zero — enforce this through both database CHECK constraints and application-level checks.

---

## [ROUTE: frontend-react] — Applies when: writing React code, components, or hooks

- All HTTP requests must go through the central Axios instance configured in `src/services/api.ts`.
- The Axios instance must include a **request interceptor** that automatically appends the `Authorization: Bearer <accessToken>` header.
- The Axios instance must configure a **response interceptor** to handle automatic refresh on `401` errors:
  - Intercept HTTP `401` → request `POST /auth/refresh` to get a new access token.
  - Retry the failed original request with the new access token.
  - If refresh fails → clear the auth state and redirect the client to `/login`.
- Leverage **React Query** (`useQuery`, `useMutation`) for all server state orchestration. Do not trigger manual fetch operations inside `useEffect`.
- Leverage **Zustand** to manage local client states (authenticated user, tokens, global loading, modals).
- **DO NOT** use Redux Toolkit in this project.
- Wrap secure views in a `<ProtectedRoute>` component to redirect unauthenticated traffic to `/login`.
- Wrap admin-only views in an `<AdminRoute>` component to check if the user has `role === 'admin'`.
- Never hardcode the base API URL — reference `import.meta.env.VITE_API_BASE_URL`.

---

## [ROUTE: frontend-ui] — Applies when: implementing UI layouts, forms, and tables

- Use **Ant Design (antd v5)** as the principal UI library — do not mix MUI or Bootstrap into the project.
- Implement transaction lists using the Ant Design `<Table>` component with **server-side pagination** (bind `pagination.onChange` to API calls).
- Use Ant Design's `<Form>` and `<Form.Item rules={[...]}>` for all forms — do not use react-hook-form.
- Display balances and monetary counters using the Ant Design `<Statistic>` component.
- Display success or error toast feedback through Ant Design's `message.success()`, `message.error()`, or `notification.open()`.
- Always handle three states for asynchronous calls: `loading` (bind to React Query's `isLoading` / `isPending`), `error`, and `success`.
- Disable form submit buttons when `isPending` is true to prevent duplicate submits.
- Format all displayed monetary values as VND: `new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(amount)`.
- Always provide empty and error views for tables.
- Ensure the UI is **pretty, premium-looking, and compatible/fullscreen for desktop screens**. Use responsive design techniques to adapt layouts and prevent hardcoded container widths that break fullscreen desktop views.

---

## [ROUTE: security] — Applies when: modifying auth layers, database queries, inputs, or env files

- **NEVER** commit actual `.env` files to Git repositories — ensure `.env` is listed in `.gitignore`.
- **NEVER** print or log sensitive information, such as passwords, raw tokens, or security keys.
- Perform strict application validation on transfer amounts: must be > 0, maximum 2 decimal places, and less than or equal to the available balance.
- Check destination account existence and status before initiating transfers.
- Administrators cannot lock their own accounts.
- Users must only access their own records — enforce boundaries by fetching `userId` from the verified JWT payload rather than trusting payload bodies or query parameters.
- Restrict CORS permissions to the defined `FRONTEND_URL` in backend configurations.
- Enforce rate-limiting constraints on `/auth/login` and `/auth/refresh` endpoints via `@nestjs/throttler`.

---

## [ROUTE: database] — Applies when: writing schema migrations, database seeding, or typeorm entities

- Apply schema changes exclusively through **TypeORM migrations** — **DO NOT** enable `synchronize: true` in production (limit synchronization to local dev configurations).
- Keep seeding logic in `src/database/seeds/` — execute seeds separately, do not embed them inside migration files.
- Seed datasets must include at least: **2 customer accounts** and **1 admin account** with sufficient transaction history for demo purposes.
- Migration file naming standard: `timestamp_describe_change` (e.g., `1719624000000_create_users_table`).
- Define entities in the `entities/` folder inside their respective domain modules. Do not write entities into a global folder.
- Add `created_at` and `updated_at` timestamps to all entity tables.
- Explicitly map monetary attributes in entities using `@Column({ type: 'numeric', precision: 18, scale: 2 })`.

---

## [ROUTE: eslint-enforcement] — Applies when: writing or editing any TypeScript file in the project

- **After creating or modifying any TypeScript file** in the `backend/` directory, you MUST run ESLint to validate the file(s) before ending your turn:
  ```bash
  # Lint a specific file or directory
  npx eslint src/path/to/file.ts --max-warnings=0

  # Lint the entire backend source
  npx eslint src/ --max-warnings=0
  ```
- If ESLint reports **errors**, you MUST fix them before completing the task. Do not leave lint errors in the codebase.
- If ESLint reports **warnings**, evaluate them and fix when reasonably possible. Document any intentionally suppressed warnings with an inline `// eslint-disable-next-line` comment explaining why.
- The backend ESLint config is located at [`backend/eslint.config.mjs`](file:///e:/Work/SimpleBankingApp/backend/eslint.config.mjs). It uses `typescript-eslint` with `recommendedTypeChecked` rules and `prettier` integration.
- Do **NOT** globally disable ESLint rules in `eslint.config.mjs` — override rules at the specific line or file level only when strictly necessary.
- Run ESLint from the `backend/` directory so the `parserOptions.projectService` can resolve `tsconfig.json` correctly.

---

## Rules Priority in Case of Conflict

If instructions appear to conflict, resolve them using the following priority order:
1. `[ROUTE: security]` — Security measures always take precedence.
2. `[ROUTE: backend-transaction]` — Data consistency and transaction integrity.
3. `[ROUTE: backend-auth]` — User authentication and token rotation flows.
4. `[ROUTE: backend-nestjs]` — Backend code conventions.
5. `[ROUTE: frontend-react]` — Frontend application logic.
6. `[ROUTE: frontend-ui]` — Layout, design, and feedback standards.
7. `[ROUTE: coding-conventions]` — General code formatting.
8. `[ROUTE: database]` — Database structure and seeding.
9. `[ROUTE: eslint-enforcement]` — Code quality gate, applied after every TypeScript edit.
