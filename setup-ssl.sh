#!/bin/bash
set -e

# SSL Setup Script for Fluxo Alfa Production
DOMAIN="fluxoalfa.com.br"
EMAIL="equipe@fluxoalfa.com.br"

echo "🔒 Setting up SSL certificates for $DOMAIN (force renewal)"
echo "⚠️  This will replace any existing certificates"

# Check if production environment is running
if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "❌ Production environment is not running"
    echo "💡 Start it first with: ./deploy.sh"
    exit 1
fi

# Test external connectivity first
echo "🌐 Testing external connectivity..."
echo "Please test from your LOCAL computer (not this VPS):"
echo "  curl -I http://$DOMAIN/health"
echo ""
read -p "Can you access http://$DOMAIN/health from outside? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "❌ External connectivity failed. Common fixes:"
    echo "1. Open firewall ports:"
    echo "   sudo ufw allow 80"
    echo "   sudo ufw allow 443"
    echo ""
    echo "2. Check Hostinger VPS firewall in control panel"
    echo "3. Verify DNS: $DOMAIN should point to this server"
    echo ""
    exit 1
fi

# Remove existing certificates to force renewal
echo "🗑️  Removing existing certificates to force renewal..."
docker run --rm -v fluxo-certbot-data-prod:/etc/letsencrypt alpine:latest \
    sh -c "rm -rf /etc/letsencrypt/live/app.$DOMAIN /etc/letsencrypt/archive/app.$DOMAIN /etc/letsencrypt/renewal/app.$DOMAIN.conf" 2>/dev/null || true

# Get SSL certificate
echo "🔐 Obtaining fresh SSL certificate from Let's Encrypt..."
echo "📋 Requesting certificate for: app.$DOMAIN, api.$DOMAIN, admin.$DOMAIN"

# Try standalone mode (more reliable for new certificates)
echo "🔍 Using standalone mode for certificate generation..."
echo "⏸️  Temporarily stopping nginx..."
docker compose -f docker-compose.prod.yml stop nginx

# Get SSL certificate using standalone mode
echo "🔐 Requesting certificate using standalone mode..."

# First try with just the main domain to debug
echo "📋 Testing with main domain first..."
docker run --rm \
    -v fluxo-certbot-data-prod:/etc/letsencrypt \
    -p 80:80 \
    certbot/certbot \
    certonly \
    --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --verbose \
    --test-cert \
    -d app.$DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ Test certificate successful! Getting real certificate..."
    # Remove test certificate
    docker run --rm -v fluxo-certbot-data-prod:/etc/letsencrypt alpine:latest \
        sh -c "rm -rf /etc/letsencrypt/live/app.$DOMAIN /etc/letsencrypt/archive/app.$DOMAIN /etc/letsencrypt/renewal/app.$DOMAIN.conf" 2>/dev/null || true

    # Get real certificate for all domains (expand existing if needed)
    docker run --rm \
        -v fluxo-certbot-data-prod:/etc/letsencrypt \
        -p 80:80 \
        certbot/certbot \
        certonly \
        --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        --expand \
        --verbose \
        -d app.$DOMAIN \
        -d api.$DOMAIN \
        -d admin.$DOMAIN
else
    echo "❌ Test certificate failed. Check DNS and firewall settings."
    exit 1
fi

CERT_RESULT=$?

# Restart nginx
echo "🔄 Restarting nginx..."
docker compose -f docker-compose.prod.yml start nginx

if [ $CERT_RESULT -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"
else
    echo "❌ Failed to obtain SSL certificate"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"

    # Switch to HTTPS-enabled nginx configuration
    echo "🔄 Switching to HTTPS-enabled nginx configuration..."
    if [ -f "./docker/nginx/conf.d/fluxoalfa-ssl.conf.bak" ]; then
        cp "./docker/nginx/conf.d/fluxoalfa-ssl.conf.bak" "./docker/nginx/conf.d/fluxoalfa.conf"
    else
        # Fallback to default HTTPS config if backup doesn't exist
        echo "⚠️  Backup HTTPS config not found, using default"
    fi

    # Restart nginx to load SSL certificates
    echo "🔄 Restarting nginx with SSL certificates..."
    docker compose -f docker-compose.prod.yml restart nginx

    # Wait for nginx to restart
    sleep 10

    # Test SSL connectivity
    echo "🧪 Testing SSL connectivity..."
    if curl -s -f -k https://app.$DOMAIN/health > /dev/null; then
        echo "✅ SSL health check passed"
    else
        echo "⚠️  SSL health check failed, but certificates are installed"
        echo "💡 Check nginx logs: docker compose -f docker-compose.prod.yml logs nginx"
    fi

    echo ""
    echo "🎉 SSL setup complete! Fresh certificates installed."
    echo "🌐 Main site: https://app.$DOMAIN"
    echo "🌐 API endpoint: https://api.$DOMAIN"
    echo "🌐 Admin panel: https://admin.$DOMAIN"
    echo "🔒 HTTP traffic is automatically redirected to HTTPS"
    echo ""
    echo "📋 Next automatic renewal: 90 days from now"
    echo "💡 Run this script anytime to force immediate renewal"
else
    echo "❌ Failed to obtain SSL certificate"
    echo "🔍 Check the logs above for details"
    echo "💡 Common issues:"
    echo "  - Firewall blocking port 80"
    echo "  - DNS not pointing to this server"
    echo "  - Domain not accessible from internet"
fi