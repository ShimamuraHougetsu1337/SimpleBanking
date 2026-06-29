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
