# Plan: Docs, Rules & Skills cho Simple Banking App

## Bối cảnh

Dự án **Simple Banking App** là một ứng dụng ngân hàng nội bộ cho thực tập sinh, yêu cầu:
- **Backend**: NestJS (TypeScript) + TypeORM + PostgreSQL
- **Frontend**: ReactJS (TypeScript) + State management (Redux Toolkit / Zustand / React Query)
- **Auth**: JWT
- **Container**: Docker + docker-compose

Trước khi bắt đầu code, cần thiết lập đầy đủ **tài liệu kỹ thuật**, **rules** cho agent, và **skills** tái sử dụng để đảm bảo agent hiểu rõ ngữ cảnh, tuân thủ đúng convention và triển khai chính xác.

---

## Các tài liệu cần tạo

### 1. Project Docs (trong `e:\Work\SimpleBankingApp\docs\`)

#### [NEW] `docs/ARCHITECTURE.md`
Mô tả kiến trúc tổng thể:
- Sơ đồ thành phần (Client ↔ API Gateway ↔ NestJS Modules ↔ PostgreSQL)
- Mô tả từng module NestJS: `AuthModule`, `UserModule`, `AccountModule`, `TransactionModule`
- Phân tầng: Controller → Service → Repository (Entity)
- Chiến lược JWT (access token + optional refresh token)
- Chiến lược Docker networking

#### [NEW] `docs/DATA_MODEL.md`
Mô tả chi tiết data model:
- Schema bảng `users`, `accounts`, `transactions` với kiểu dữ liệu chính xác
- Quan hệ FK, index, constraint
- Lý do dùng `DECIMAL/numeric(18,2)` thay float cho tiền tệ
- Chiến lược sinh `account_number` tự động

#### [NEW] `docs/API_SPEC.md`
Đặc tả API endpoints:
- Tất cả endpoints (method, path, auth required, request body, response schema, error codes)
- Flow xác thực JWT (Bearer token trong header)
- Chuẩn error response format (code, message, statusCode)
- Các admin endpoints (bonus)

#### [NEW] `docs/SEQUENCE_DIAGRAMS.md`
Sequence diagrams cho 2 nghiệp vụ chính (theo yêu cầu bàn giao):
- **Luồng đăng nhập**: Client → Controller → AuthService → UserRepository → DB → JWT → Client
- **Luồng chuyển khoản**: Client → Controller → TransactionService → (DB Transaction: debit A → credit B → ghi transaction record) → rollback nếu lỗi

#### [NEW] `docs/SECURITY.md`
Tài liệu bảo mật:
- Checklist bảo mật (bcrypt, JWT, CORS, env vars, SQL injection prevention)
- Chiến lược chống double-submit (idempotency key)
- Chiến lược chống race condition (pessimistic locking)
- Validate & sanitize input rules

#### [NEW] `docs/FRONTEND_GUIDE.md`
Hướng dẫn Frontend:
- Cấu trúc thư mục React (`pages/`, `components/`, `services/`, `store/`, `hooks/`)
- Chiến lược state management (lý do chọn thư viện nào)
- Pattern gọi API với Axios + JWT interceptor
- Protected Route pattern
- UI component library được dùng

#### [NEW] `docs/DEVELOPMENT_GUIDE.md`
Hướng dẫn setup môi trường dev:
- Prerequisites (Node, Docker, PostgreSQL)
- Các lệnh chạy backend/frontend
- Biến môi trường cần thiết (`.env.example`)
- Hướng dẫn chạy seed data
- Hướng dẫn chạy Docker Compose

---

### 2. Root-level deliverable files

#### [NEW] `README.md`
README tổng quan dự án với hướng dẫn cài đặt & chạy (yêu cầu bắt buộc khi bàn giao)

#### [NEW] `.env.example`
Danh sách đầy đủ các biến môi trường (DB, JWT secret, port, etc.)

---

### 3. Agent Rules (trong `.agents/AGENTS.md`)

#### [NEW] `.agents/AGENTS.md`

Rules toàn cục cho agent khi làm việc trong project này:

**Coding conventions:**
- Luôn dùng TypeScript strict mode
- Tên file backend: `kebab-case` (e.g. `transfer-money.service.ts`)
- Tên file frontend: `PascalCase` cho component (e.g. `TransferForm.tsx`), `camelCase` cho hook/util
- Dùng `DECIMAL/numeric(18,2)` cho tất cả trường tiền tệ, KHÔNG bao giờ dùng `float` hoặc `number` cho tiền

**Backend rules:**
- Mỗi feature là một NestJS module riêng (Auth, User, Account, Transaction)
- Controller chỉ handle HTTP, không chứa business logic
- Tất cả input phải có DTO + `class-validator` decorator
- Tất cả route cần auth phải có `@UseGuards(JwtAuthGuard)`
- Thao tác chuyển khoản PHẢI nằm trong `EntityManager.transaction()` hoặc `QueryRunner`
- KHÔNG để password hash hoặc thông tin nhạy cảm trong API response
- Dùng TypeORM parameterized query, KHÔNG bao giờ string concatenation trong query

**Frontend rules:**
- Tất cả API call qua Axios instance trung tâm với JWT interceptor
- Route cần auth phải wrap trong `<ProtectedRoute>`
- Form phải có client-side validation trước khi gọi API
- Luôn xử lý trạng thái `loading`, `error`, `success` cho mọi async action
- Không hardcode URL API, dùng biến môi trường

**Security rules:**
- KHÔNG commit `.env` file
- KHÔNG log thông tin nhạy cảm (password, token)
- Validate số tiền: phải > 0, tối đa 2 chữ số thập phân, không vượt số dư, không tự chuyển cho chính mình
- Kiểm tra tài khoản đích tồn tại và active trước khi ghi giao dịch

**Database rules:**
- Dùng migration cho schema thay đổi (không dùng `synchronize: true` ở production)
- Dùng seed script riêng biệt, không nhúng vào migration

---

### 4. Agent Skills (trong `.agents/skills/`)

#### [NEW] `.agents/skills/nestjs-module-scaffold/SKILL.md`
**Skill**: Tạo NestJS module đúng chuẩn cho dự án này
- Generate module, controller, service, DTOs, entity theo cấu trúc chuẩn
- Tích hợp TypeORM repository
- Áp dụng đúng guard, decorator

#### [NEW] `.agents/skills/typeorm-transaction/SKILL.md`
**Skill**: Implement database transaction với TypeORM
- Pattern dùng `QueryRunner` để wrap nhiều operations
- Rollback khi có lỗi
- Pessimistic locking cho chống race condition
- Áp dụng cụ thể cho chuyển khoản ngân hàng

#### [NEW] `.agents/skills/jwt-auth-nestjs/SKILL.md`
**Skill**: Setup JWT authentication trong NestJS
- `JwtModule`, `PassportModule` configuration
- `JwtAuthGuard`, `JwtStrategy`
- `CurrentUser` decorator để lấy user từ token
- Login/Register flow

#### [NEW] `.agents/skills/react-api-layer/SKILL.md`
**Skill**: Tạo API layer cho React app
- Axios instance với base URL và interceptors
- Auto attach JWT token
- Auto handle 401 → redirect to login
- Error normalization

#### [NEW] `.agents/skills/docker-compose-setup/SKILL.md`
**Skill**: Tạo Docker Compose cho NestJS + React + PostgreSQL
- Service definitions (backend, frontend, db)
- Networking, volumes, env vars
- Health checks, depends_on
- `.env` integration

---

## Thứ tự thực hiện

```
Phase 1: Docs cốt lõi (làm rõ yêu cầu trước khi code)
  1. docs/DATA_MODEL.md        ← schema rõ ràng → backend dựa vào đây
  2. docs/API_SPEC.md          ← contract giữa FE & BE
  3. docs/ARCHITECTURE.md      ← full picture
  4. docs/SEQUENCE_DIAGRAMS.md ← yêu cầu bàn giao bắt buộc

Phase 2: Rules & Skills (thiết lập guardrails cho agent)
  5. .agents/AGENTS.md         ← rules toàn cục
  6. .agents/skills/typeorm-transaction/SKILL.md   ← skill quan trọng nhất
  7. .agents/skills/nestjs-module-scaffold/SKILL.md
  8. .agents/skills/jwt-auth-nestjs/SKILL.md
  9. .agents/skills/react-api-layer/SKILL.md
  10. .agents/skills/docker-compose-setup/SKILL.md

Phase 3: Docs hỗ trợ dev
  11. docs/SECURITY.md
  12. docs/FRONTEND_GUIDE.md
  13. docs/DEVELOPMENT_GUIDE.md
  14. README.md + .env.example
```

---

## Open Questions

> [!IMPORTANT]
> **State management cho Frontend**: Tài liệu đề bài cho phép tự chọn (Redux Toolkit / Zustand / React Query). Bạn muốn dùng thư viện nào?
> - **Redux Toolkit**: Nhiều boilerplate hơn, nhưng quen thuộc và có DevTools tốt
> - **Zustand**: Nhẹ, đơn giản, ít boilerplate
> - **React Query (TanStack Query)**: Tập trung vào server state, rất phù hợp cho Banking app (caching, refetch tự động)

> [!IMPORTANT]
> **UI Library cho Frontend**: Tài liệu gợi ý MUI, Ant Design, hoặc Tailwind. Bạn muốn dùng cái nào?
> - **MUI (Material UI)**: Component-rich, banking app look chuyên nghiệp
> - **Ant Design**: Phù hợp enterprise/financial apps, có nhiều component sẵn (Table, Form, etc.)
> - **Tailwind CSS**: Tự do thiết kế, nhẹ hơn

> [!IMPORTANT]
> **Admin module**: Tài liệu đánh dấu Admin là "tùy chọn nâng cao". Có cần implement Admin (xem danh sách user, khóa/mở tài khoản) không?

> [!NOTE]
> **Refresh Token**: Đề bài yêu cầu access token bắt buộc, refresh token là "bonus". Plan sẽ thiết kế sẵn chỗ cho refresh token nhưng implement access token trước.

## Verification Plan

### Sau khi tạo docs & rules:
- Review `API_SPEC.md` để đảm bảo đủ endpoints theo yêu cầu đề bài
- Review `DATA_MODEL.md` để đảm bảo schema đúng với gợi ý trong đề bài
- Review `AGENTS.md` để đảm bảo rules cover đủ các yêu cầu bảo mật & kỹ thuật

### Sau khi tạo skills:
- Đọc lại từng SKILL.md để đảm bảo pattern đúng với NestJS/TypeORM best practices
- Kiểm tra skill `typeorm-transaction` cover đủ: debit, credit, ghi record, rollback, locking
