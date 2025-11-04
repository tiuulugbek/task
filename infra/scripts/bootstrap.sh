#!/bin/bash
set -e

echo "🚀 Bootstrapping Acoustic Task Manager..."

cd "$(dirname "$0")/../.."

# Check if .env exists
if [ ! -f "infra/.env" ]; then
  echo "❌ infra/.env not found. Please copy infra/.env.example to infra/.env and configure it."
  exit 1
fi

# Build images
echo "📦 Building Docker images..."
docker-compose -f infra/docker-compose.yml build

# Start services
echo "🚀 Starting services..."
docker-compose -f infra/docker-compose.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Run migrations
echo "🗄️  Running migrations..."
./infra/scripts/migrate.sh

# Seed database
echo "🌱 Seeding database..."
./infra/scripts/seed.sh

echo "✅ Bootstrap completed!"
echo ""
echo "Next steps:"
echo "1. Configure DNS: task.acoustic.uz -> $(hostname -I | awk '{print $1}')"
echo "2. Run: ./infra/scripts/setup-ssl.sh"
echo "3. Run: ./infra/scripts/set_webhook.sh"
