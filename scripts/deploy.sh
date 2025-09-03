#!/bin/bash

# Fluxo Alfa Production Deployment Script
# This script deploys the application to production

set -e

echo "🚀 Deploying Fluxo Alfa to Production"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if production environment file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Production .env file not found. Please create it from .env.production template.${NC}"
    exit 1
fi

# Verify critical environment variables
source .env

if [ -z "$DATABASE_URL" ] || [ -z "$JWT_SECRET" ] || [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ Missing critical environment variables. Please check your .env file.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration verified${NC}"

# Build and deploy with production compose
echo -e "${YELLOW}🏗️  Building production images...${NC}"
docker-compose -f docker-compose.prod.yml build

echo -e "${YELLOW}🚀 Deploying to production...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Run database migrations in production
echo -e "${YELLOW}📊 Running production database migrations...${NC}"
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

echo -e "${YELLOW}🌱 Seeding production database...${NC}"
docker-compose -f docker-compose.prod.yml exec backend npm run db:seed

echo ""
echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
echo ""
echo "Services are running:"
echo "- Backend API: Port ${BACKEND_PORT:-8000}"
echo "- User Frontend: Port ${USER_FRONTEND_PORT:-3000}"
echo "- Admin Frontend: Port ${ADMIN_FRONTEND_PORT:-3001}"
echo "- PostgreSQL: Port ${POSTGRES_PORT:-5432}"
echo "- Redis: Port ${REDIS_PORT:-6379}"
echo ""
echo "Health check: curl http://localhost:${BACKEND_PORT:-8000}/health"
echo ""
echo "To monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop: docker-compose -f docker-compose.prod.yml down"