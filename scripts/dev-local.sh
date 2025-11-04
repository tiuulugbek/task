#!/bin/bash
set -e

echo "🔧 Installing dependencies..."
pnpm install

echo "🏗️  Building shared package..."
cd services/shared && pnpm build && cd ../..

echo "🗄️  Starting database (Docker)..."
cd infra && docker compose up -d postgres rabbitmq && cd ..

echo "⏳ Waiting for database..."
sleep 5

echo "🔄 Running migrations..."
pnpm migrate

echo "🌱 Seeding database..."
pnpm seed

echo "✅ Setup complete!"
echo ""
echo "To run services in development mode:"
echo "  cd services/[service-name] && pnpm dev"
echo ""
echo "To build for production:"
echo "  pnpm build"
