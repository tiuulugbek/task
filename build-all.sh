#!/bin/bash
# This script ensures all necessary files exist
# Actual file content will be created separately

echo "Building Acoustic Task Manager monorepo..."
echo "Checking directory structure..."

# Ensure all service directories exist
for service in api-gateway auth-service user-service workspace-service project-service task-service comment-service attachment-service notification-service telegram-bot-service scheduler-service; do
  mkdir -p services/$service/src/{routes,services,middleware,utils}
  mkdir -p services/$service/prisma/migrations
  mkdir -p services/$service/tests
done

mkdir -p web/{app,components,lib,hooks,public/locales}
mkdir -p infra/{nginx/conf.d,nginx/ssl,nginx/logs,scripts}
mkdir -p .github/workflows

echo "Directory structure ready!"
