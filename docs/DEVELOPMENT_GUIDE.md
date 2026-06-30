# Development Guide — Simple Banking App

## Prerequisites

Ensure the following tools are installed on your machine:

| Tool | Minimum Version | Reference Link |
|---|---|---|
| Node.js | v20 LTS | https://nodejs.org |
| npm | v10+ | (Comes with Node.js) |
| Docker Desktop | v4+ | https://www.docker.com |
| Git | v2.40+ | https://git-scm.com |
| PostgreSQL (Optional) | v16 | (Can use Docker instance instead) |

---

## Clean Code & Software Craftsmanship

To ensure our application is readable, maintainable, and highly scalable for both backend and frontend development, we strictly follow these core practices:

- **Meaningful Naming:** Use descriptive, intention-revealing names for variables, functions, and classes. Code should be written for humans to understand first.
- **Single Responsibility Principle (SRP):** Ensure each function, NestJS module, or React component does exactly one thing.
- **DRY (Don't Repeat Yourself):** Abstract repetitive logic into shared utility functions, NestJS services, or React custom hooks to keep the codebase lean.
- **Robust Error Handling:** Always implement clean `try/catch` blocks, centralized API exception filters, and graceful UI degradation (Error Boundaries).
- **Separation of Concerns:** Keep business logic isolated from presentation layers (React components) or network layers (NestJS controllers).

---

## 1. Clone & Setup

```bash
# Clone the repository
git clone <repository-url>
cd SimpleBankingApp

# Create environment configuration files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Open the newly created `.env` files and configure credentials to match your environment variables.

---

## 2. Docker Compose Deployment (Recommended)

```bash
# Build and spin up all docker containers
docker-compose up -d

# Check live logs for startup verification
docker-compose logs -f

# Run database schema migrations
docker-compose exec backend npm run migration:run

# Populate seed data
docker-compose exec backend npm run seed

# Access urls:
# Frontend client: http://localhost:5173
# Backend API: http://localhost:3000/api
# Swagger docs: http://localhost:3000/api/docs
```

---

## 3. Local Machine Setup (Alternative Development)

### Backend Service (NestJS)

```bash
cd backend

# Install project dependencies
npm install

# Set up local database (requires PostgreSQL running locally)
# Edit backend/.env using correct DB credentials

# Run TypeORM migrations
npm run migration:run

# Populate seed data
npm run seed

# Run the backend in hot-reload mode
npm run start:dev

# Endpoint will be exposed at: http://localhost:3000
# API documentation: http://localhost:3000/api/docs
```

### Frontend Client (React + Vite)

```bash
cd frontend

# Install package dependencies
npm install

# Spin up local Vite development server
npm run dev

# Access site locally: http://localhost:5173
```

---

## 4. Environment Variables Reference

### Backend Configurations (`backend/.env`)

```env
# Database Credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_db
DB_USERNAME=banking_user
DB_PASSWORD=your_password

# JWT Credentials — Generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<64+ character random string>
JWT_REFRESH_SECRET=<64+ character random string — must be different from ACCESS_SECRET>

# App Configurations
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# TypeORM
TYPEORM_SYNCHRONIZE=false
TYPEORM_LOGGING=true
```

### Frontend Configurations (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## 5. NPM CLI Commands

### Backend CLI Tasks (`backend/package.json`)

```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "build": "nest build",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/typeorm.config.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/typeorm.config.ts",
    "seed": "ts-node src/database/seeds/run-seeds.ts",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### Frontend CLI Tasks (`frontend/package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

---

## 6. Default Seed Accounts

Located at: `backend/src/database/seeds/`

The seed command creates the following default testing accounts:

| Full Name | Email | Password | Role | Account Number | Initial Balance |
|---|---|---|---|---|---|
| Nguyen Van A | customer1@banking.test | Test@123456 | customer | VN10001000001001 | 10,000,000 VND |
| Tran Thi B | customer2@banking.test | Test@123456 | customer | VN10001000001002 | 5,000,000 VND |
| Admin System | admin@banking.test | Admin@123456 | admin | VN10001000000001 | 0 VND |

> **Note**: Seed datasets contain pre-filled transaction entries to populate history dashboards.

---

## 7. Migration Commands

```bash
# Generate a new migration migration based on entity differences
cd backend
npm run migration:generate -- src/database/migrations/AddSomeField

# Run outstanding database migrations
npm run migration:run

# Revert the latest database migration
npm run migration:revert
```

---

## 8. Swagger / API documentation

Swagger UI: **http://localhost:3000/api/docs**

All API endpoints are documented, describing schemas, fields, query parameters, auth requirements, and example mock payloads.

---

## 9. Troubleshooting

### Connection to PostgreSQL Database Refused
```bash
# Verify the Docker database container is running
docker-compose ps postgres
# Check database container console logs
docker-compose logs postgres
```

### TypeORM Migration Execution Failed
```bash
# Verify database config matches actual environment details
# Ensure the database instance itself was successfully created
docker-compose exec postgres psql -U banking_user -c "\l"
```

### Frontend Client Cannot Reach API Server
```bash
# Verify Vite environment configuration VITE_API_BASE_URL matches backend
# Verify backend service is exposed and active
# Verify backend CORS configuration is set correctly (FRONTEND_URL)
```

### Local Development Ports Already Occupied
```bash
# Reconfigure local application ports in .env
BACKEND_PORT=3001
FRONTEND_PORT=5174
```
