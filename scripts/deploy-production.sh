#!/bin/bash

# =============================================================================
# Fluxo Alfa - Production Deployment Script for DigitalOcean VPS
# =============================================================================

set -e

echo "🚀 Starting Fluxo Alfa Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="fluxoalfa.com.br"
EMAIL="equipe@fluxoalfa.com.br"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. Make sure this is intended."
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_status "Please copy .env.production to .env and configure it."
    exit 1
fi

print_status "Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Prerequisites check passed!"

# Stop existing containers
print_status "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true

# Remove old images (optional, uncomment if you want to force rebuild)
# print_status "Removing old images..."
# docker compose -f docker-compose.prod.yml down --rmi all --volumes --remove-orphans || true

# Pull latest images and build
print_status "Building application images..."
docker compose -f docker-compose.prod.yml build --no-cache

# Remove existing network if it has incorrect labels
print_status "Cleaning up existing networks..."
docker network rm fluxo-network-prod 2>/dev/null || true

# Create networks and volumes
print_status "Creating Docker networks and volumes..."
docker network create fluxo-network-prod 2>/dev/null || true

# Start infrastructure services first
print_status "Starting infrastructure services..."
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check if database is ready
DB_READY=false
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U fluxo_user -d fluxoalfa_prod; then
        DB_READY=true
        break
    fi
    print_status "Waiting for database... ($i/30)"
    sleep 2
done

if [ "$DB_READY" = false ]; then
    print_error "Database failed to start after 60 seconds"
    exit 1
fi

print_success "Database is ready!"

# Run database migrations
print_status "Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push
docker compose -f docker-compose.prod.yml run --rm backend npx tsx src/scripts/seed-pricing.ts

# Start application services
print_status "Starting application services..."
docker compose -f docker-compose.prod.yml up -d backend
sleep 10

print_status "Starting frontend services..."
docker compose -f docker-compose.prod.yml up -d user-frontend admin-frontend

# Initial SSL certificate setup (only run this once)
if [ ! -d "./docker/nginx/ssl" ]; then
    print_status "Setting up SSL certificates for $DOMAIN..."

    # Start nginx with initial config for certificate challenge
    docker compose -f docker-compose.prod.yml up -d nginx

    # Wait a bit for nginx to start
    sleep 5

    # Get initial certificates
    print_status "Obtaining SSL certificates from Let's Encrypt..."
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d app.$DOMAIN \
        -d admin.$DOMAIN \
        -d api.$DOMAIN

    if [ $? -eq 0 ]; then
        print_success "SSL certificates obtained successfully!"
    else
        print_warning "SSL certificate generation failed. You may need to configure DNS first."
        print_status "The application will still work with the initial nginx config."
    fi

    # Restart nginx with SSL configuration
    docker compose -f docker-compose.prod.yml restart nginx
else
    print_status "SSL certificates already exist. Starting nginx..."
    docker compose -f docker-compose.prod.yml up -d nginx
fi

# Start certificate renewal service
print_status "Starting certificate renewal service..."
docker compose -f docker-compose.prod.yml up -d certbot

# Final startup
print_status "Performing final startup..."
docker compose -f docker-compose.prod.yml up -d

# Wait for all services to be healthy
print_status "Waiting for all services to be healthy..."
sleep 15

# Check service health
print_status "Checking service health..."
BACKEND_HEALTHY=false
for i in {1..12}; do
    if curl -f http://localhost/health &>/dev/null; then
        BACKEND_HEALTHY=true
        break
    fi
    print_status "Waiting for backend health check... ($i/12)"
    sleep 5
done

# Show deployment status
echo ""
echo "=============================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""

if [ "$BACKEND_HEALTHY" = true ]; then
    print_success "✅ Backend is healthy and responding"
else
    print_warning "⚠️  Backend health check failed - check logs"
fi

echo "🌐 Your application should be available at:"
echo "   • Main site: https://app.$DOMAIN"
echo "   • Admin panel: https://admin.$DOMAIN"
echo "   • API: https://api.$DOMAIN"
echo ""
echo "📊 To check service status:"
echo "   docker compose -f docker-compose.prod.yml ps"
echo ""
echo "📋 To view logs:"
echo "   docker compose -f docker-compose.prod.yml logs -f [service-name]"
echo ""
echo "🔄 To restart services:"
echo "   docker compose -f docker-compose.prod.yml restart [service-name]"
echo ""

# Show final instructions
print_status "Post-deployment checklist:"
echo "  1. ✅ Configure DNS A records:"
echo "     - app.$DOMAIN → Your server IP"
echo "     - admin.$DOMAIN → Your server IP"
echo "     - api.$DOMAIN → Your server IP"
echo ""
echo "  2. ✅ Update .env.production with your actual API keys"
echo ""
echo "  3. ✅ Test SSL certificates after DNS propagation:"
echo "     https://www.ssllabs.com/ssltest/"
echo ""
echo "  4. ✅ Set up monitoring and backups"
echo ""

print_success "Deployment script completed successfully! 🚀"