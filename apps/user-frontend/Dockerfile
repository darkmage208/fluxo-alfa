FROM node:18-alpine as builder

# Accept build arguments
ARG VITE_API_URL
ARG NODE_ENV=production

# Set environment variables for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=$NODE_ENV

WORKDIR /app

# Copy root package.json and install dependencies
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/user-frontend/package*.json ./apps/user-frontend/

# Install all dependencies including dev dependencies for build
RUN npm ci --include=dev

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/user-frontend ./apps/user-frontend

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build frontend with environment variables
WORKDIR /app

# Build using workspace command from root
RUN echo "Building user-frontend with VITE_API_URL=$VITE_API_URL" && \
    npm run build --workspace=@fluxo/user-frontend

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/user-frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/user-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]