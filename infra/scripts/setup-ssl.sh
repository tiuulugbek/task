#!/bin/bash
set -e

echo "🔒 Setting up SSL with Let's Encrypt..."

DOMAIN="${DOMAIN:-task.acoustic.uz}"
EMAIL="${EMAIL:-admin@acoustic.uz}"

# Stop nginx temporarily
docker-compose -f infra/docker-compose.yml stop nginx

# Obtain certificate
sudo certbot certonly --standalone \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

# Create SSL directory
mkdir -p infra/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem infra/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem infra/nginx/ssl/
sudo chmod 644 infra/nginx/ssl/*.pem

# Start nginx
docker-compose -f infra/docker-compose.yml start nginx

echo "✅ SSL setup completed!"
echo ""
echo "Certificates are in: infra/nginx/ssl/"
echo "Renewal: sudo certbot renew"
