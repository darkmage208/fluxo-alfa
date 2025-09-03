# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies for building
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build backend
WORKDIR /app/apps/backend
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:18-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/

# Install only production dependencies
RUN npm ci --only=production

# Copy built code from builder stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json files for runtime
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Copy Prisma schema
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

EXPOSE 8000

CMD ["npm", "start"]