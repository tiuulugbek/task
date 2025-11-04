#!/bin/bash
# Generate all remaining service files, Dockerfiles, and infrastructure

echo "Generating remaining files..."

# Create all service package.json files with standard structure
for service in project-service task-service comment-service attachment-service notification-service telegram-bot-service scheduler-service api-gateway; do
  mkdir -p services/$service/src/{routes,services,middleware}
  mkdir -p services/$service/prisma/migrations
done

echo "Done creating directories"
