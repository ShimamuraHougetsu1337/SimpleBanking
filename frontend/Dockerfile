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
