# Simple Banking App

An internal banking application prototype built using **NestJS**, **React**, and **PostgreSQL**.

---

## Features

### Customer Features
- 🔐 Sign Up / Log In with secure JWT authentication (Access Token + Refresh Token Rotation).
- 💰 Balance and account details view.
- 💸 Internal transfer system (atomic database transactions with race condition protection).
- 📋 Paginated transaction history with filtering capabilities.

### Admin Features
- 👥 User registry and details listing.
- 🔒 Lock / Unlock user banking accounts.
- 📊 Global transactions overview.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) + TypeORM |
| Database | PostgreSQL 16 |
| Frontend | React (TypeScript) + Vite + Ant Design |
| State | Zustand + React Query (TanStack Query) |
| Auth | JWT Access Token + Refresh Token Rotation |
| Container | Docker + docker-compose |

---

## Setup & Running

### Requirements

- [Node.js v20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Using Docker Compose (Quick Start)

```bash
# 1. Clone the repository
git clone <repository-url>
cd SimpleBankingApp

# 2. Setup environment variables
cp .env.example .env
# Edit details inside .env if required (default details are ready for local dev)

# 3. Spin up docker container services
docker-compose up -d

# 4. Execute database schema migrations
docker-compose exec backend npm run migration:run

# 5. Populate seed testing dataset
docker-compose exec backend npm run seed
```

**Access links:**
- 🌐 Frontend application: http://localhost:5173
- 🔌 Backend API server: http://localhost:3000/api
- 📖 Swagger API docs: http://localhost:3000/api/docs

### Local Environment Setup

For local machine setup details without Docker wrapping, reference [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md).

---

## Testing Accounts

| User Role | Email | Password |
|---|---|---|
| Customer | customer1@banking.test | Test@123456 |
| Customer | customer2@banking.test | Test@123456 |
| Admin | admin@banking.test | Admin@123456 |

---

## Project Documentation

| File Reference | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | High-level system architecture guide |
| [DATA_MODEL.md](docs/DATA_MODEL.md) | Database schemas & relationships |
| [API_SPEC.md](docs/API_SPEC.md) | API endpoints specification |
| [SEQUENCE_DIAGRAMS.md](docs/SEQUENCE_DIAGRAMS.md) | Sequential processing flows mapping |
| [SECURITY.md](docs/SECURITY.md) | Core application security measures |
| [FRONTEND_GUIDE.md](docs/FRONTEND_GUIDE.md) | Frontend guidelines & store patterns |
| [DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) | Development machine configurations |
| [CHANGELOG.md](docs/CHANGELOG.md) | Sequential changes list log |

---

## Project Directory Layout

```
SimpleBankingApp/
├── backend/          # NestJS API code
├── frontend/         # React SPA code
├── docs/             # Technical specifications & guides
├── .agents/          # Developer agent configs & routines
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## License

MIT
