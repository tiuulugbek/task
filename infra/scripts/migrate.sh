#!/bin/bash
set -e

echo "🗄️  Running database migrations..."

cd "$(dirname "$0")/../.."

services=(
  "auth-service"
  "user-service"
  "workspace-service"
  "project-service"
  "task-service"
  "comment-service"
  "attachment-service"
  "notification-service"
)

for service in "${services[@]}"; do
  echo "Migrating $service..."
  docker-compose -f infra/docker-compose.yml exec -T $service pnpm migrate || echo "$service migration skipped"
done

echo "✅ Migrations completed!"
