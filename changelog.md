# Báo cáo Trạng thái Dự án: Simple Banking App

Dưới đây là báo cáo tổng thể về nghiệp vụ, cơ chế hoạt động và các tính năng đã được xây dựng trong dự án tính đến thời điểm hiện tại.

## 1. Tìm hiểu nghiệp vụ (Domain Logic)
Dự án là một hệ thống Ngân hàng cơ bản (Simple Banking App) với các nghiệp vụ cốt lõi:
- **Quản lý Định danh & Phân quyền**: Phân biệt rõ ràng giữa người dùng thông thường (Customer) và Quản trị viên (Admin).
- **Quản lý Tài khoản Ngân hàng (Accounts)**: Mỗi người dùng có thể sở hữu một hoặc nhiều tài khoản ngân hàng riêng biệt, mỗi tài khoản có số dư (balance) và mã số tài khoản (account number) độc lập.
- **Nghiệp vụ Giao dịch (Transactions)**: 
  - Thực hiện chuyển khoản nội bộ giữa các tài khoản ngân hàng.
  - Đảm bảo tính toàn vẹn dữ liệu: số tiền chuyển phải hợp lệ (>0, nhỏ hơn số dư hiện tại), tự động trừ tiền người gửi và cộng tiền người nhận.
  - Lưu vết toàn bộ lịch sử biến động số dư (Transaction History).
- **Nghiệp vụ Quản trị (Admin Operations)**: Theo dõi biến động toàn hệ thống, quản lý rủi ro thông qua việc khóa (lock) hoặc mở khóa (unlock) tài khoản người dùng vi phạm.

## 2. Nắm rõ cơ chế (Technical Mechanisms)
Hệ thống vận hành dựa trên các cơ chế kỹ thuật chặt chẽ, tối ưu cho ứng dụng tài chính:
- **Bảo mật và Xác thực (JWT & Refresh Token Rotation)**:
  - Sử dụng JWT access token để xác thực các request.
  - Cơ chế Refresh Token Rotation: tự động cấp mới cả access token lẫn refresh token để tối đa hóa bảo mật, interceptor của Axios ở Frontend tự động bắt lỗi `401 Unauthorized` và gọi API refresh ngầm (silent refresh) mà không làm gián đoạn UX.
  - **Rate Limiting & CORS**: Áp dụng giới hạn tần suất gửi yêu cầu (`@nestjs/throttler`) trên các endpoint nhạy cảm (như Đăng nhập, Refresh Token) để chống Brute-force, và siết chặt chính sách CORS.
- **Quản lý State Frontend (React Query + Zustand)**:
  - **Zustand**: Quản lý client state (trạng thái đăng nhập của người dùng).
  - **React Query**: Quản lý server state, tự động caching dữ liệu, và invalidate cache (ví dụ: ngay sau khi chuyển tiền, tự động invalidate cache để fetch lại số dư mới nhất).
- **Cơ sở dữ liệu & Toàn vẹn dữ liệu (PostgreSQL + TypeORM)**:
  - **Database Transactions & Locking**: Sử dụng TypeORM QueryRunner và cơ chế khóa (Pessimistic Locking / Row-level lock) để chặn đứng các lỗi Race Condition (Rút tiền đồng thời - Double spend) trong quá trình xử lý chuyển khoản.
  - **Idempotency Key**: Sử dụng khóa Idempotency (chuỗi UUID duy nhất tạo từ client) để ngăn chặn rủi ro gửi trùng lặp giao dịch (Double-submit) do kết nối mạng kém hoặc người dùng bấm đúp nút chuyển tiền.
  - **Kiểu dữ liệu Tiền tệ (Currency Precision)**: Bắt buộc sử dụng kiểu `numeric(18, 2)` thay vì Float/Double để triệt tiêu hoàn toàn sai số dấu phẩy động trong các phép tính toán tài chính.
  - Hiểu rõ cơ chế lưu trữ **MVCC (Multi-Version Concurrency Control)** của PostgreSQL ảnh hưởng đến thứ tự Query và phải sử dụng Secondary Sort Key (`id`) để cố định thứ tự hiển thị danh sách tài khoản.
- **Tiêu chuẩn Code (Clean Code & Strict TypeScript)**: Áp dụng kiến trúc NestJS Module, tách biệt rõ ràng Controller (chỉ xử lý Request/Response) và Service (chứa Business Logic). Sử dụng `verbatimModuleSyntax` cho import type an toàn.
- **Giao diện chuẩn (UI/UX)**: Xây dựng hệ thống UI với **Ant Design v5** kết hợp phong cách thiết kế Data Tables borderless lấy cảm hứng từ **Stripe**, mang lại trải nghiệm chuyên nghiệp cho người dùng.

## 3. Các tính năng đã xây dựng xong (Implemented Features)
Dự án đã hoàn thiện và chạy ổn định các nhóm tính năng (Features) sau:

### 👤 Module Khách hàng (Customer App)
- **Authentication**: Đăng nhập, Đăng ký, Đăng xuất tự động khi hết hạn phiên.
- **Dashboard**: Màn hình tổng quan hiển thị danh sách các thẻ/tài khoản ngân hàng của người dùng kèm số dư hiện tại, thống kê giao dịch nhanh.
- **Tài khoản (Accounts)**: Xem chi tiết thông tin, tùy chỉnh hiển thị (giao diện thẻ). Tích hợp tính năng **Nạp tiền (Deposit)** và **Rút tiền (Withdraw)** trực tiếp tại trang chi tiết tài khoản.
- **Chuyển tiền (Transfer)**: Form chuyển tiền an toàn, tự động truy xuất tên người nhận (Resolve Account) khi nhập số tài khoản đích.
- **Lịch sử giao dịch (Transaction History)**: Xem danh sách dòng tiền ra/vào với **Bộ lọc nâng cao (Advanced Filters)** hỗ trợ tìm kiếm theo từ khóa, lọc theo từng tài khoản, và lọc theo khoảng thời gian `fromDate` / `toDate`.

### 🛡️ Module Quản trị (Admin Panel)
- **Admin Dashboard / Thống kê**: Xem tổng quan số lượng User hiện hành, tài khoản active/locked.
- **Quản lý User (User Management)**: 
  - Xem danh sách toàn bộ khách hàng.
  - Tính năng Lock/Unlock tài khoản khẩn cấp bằng thao tác nhanh.
- **Quản lý Giao dịch (Global Transactions)**: Xem toàn bộ luồng giao dịch diễn ra trên hệ thống để phục vụ đối soát.

---
*Báo cáo được tự động xuất dựa trên trạng thái mã nguồn frontend/backend mới nhất của dự án.*
