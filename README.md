<div align="center">
  <h1>🏦 Ứng dụng Ngân hàng Đơn giản (Simple Banking App)</h1>
  <p>Một nguyên mẫu ứng dụng ngân hàng nội bộ mạnh mẽ, bảo mật và hiện đại</p>
  
  [![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
</div>

---

## 📖 Tổng quan

**Simple Banking App** là một ứng dụng ngân hàng nội bộ toàn diện, được thiết kế để xử lý xác thực người dùng an toàn, thực hiện các giao dịch tài chính chính xác và cung cấp quyền quản trị giám sát. Được xây dựng bằng các công nghệ web hiện đại, ứng dụng tập trung vào tính ổn định, các thao tác cơ sở dữ liệu nguyên tử (atomic transactions) và mang lại trải nghiệm người dùng mượt mà.

---

## ✨ Các tính năng chính

### 👤 Cổng khách hàng (Customer Portal)
- **Xác thực bảo mật:** Truy cập thông qua JWT với cơ chế xoay vòng Refresh Token.
- **Quản lý tài khoản:** Xem số dư theo thời gian thực và thông tin chi tiết của tài khoản.
- **Chuyển tiền & Nạp/Rút:** Khách hàng có thể chuyển tiền nội bộ, tạo yêu cầu nạp/rút tiền (được bảo đảm bởi giao dịch nguyên tử và cơ chế chống lỗi tương tranh).
- **Xác thực OTP:** Bảo mật các giao dịch nhạy cảm bằng mã OTP.
- **Lịch sử giao dịch:** Xem lịch sử giao dịch phân trang cùng với các tính năng lọc mạnh mẽ.
- **Xử lý phí bất đồng bộ:** Hệ thống xử lý phí giao dịch không gây tắc nghẽn, được vận hành bởi BullMQ và Redis.

### 🛡️ Cổng nhân viên & Quản trị (Staff & Admin Portal)
- **Hệ thống Phân quyền (RBAC):** Hệ thống phân quyền nhiều cấp độ với các vai trò Teller (Giao dịch viên), Manager (Quản lý) và Superadmin.
- **Quản lý Yêu cầu Giao dịch:** Teller có thể duyệt hoặc từ chối các yêu cầu nạp/rút tiền của khách hàng.
- **Đối soát & Hoàn tác:** Khả năng đối soát (Reconciliation) và hoàn tác giao dịch (Reversal) dành riêng cho Manager và Superadmin.
- **Quản lý Người dùng & Bảo mật:** Quản lý danh sách người dùng, khóa/mở khóa tài khoản, trạng thái OTP.
- **Nhật ký Hệ thống (Audit Logs):** Ghi vết chi tiết mọi hành động của khách hàng và nhân viên trong hệ thống.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

| Lớp kiến trúc (Architecture Layer) | Công nghệ & Công cụ (Technologies & Tools) |
| :--- | :--- |
| **Backend API** | NestJS (TypeScript), TypeORM |
| **Cơ sở dữ liệu (Database)** | PostgreSQL 16 |
| **Message Broker / Cache** | Redis, BullMQ |
| **Frontend SPA** | React (TypeScript), Vite, Ant Design |
| **Quản lý State** | Zustand, React Query (TanStack Query) |
| **Xác thực (Authentication)** | JWT (Access Tokens + Refresh Token Rotation) |
| **Hạ tầng (Infrastructure)** | Docker, Docker Compose |

---

## 🚀 Hướng dẫn cài đặt

Làm theo các hướng dẫn dưới đây để tải về và chạy dự án trên máy tính cá nhân cho mục đích phát triển và thử nghiệm.

### Yêu cầu hệ thống

Hãy đảm bảo bạn đã cài đặt các phần mềm sau:
- [Node.js](https://nodejs.org/en/) (phiên bản 20 trở lên)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

### Chạy nhanh bằng Docker Compose

Cách đơn giản nhất để chạy toàn bộ hệ thống (Database, Redis, Backend và Frontend) là thông qua Docker Compose.

```bash
# 1. Clone repository về máy
git clone https://github.com/ShimamuraHougetsu1337/SimpleBanking.git
cd SimpleBankingApp

# 2. Thiết lập biến môi trường
cp .env.example .env

# 3. Khởi chạy các dịch vụ (container) ngầm
docker-compose up -d

# 4. Chạy migration cho cơ sở dữ liệu
docker-compose exec backend npm run migration:run

# 5. Khởi tạo dữ liệu mẫu (Seed)
docker-compose exec backend npm run seed
```

**Các đường dẫn truy cập:**
- 🌐 **Ứng dụng Frontend:** [http://localhost:5173](http://localhost:5173)
- 🔌 **Backend API:** [http://localhost:3000/api](http://localhost:3000/api)
- 📖 **Tài liệu API (Swagger):** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

*Để biết cách cài đặt thủ công mà không dùng Docker, vui lòng tham khảo [Hướng dẫn Phát triển](docs/DEVELOPMENT_GUIDE.md).*

---

## 🧪 Tài khoản Thử nghiệm

Sử dụng các thông tin đăng nhập sau để khám phá hệ thống (sau khi đã chạy bước khởi tạo dữ liệu mẫu):

| Vai trò (Role) | Email | Mật khẩu |
| :--- | :--- | :--- |
| **Superadmin** | `admin@gmail.com` | `123456` |
| **Manager** | `manager1@gmail.com` | `123456` |
| **Manager** | `manager2@gmail.com` | `123456` |
| **Teller** | `teller1@gmail.com` | `123456` |
| **Teller** | `teller2@gmail.com` | `123456` |
| **Customer** | `customer@gmail.com` | `123456` |

---

## 📂 Cấu trúc Thư mục

Tổng quan về cách tổ chức các thư mục trong dự án:

```text
SimpleBankingApp/
├── backend/          # Ứng dụng NestJS (Controllers, Services, Modules)
├── frontend/         # React SPA (Components, Hooks, Pages, Store)
├── docs/             # Các tài liệu kỹ thuật & kiến trúc
├── .agents/          # Cấu hình & quy trình tự động cho agent
├── docker-compose.yml# Cấu hình chạy các container
├── .env.example      # File mẫu chứa các biến môi trường
└── README.md         # Tài liệu dự án
```

---

## 📚 Tài liệu Kỹ thuật

Tìm hiểu sâu hơn về kiến trúc và các quyết định thiết kế của hệ thống:

- 🏛️ [Tổng quan Kiến trúc](docs/ARCHITECTURE.md)
- 🗄️ [Mô hình Dữ liệu & Schema](docs/DATA_MODEL.md)
- 📡 [Đặc tả API](docs/API_SPEC.md)
- 🔄 [Sơ đồ Tuần tự (Sequence Diagrams)](docs/SEQUENCE_DIAGRAMS.md)
- 🔐 [Thực tiễn Bảo mật](docs/SECURITY.md)
- 💻 [Hướng dẫn Frontend](docs/FRONTEND_GUIDE.md)
- ⚙️ [Hướng dẫn Phát triển](docs/DEVELOPMENT_GUIDE.md)
- 📜 [Nhật ký Thay đổi (Changelog)](docs/CHANGELOG.md)
