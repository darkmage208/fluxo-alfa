#!/bin/bash
set -e

# Production Deployment Script for Fluxo Alfa
# Domain: fluxoalfa.com.br

DOMAIN="fluxoalfa.com.br"
EMAIL="equipe@fluxoalfa.com.br"

echo "🚀 Deploying Fluxo Alfa to production"
echo "📋 Domain: app.$DOMAIN"

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

# Set up HTTP-only nginx config for initial deployment
echo "🔧 Setting up HTTP-only nginx configuration..."
if [ -f "./docker/nginx/conf.d/fluxoalfa.conf" ]; then
    # Check if current config has SSL (contains "listen 443")
    if grep -q "listen 443" "./docker/nginx/conf.d/fluxoalfa.conf"; then
        cp "./docker/nginx/conf.d/fluxoalfa.conf" "./docker/nginx/conf.d/fluxoalfa-ssl.conf.bak"
        echo "📦 Backed up HTTPS config to fluxoalfa-ssl.conf.bak"
    fi
fi

# Create HTTP-only config if it doesn't exist or needs to be recreated
if [ ! -f "./docker/nginx/conf.d/fluxoalfa.conf" ] || grep -q "listen 443" "./docker/nginx/conf.d/fluxoalfa.conf"; then
    echo "🔧 Creating HTTP-only configuration..."
    cat > "./docker/nginx/conf.d/fluxoalfa.conf" << 'EOF'
# Upstream definitions
upstream backend {
    least_conn;
    server user-frontend:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream api {
    least_conn;
    server backend:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream admin {
    least_conn;
    server admin-frontend:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Main website - fluxoalfa.com.br (HTTP only)
server {
    listen 80;
    server_name app.fluxoalfa.com.br;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Rate limiting
    limit_req zone=general burst=20 nodelay;

    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $server_name;

    # Main application
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_redirect off;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}

# API subdomain - api.fluxoalfa.com.br (HTTP only)
server {
    listen 80;
    server_name api.fluxoalfa.com.br;

    # Let's Encrypt challengez
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # CORS headers for API
    add_header Access-Control-Allow-Origin "http://app.fluxoalfa.com.br, http://admin.fluxoalfa.com.br" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
    add_header Access-Control-Expose-Headers "Content-Length,Content-Range" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight requests
    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "http://app.fluxoalfa.com.br, http://admin.fluxoalfa.com.br" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }

        # Rate limiting for API
        limit_req zone=api burst=50 nodelay;

        # Proxy to backend
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_redirect off;
    }

    # Auth endpoints with stricter rate limiting
    location ~ ^/(auth|billing)/webhook {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 5;
    }
}

# Admin subdomain - admin.fluxoalfa.com.br (HTTP only)
server {
    listen 80;
    server_name admin.fluxoalfa.com.br;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Rate limiting
    limit_req zone=general burst=20 nodelay;

    # Admin application
    location / {
        proxy_pass http://admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_redirect off;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://admin;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
EOF
fi

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

# Check SSL certificate status and setup
echo "🔍 Checking SSL certificate status..."
if docker volume inspect fluxo-certbot-data-prod >/dev/null 2>&1 && \
   docker run --rm -v fluxo-certbot-data-prod:/etc/letsencrypt alpine:latest test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    echo "📜 Existing SSL certificates found"
    echo "🔄 SSL certificates will be renewed/updated on next setup-ssl.sh run"
    echo "🌐 Your site is running at: https://app.$DOMAIN"
    echo "🌐 API endpoint: https://api.$DOMAIN"
    echo "🌐 Admin panel: https://admin.$DOMAIN"
else
    echo "⚠️  No SSL certificates found"
    echo "🌐 Your site is running at: http://app.$DOMAIN"
    echo "🌐 API endpoint: http://api.$DOMAIN"
    echo "🌐 Admin panel: http://admin.$DOMAIN"
fi

echo ""
echo "📝 To set up or renew SSL certificates, run:"
echo "   ./setup-ssl.sh"

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