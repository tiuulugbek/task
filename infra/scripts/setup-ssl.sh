#!/bin/bash
set -e

cd "$(dirname "$0")/../.."

# Load .env file if it exists
if [ -f "infra/.env" ]; then
  export $(grep -v '^#' infra/.env | xargs)
fi

echo "🔒 Setting up SSL with Let's Encrypt..."

# Extract domain from ALLOWED_ORIGIN or use default
DOMAIN="${DOMAIN:-task.acoustic.uz}"
if [ -n "$ALLOWED_ORIGIN" ]; then
  DOMAIN=$(echo "$ALLOWED_ORIGIN" | sed 's|https\?://||')
fi

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
