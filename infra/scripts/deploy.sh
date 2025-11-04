#!/bin/bash
set -e

echo "🚀 Deploying Acoustic Task Manager..."

cd "$(dirname "$0")/../.."

echo "📦 Building Docker images..."
docker-compose -f infra/docker-compose.yml build

echo "🗄️  Running database migrations..."
docker-compose -f infra/docker-compose.yml run --rm auth-service pnpm migrate
docker-compose -f infra/docker-compose.yml run --rm user-service pnpm migrate
docker-compose -f infra/docker-compose.yml run --rm workspace-service pnpm migrate
docker-compose -f infra/docker-compose.yml run --rm project-service pnpm migrate
docker-compose -f infra/docker-compose.yml run --rm task-service pnpm migrate
docker-compose -f infra/docker-compose.yml run --rm comment-service pnpm migrate
docker-compose -f infra/docker-compose.yml run --rm attachment-service pnpm migrate
docker-compose -f infra/docker-compose.yml run --rm notification-service pnpm migrate

echo "🌱 Seeding database..."
docker-compose -f infra/docker-compose.yml run --rm workspace-service node dist/scripts/seed.js || echo "Seeding skipped or failed"

echo "🚀 Starting services..."
docker-compose -f infra/docker-compose.yml up -d

echo "✅ Deployment complete!"
echo "📊 Check health: curl https://task.acoustic.uz/healthz"
