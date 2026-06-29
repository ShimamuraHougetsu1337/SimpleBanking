---
name: docker-compose-setup
description: >
  Set up Docker Compose for NestJS backend + React frontend + PostgreSQL database.
  Trigger when: needing Docker, containers, docker-compose, multi-service setup,
  Dockerfile, production builds, or deployment instructions.
triggers:
  - "Docker"
  - "docker-compose"
  - "container"
  - "Dockerfile"
  - "deploy"
  - "containerize"
  - "production build"
  - "multi-service"
---

# Skill: Docker Compose — Banking App Setup

## When to Use This Skill

Use this skill when configuring or editing the Docker assets of the Simple Banking App:
- Configuring `docker-compose.yml` multi-service specifications.
- Building the NestJS backend Dockerfile.
- Building the React frontend (nginx wrapped) multi-stage production Dockerfile.

## docker-compose.yml Configuration

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: banking_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - banking-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: banking_backend
    restart: unless-stopped
    env_file: ./backend/.env
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    depends_on:
      postgres:
        condition: service_healthy  # Ensures postgres health check passes before backend starts
    networks:
      - banking-net
    volumes:
      # Mount code updates directly during development (remove/comment for production)
      - ./backend/src:/app/src:ro

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:3000/api}
    container_name: banking_frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-5173}:80"  # Exposes Nginx port 80 to port 5173
    depends_on:
      - backend
    networks:
      - banking-net

networks:
  banking-net:
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

## Dockerfile — NestJS Backend

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Cache node modules layer
COPY package*.json ./
RUN npm ci --only=production=false

COPY . .

# Compile TypeScript
RUN npm run build

# === Production Phase ===
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy transpiled code
COPY --from=builder /app/dist ./dist

# Non-privileged user account configuration
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
```

## Dockerfile — React Frontend (Multi-stage)

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Build args passed from compose
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .

# Compile client static production assets
RUN npm run build

# === Nginx Server Phase ===
FROM nginx:alpine AS production

# Copy client assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy SPA routing configurations for React Router fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Nginx SPA Server Configurations

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip settings
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # React Router fallback handler
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static resources cache controls
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security settings
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

## Global .env.example

```env
# Database Credentials
DB_HOST=postgres
DB_PORT=5432
DB_NAME=banking_db
DB_USERNAME=banking_user
DB_PASSWORD=your_secure_password_here

# JWT Credentials
JWT_ACCESS_SECRET=your_very_long_random_access_secret_here_min_64_chars
JWT_REFRESH_SECRET=your_very_long_random_refresh_secret_here_min_64_chars

# Ports Mapping
BACKEND_PORT=3000
FRONTEND_PORT=5173

# Frontend Vite configuration
VITE_API_BASE_URL=http://localhost:3000/api

# Node environment variable settings
NODE_ENV=development
```

## backend/.env.example

```env
# Database Credentials
DB_HOST=postgres
DB_PORT=5432
DB_NAME=banking_db
DB_USERNAME=banking_user
DB_PASSWORD=your_secure_password_here

# JWT Secrets
JWT_ACCESS_SECRET=your_very_long_random_access_secret_here_min_64_chars
JWT_REFRESH_SECRET=your_very_long_random_refresh_secret_here_min_64_chars

# App Configurations
PORT=3000
NODE_ENV=production

# CORS configurations
FRONTEND_URL=http://localhost:5173

# TypeORM synchronizations (Toggle false for production safety)
TYPEORM_SYNCHRONIZE=false
TYPEORM_LOGGING=false
```

## CLI Management Tasks

```bash
# Spin up all containers in the background
docker-compose up -d

# Trace real-time log outputs
docker-compose logs -f backend
docker-compose logs -f postgres

# Run database migrations inside the backend container
docker-compose exec backend npm run migration:run

# Populate seed data
docker-compose exec backend npm run seed

# Bring down services (preserving volumes)
docker-compose down

# Destroy services and reset volumes database
docker-compose down -v

# Force rebuild container images
docker-compose up -d --build backend
```

## NestJS Database Config with Docker Integration

```typescript
// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,  // Enforced safety setting
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
}));
```

## Checklist

- [ ] Ensure docker-compose.yml configures database, backend, and frontend.
- [ ] Enforce backend to start ONLY when postgres is running AND passes its health check.
- [ ] Ensure postgres service includes a health check check script.
- [ ] Backend Dockerfile must follow a multi-stage builder-production flow running as a non-privileged user.
- [ ] Frontend Dockerfile must compile client assets and wrap them inside an Nginx client stage with client-side routing fallback configuration.
- [ ] Ensure `.env` is listed in `.gitignore` file.
- [ ] Verify TypeORM settings have synchronization turned off (`synchronize: false`) for production builds.
