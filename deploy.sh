#!/bin/bash
set -e

# Production Deployment Script for Fluxo Alfa
# Domain: fluxoalfa.com.br

DOMAIN="fluxoalfa.com.br"
EMAIL="admin@fluxoalfa.com.br"

echo "🚀 Deploying Fluxo Alfa to production"
echo "📋 Domain: $DOMAIN"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "💡 Copy .env.production to .env and fill in your production values:"
    echo "   cp .env.production .env"
    echo "   nano .env"
    exit 1
fi

# Check required environment variables
echo "🔍 Checking environment variables..."
if ! grep -q "^POSTGRES_PASSWORD=" .env || ! grep -q "^JWT_SECRET=" .env || ! grep -q "^REDIS_PASSWORD=" .env; then
    echo "❌ Error: Missing required environment variables in .env"
    echo "💡 Ensure these are set: POSTGRES_PASSWORD, JWT_SECRET, REFRESH_TOKEN_SECRET, REDIS_PASSWORD"
    exit 1
fi

echo "✅ Environment variables check passed"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Start production environment
echo "🏗️ Building and starting production environment..."
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if all services are running
echo "🔍 Checking service status..."
if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "❌ Some services failed to start"
    docker compose -f docker-compose.prod.yml ps
    docker compose -f docker-compose.prod.yml logs
    exit 1
fi

echo "✅ All services are running"

# Test local connectivity
echo "🧪 Testing local connectivity..."
if curl -s -f http://localhost/health > /dev/null; then
    echo "✅ Local health check passed"
else
    echo "❌ Local health check failed"
    docker compose -f docker-compose.prod.yml logs nginx
    exit 1
fi

# Check if SSL certificates exist
if docker volume inspect fluxo-certbot-data-prod >/dev/null 2>&1 && \
   docker run --rm -v fluxo-certbot-data-prod:/etc/letsencrypt alpine:latest test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    echo "✅ SSL certificates found"
    echo "🌐 Your site is running at: https://$DOMAIN"
    echo "🌐 API endpoint: https://api.$DOMAIN"
    echo "🌐 Admin panel: https://admin.$DOMAIN"
else
    echo "⚠️  No SSL certificates found"
    echo "🌐 Your site is running at: http://$DOMAIN"
    echo "🌐 API endpoint: http://api.$DOMAIN"
    echo "🌐 Admin panel: http://admin.$DOMAIN"
    echo ""
    echo "📝 To set up SSL certificates, run:"
    echo "   ./setup-ssl.sh"
fi

echo ""
echo "🎉 Production deployment complete!"
echo ""
echo "📊 Container status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🔧 Useful commands:"
echo "  View logs: docker compose -f docker-compose.prod.yml logs"
echo "  Restart:   docker compose -f docker-compose.prod.yml restart"
echo "  Stop:      docker compose -f docker-compose.prod.yml down"