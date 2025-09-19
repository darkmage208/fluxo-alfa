#!/bin/bash
set -e

# SSL Setup Script for Fluxo Alfa Production
DOMAIN="fluxoalfa.com.br"
EMAIL="admin@fluxoalfa.com.br"

echo "🔒 Setting up SSL certificates for $DOMAIN"

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

# Get SSL certificate
echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
docker compose -f docker-compose.prod.yml run --rm certbot \
    certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d api.$DOMAIN \
    -d admin.$DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"

    # Restart nginx to load SSL certificates
    echo "🔄 Restarting nginx with SSL certificates..."
    docker compose -f docker-compose.prod.yml restart nginx

    # Wait for nginx to restart
    sleep 10

    # Test SSL connectivity
    echo "🧪 Testing SSL connectivity..."
    if curl -s -f -k https://$DOMAIN/health > /dev/null; then
        echo "✅ SSL health check passed"
    else
        echo "⚠️  SSL health check failed, but certificates are installed"
        echo "💡 Check nginx logs: docker compose -f docker-compose.prod.yml logs nginx"
    fi

    echo ""
    echo "🎉 SSL setup complete!"
    echo "🌐 Main site: https://$DOMAIN"
    echo "🌐 API endpoint: https://api.$DOMAIN"
    echo "🌐 Admin panel: https://admin.$DOMAIN"
    echo "🔒 HTTP traffic is automatically redirected to HTTPS"
    echo ""
    echo "📋 Certificate renewal is automatic via the certbot container"
else
    echo "❌ Failed to obtain SSL certificate"
    echo "🔍 Check the logs above for details"
    echo "💡 Common issues:"
    echo "  - Firewall blocking port 80"
    echo "  - DNS not pointing to this server"
    echo "  - Domain not accessible from internet"
fi