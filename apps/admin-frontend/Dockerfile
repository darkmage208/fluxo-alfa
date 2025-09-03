FROM node:18-alpine as builder

WORKDIR /app

# Copy root package.json and install dependencies
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/admin-frontend/package*.json ./apps/admin-frontend/

RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/admin-frontend ./apps/admin-frontend

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build frontend
WORKDIR /app/apps/admin-frontend
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/admin-frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/admin-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]