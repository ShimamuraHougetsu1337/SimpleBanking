# Module 6.3 — Structured Logging & Health Check

## Mục tiêu
Chuẩn hóa toàn bộ log ứng dụng sang dạng JSON có `requestId` xuyên suốt mỗi request để tra cứu sự cố nhanh chóng, đồng thời bổ sung endpoint `/health` kiểm tra sức khỏe hệ thống theo thời gian thực.

---

## Phần 1 — Structured Logging với requestId

### Nguyên tắc thiết kế
- Dùng **Async Local Storage (Node.js built-in)** để truyền `requestId` xuyên suốt vòng đời của một request mà không cần truyền tay qua từng hàm.
- Một **middleware** sinh ra `requestId` (UUID v4) ngay đầu vào từ header `X-Request-Id` của client hoặc tự sinh mới nếu không có.
- Một **custom logger** override `Logger` của NestJS để tự động đính kèm `requestId`, `timestamp`, `level` vào từng dòng log dưới dạng JSON.
- **GlobalExceptionFilter** được cập nhật để log lỗi cũng kèm `requestId`.
- **Log được lưu ra file** bằng cách redirect stdout ra `logs/app.log` — không cần sửa code ứng dụng, không block Event Loop.

### Luồng dữ liệu

```
Client Request
    │
    ▼
RequestIdMiddleware (sinh hoặc lấy X-Request-Id từ header)
    │  ← Lưu vào AsyncLocalStorage
    ▼
Controller → Service → ... (mọi Logger.log/error đều tự đính kèm requestId)
    │
    ▼
Response (header X-Request-Id được gửi lại client)
    │
    ▼
stdout → redirect → logs/app.log
```

### Chiến lược lưu log ra file

Dùng **Cách 1 — Redirect stdout** (không cần sửa code ứng dụng):

```bash
# Vừa xem terminal vừa lưu file (khuyến nghị khi dev)
npm run dev 2>&1 | tee logs/app.log

# Hoặc chỉ lưu file, không hiện terminal
npm run dev >> logs/app.log 2>&1
```

Thêm script vào `backend/package.json`:
```json
"dev:log": "npm run dev 2>&1 | tee logs/app.log"
```

Thêm vào `.gitignore`:
```
logs/
```

Tìm kiếm log theo requestId:
```bash
grep "abc-123" logs/app.log
```

> [!NOTE]
> Khi cần nâng cấp lên production (ELK, Loki, Datadog...), chỉ cần thay đổi cấu hình infrastructure, **không cần sửa bất kỳ dòng code nào** vì log đã ở định dạng JSON chuẩn.

---

## Phần 2 — Endpoint /health

### Hành vi
| Tình trạng hệ thống | HTTP Status | Response |
|---|---|---|
| DB kết nối OK | `200 OK` | `{ status: "ok", db: "up", responseTime: "Xms" }` |
| DB mất kết nối | `503 Service Unavailable` | `{ status: "error", db: "down", error: "..." }` |

- Endpoint **không yêu cầu JWT** (không có `JwtAuthGuard`) vì đây là endpoint dành cho monitoring tools (Uptime Robot, AWS CloudWatch, Kubernetes readinessProbe...).
- Đặt ở `/api/health` (nằm trong global prefix `api`, không có version prefix `/v1`).

---

## Proposed Changes

### Component 1 — Async Context Store (Mới)

#### [NEW] `src/common/context/async-context.service.ts`
- Khởi tạo `AsyncLocalStorage<{ requestId: string }>` như một Injectable singleton.
- Cung cấp các phương thức `run(store, callback)`, `getStore()`, `getRequestId()`.

#### [NEW] `src/common/context/async-context.module.ts`
- Khai báo là `@Global()` để toàn bộ ứng dụng có thể inject `AsyncContextService` mà không cần import lại.

---

### Component 2 — RequestId Middleware (Mới)

#### [NEW] `src/common/middleware/request-id.middleware.ts`
- Implement `NestMiddleware`.
- Lấy `X-Request-Id` từ request headers nếu có, nếu không thì sinh UUID v4 mới.
- Lưu `requestId` vào `AsyncContextService`.
- Set header `X-Request-Id` vào response để client có thể trace.

#### [MODIFY] `src/app.module.ts`
- Apply `RequestIdMiddleware` cho **tất cả routes** (`*`) bằng `configure(consumer)`.
- Import `AsyncContextModule`.

---

### Component 3 — JSON Logger (Mới)

#### [NEW] `src/common/logger/json.logger.ts`
- Extend `ConsoleLogger` của NestJS.
- Override các method `log()`, `warn()`, `error()`, `debug()`, `verbose()`.
- Mỗi lần ghi log, tự lấy `requestId` từ `AsyncContextService.getRequestId()` và serialize JSON theo format:
```json
{
  "timestamp": "2026-07-14T07:48:41.000Z",
  "level": "log",
  "context": "TransactionsService",
  "requestId": "a1b2c3d4-...",
  "message": "Processing deposit for account VN..."
}
```

#### [MODIFY] `src/main.ts`
- Thay thế default NestJS logger bằng `JsonLogger` custom:
  ```typescript
  const app = await NestFactory.create(AppModule, { logger: new JsonLogger() });
  ```

---

### Component 4 — Cập nhật GlobalExceptionFilter

#### [MODIFY] `src/common/filters/http-exception.filter.ts`
- Inject `AsyncContextService` vào filter.
- Thêm `requestId` vào response body lỗi để client có thể dùng ID này tra cứu log:
```json
{
  "statusCode": 422,
  "error": "UNPROCESSABLE_ENTITY",
  "message": "Số dư tài khoản không đủ",
  "requestId": "a1b2c3d4-..."
}
```

> [!WARNING]
> `GlobalExceptionFilter` hiện đang được đăng ký trong `main.ts` bằng `app.useGlobalFilters(new GlobalExceptionFilter())`. Sẽ cần chuyển sang đăng ký qua DI container (dùng `APP_FILTER` trong `AppModule`) để cho phép inject `AsyncContextService` vào filter.

---

### Component 5 — Health Module (Mới)

#### [NEW] `src/health/health.controller.ts`
- Endpoint: `GET /api/health` (không có version prefix, không cần JWT).
- Thực hiện `dataSource.query('SELECT 1')` để kiểm tra kết nối DB.
- Đo thời gian phản hồi DB query và trả về trong response.
- Trả về `200` nếu thành công, `503` nếu DB timeout/lỗi.

#### [NEW] `src/health/health.module.ts`
#### [MODIFY] `src/app.module.ts`
- Import `HealthModule`.

---

## Verification Plan

### Automated Tests
```bash
# ESLint check toàn bộ các file mới
npx eslint src/common/context/ src/common/middleware/ src/common/logger/ src/health/

# TypeScript compile check
npx tsc --noEmit
```

### Manual Verification

**Test requestId xuyên suốt request:**
1. Khởi động backend bằng `npm run dev:log` để log ghi vào `logs/app.log`.
2. Gửi request tạo giao dịch bị lỗi (ví dụ: rút quá số dư).
3. Kiểm tra response body có trường `requestId`.
4. Lọc log bằng requestId đó:
```bash
grep "<requestId-từ-response>" logs/app.log
```
5. Xác nhận tất cả dòng log liên quan đến request đó đều có cùng `requestId`.

**Test /health endpoint:**
1. Gọi `GET /api/health` khi DB đang chạy → kỳ vọng `200 OK`.
2. Tắt Docker container của PostgreSQL tạm thời.
3. Gọi lại `GET /api/health` → kỳ vọng `503 Service Unavailable`.
4. Bật lại DB → gọi lại → kỳ vọng `200 OK`.

---

## Các quyết định đã xác nhận

> [!NOTE]
> **Cronjobs dùng `jobId` riêng:** Mỗi lần cronjob bắt đầu chạy (`FeeSettlementCron`, `ReconciliationCron`), hệ thống sinh một UUID mới bằng `uuidv4()` (đã có sẵn trong dự án) và lưu vào `AsyncLocalStorage` với key `requestId`. Toàn bộ log trong lần chạy đó sẽ tự đính kèm `jobId` này.

> [!NOTE]
> **Redis:** Hệ thống hiện tại không dùng Redis — bỏ qua hoàn toàn, không thêm Redis check vào `/health`.

