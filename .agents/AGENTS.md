# Agent Rules — Simple Banking App

> These rules apply to all agents working in the `SimpleBankingApp` workspace.
> They leverage the **Prompt Routing** technique: each group of rules is tagged with a `[ROUTE: ...]`
> identifier to help the agent match the correct context during execution.

---

## [ROUTE: skill-routing] — Applies when: evaluating a new task

Before starting to code, evaluate if your task falls into any of the specialized categories below. If it does, you **MUST** use the `view_file` tool to read the corresponding `SKILL.md` file before taking any action.

- **Refactoring, Code Quality, or Code Review** ➜ Read `.agents/skills/clean-code/SKILL.md`
- **React clean code, separating logic from UI, custom hooks, or component refactoring** ➜ Read `.agents/skills/clean-react-components/SKILL.md`
- **User uses commands: /explain, /walkthrough, /review, /optimize** ➜ Read `.agents/skills/code-assistant-commands/SKILL.md`
- **Docker Compose, Containerization, or Deployment** ➜ Read `.agents/skills/docker-compose-setup/SKILL.md`
- **Frontend UI, Styling, Layouts, or Ant Design components** ➜ Read `.agents/skills/frontend-ui-guidelines/SKILL.md`
- **Table design, lists, Stripe-style tables, or data tables** ➜ Read `.agents/skills/stripe-table-design/SKILL.md`
- **Authentication, JWT, Login/Logout, or Refresh Tokens** ➜ Read `.agents/skills/jwt-refresh-rotation/SKILL.md`
- **Creating new NestJS Features, Modules, or Entities** ➜ Read `.agents/skills/nestjs-module-scaffold/SKILL.md`
- **Frontend API Integration, Axios, or React Query hooks** ➜ Read `.agents/skills/react-api-layer/SKILL.md`
- **Database Transactions, Money Transfers, or Balance Updates** ➜ Read `.agents/skills/typeorm-transaction/SKILL.md`
- **User uses command: /commit_message** ➜ Read `.agents/skills/commit-message/SKILL.md`
- **User uses command: /pullcode** ➜ Read `.agents/skills/pullcode/SKILL.md`

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
- **All user interface (UI) text MUST be written in Vietnamese** — this applies to all user-facing labels, buttons, placeholders, menus, dialogs, titles, and validation or status messages (with exceptions only for specific card-based visual accents).
- Each file should export a single primary responsibility (Single Responsibility Principle).
- **Path aliases**: All cross-module imports in `backend/src/` and `frontend/src/` MUST use the `@/` path alias (e.g., `import { User } from '@/users/entities/user.entity'`). Same-module (sibling) imports use relative paths (`./` or `../`). Never use deep relative paths like `../../` to cross module boundaries.
- **Clean Code & Code Quality:**
  - **Constants Over Magic Numbers:** Replace hard-coded values with named constants at the top of the file or in a dedicated constants file.
  - **Meaningful Naming:** Variables, functions, and classes should reveal their purpose (e.g., `isUserLoading` instead of `loading`). Avoid obscure abbreviations.
  - **Smart Comments:** Make code self-documenting. Don't comment on what the code does; use comments to explain *why* something is done a certain way.
  - **Single Responsibility Principle (SRP):** Each function/component should do exactly one thing. If it needs a comment to explain what it does, split it.
  - **DRY (Don't Repeat Yourself):** Extract repeated code into reusable functions and maintain single sources of truth.
  - **Clean Structure:** Keep related code together and organize code in a logical hierarchy using consistent conventions.
  - **Encapsulation:** Hide implementation details, expose clear interfaces, and move nested conditionals into well-named functions.
  - **Code Quality Maintenance:** Refactor continuously, fix technical debt early, and leave code cleaner than you found it.
  - **Testing:** Write tests before fixing bugs, keep tests readable, and test edge cases.
  - **Version Control:** Write clear commit messages, make small focused commits, and use meaningful branch names.
  - **Robust Error Handling:** Implement clean `try/catch` blocks, centralized API error handling, and graceful degradation for both frontend UI and backend services.
- **Strict Interfaces:** Utilize TypeScript to define strict contracts (Interfaces, DTOs, Prop Types) for components and services, making them predictable and type-safe.

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
- Exclude `passwordHash` or other sensitive fields from API responses using `@Exclude()` and the `ClassSerializerInterceptor`.
- Always use TypeORM parameterized queries — **NEVER** build queries via string concatenation.
- Return standardized API error formats and correct HTTP status codes as specified in `API_SPEC.md`.

---


## [ROUTE: frontend-react] — Applies when: writing React code, components, or hooks

- All HTTP requests must go through the central Axios instance configured in `src/services/api.ts`.
- The Axios instance must include a **request interceptor** that automatically appends the `Authorization: Bearer <accessToken>` header.
- The Axios instance must configure a **response interceptor** to handle automatic refresh on `401` errors:
  - Intercept HTTP `401` → request `POST /auth/refresh` to get a new access token.
  - Retry the failed original request with the new access token.
  - If refresh fails → clear the auth state and redirect the client to `/login`.
- Leverage **React Query** (`useQuery`, `useMutation`) for all server state orchestration. Do not trigger manual fetch operations inside `useEffect`.
- **ALWAYS invalidate query caches (`queryClient.invalidateQueries(...)`)** when you update, create, or delete data to ensure the UI stays synchronized with the backend state.
- Leverage **Zustand** to manage local client states (authenticated user, tokens, global loading, modals).
- **DO NOT** use Redux Toolkit in this project.
- Wrap secure views in a `<ProtectedRoute>` component to redirect unauthenticated traffic to `/login`.
- Wrap admin-only views in an `<AdminRoute>` component to check if the user has `role === 'admin'`.
- Never hardcode the base API URL — reference `import.meta.env.VITE_API_BASE_URL`.

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
- Add `createdAt` and `updatedAt` timestamps to all entity tables.
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

## Rules Priority in Case of Conflict

If instructions appear to conflict, resolve them using the following priority order:
1. `[ROUTE: security]` — Security measures always take precedence.
2. `[ROUTE: backend-nestjs]` — Backend code conventions.
3. `[ROUTE: frontend-react]` — Frontend application logic.
4. `[ROUTE: coding-conventions]` — General code formatting.
5. `[ROUTE: database]` — Database structure and seeding.
6. `[ROUTE: eslint-enforcement]` — Code quality gate, applied after every TypeScript edit.
