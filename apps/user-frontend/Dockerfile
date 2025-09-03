FROM node:18-alpine as builder

WORKDIR /app

# Copy root package.json and install dependencies
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/user-frontend/package*.json ./apps/user-frontend/

RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/user-frontend ./apps/user-frontend

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build frontend
WORKDIR /app/apps/user-frontend
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/user-frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/user-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]