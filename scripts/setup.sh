#!/bin/bash

# Fluxo Alfa Setup Script
# This script sets up the complete AI+RAG SaaS chat application

set -e

echo "🚀 Setting up Fluxo Alfa - AI+RAG SaaS Chat Application"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ and try again.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo -e "${RED}❌ Node.js version 18 or higher is required. Current version: $(node --version)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Node.js requirements met${NC}"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating environment file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Environment file created. Please edit .env with your configuration.${NC}"
else
    echo -e "${YELLOW}⚠️  Environment file already exists.${NC}"
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Start infrastructure
echo -e "${YELLOW}🐳 Starting Docker infrastructure...${NC}"
docker-compose up -d postgres redis
echo -e "${GREEN}✅ Infrastructure started${NC}"

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 10

# Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
cd apps/backend && npm run db:generate
echo -e "${GREEN}✅ Prisma client generated${NC}"

# Run database migrations
echo -e "${YELLOW}📊 Running database migrations...${NC}"
npm run db:migrate
echo -e "${GREEN}✅ Database migrations completed${NC}"

# Seed database
echo -e "${YELLOW}🌱 Seeding database...${NC}"
npm run db:seed
echo -e "${GREEN}✅ Database seeded${NC}"

cd ../..

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys and configuration"
echo "2. Run 'npm run dev' to start development servers"
echo "3. Access the applications:"
echo "   - User App: http://localhost:3000"
echo "   - Admin Dashboard: http://localhost:3001"
echo "   - Backend API: http://localhost:8000"
echo ""
echo "Default admin login:"
echo "   Email: admin@fluxoalfa.com"
echo "   Password: admin123456"
echo ""
echo "For production deployment:"
echo "   - Copy .env.production to .env"
echo "   - Configure your production values"
echo "   - Run 'docker-compose -f docker-compose.prod.yml up -d'"