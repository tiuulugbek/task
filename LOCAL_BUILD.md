# Local Build & Development Guide

Complete instructions for compiling and running the Acoustic Task Manager locally on macOS/Linux.

## Prerequisites

- **Node.js**: v20.0.0 or higher
- **pnpm**: v8.0.0 or higher (package manager)
- **PostgreSQL**: 14+ (or use Docker Compose)
- **Docker & Docker Compose**: (optional, for running dependencies)

## Step 1: Install pnpm

If you don't have pnpm installed:

```bash
# Using npm (you have npm installed)
npm install -g pnpm

# Or using Homebrew (macOS)
brew install pnpm

# Verify installation
pnpm --version
```

## Step 2: Install Dependencies

```bash
# Navigate to project root
cd /Users/tiuulugbek/acoustic-task-manager

# Install all dependencies (workspace root + all services + web)
pnpm install
```

This will:
- Install root dependencies
- Install dependencies for `services/shared`
- Install dependencies for all microservices
- Install dependencies for `web` (Next.js app)

## Step 3: Set Up Environment Variables

### Root `.env` (if needed for scripts)
Create `.env` in the root directory (optional):

```bash
NODE_ENV=development
TZ=Asia/Tashkent
```

### Service `.env` Files

Each service needs its own `.env` file. Copy from `.env.example`:

```bash
# Copy example files (adjust service names as needed)
cp services/auth-service/.env.example services/auth-service/.env
cp services/user-service/.env.example services/user-service/.env
cp services/workspace-service/.env.example services/workspace-service/.env
cp services/project-service/.env.example services/project-service/.env
cp services/task-service/.env.example services/task-service/.env
cp services/comment-service/.env.example services/comment-service/.env
cp services/attachment-service/.env.example services/attachment-service/.env
cp services/notification-service/.env.example services/notification-service/.env
cp services/telegram-bot-service/.env.example services/telegram-bot-service/.env
cp services/scheduler-service/.env.example services/scheduler-service/.env
cp services/api-gateway/.env.example services/api-gateway/.env
cp web/.env.example web/.env.local
```

**Important**: Edit each `.env` file with your actual values:
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (same value across all services)
- `RABBITMQ_URL` or `REDIS_URL`
- `TELEGRAM_BOT_TOKEN` (for bot service)
- `APP_BASE_URL` (e.g., `http://localhost:3000` for local dev)

## Step 4: Set Up Database

### Option A: Using Docker Compose (Recommended for Local Dev)

```bash
# Start only database and queue (without full stack)
cd infra
docker compose up -d postgres rabbitmq

# Or if Redis Streams instead of RabbitMQ
docker compose up -d postgres redis
```

### Option B: Local PostgreSQL

Ensure PostgreSQL is running locally:

```bash
# macOS (Homebrew)
brew services start postgresql@14

# Linux (systemd)
sudo systemctl start postgresql
```

Create a database:

```bash
psql -U postgres
CREATE DATABASE acoustic_task_manager;
\q
```

## Step 5: Run Database Migrations

```bash
# From project root
pnpm migrate

# Or manually for each service
cd services/auth-service && pnpm migrate
cd ../user-service && pnpm migrate
cd ../workspace-service && pnpm migrate
cd ../project-service && pnpm migrate
cd ../task-service && pnpm migrate
cd ../comment-service && pnpm migrate
cd ../attachment-service && pnpm migrate
cd ../notification-service && pnpm migrate
```

## Step 6: Generate Prisma Clients

Prisma clients are generated during build, but you can generate them explicitly:

```bash
# Generate for all services that use Prisma
cd services/auth-service && pnpm build:prisma
cd ../user-service && pnpm build:prisma
cd ../workspace-service && pnpm build:prisma
# ... repeat for other services
```

## Step 7: Build All Services

### Build Everything (Recommended)

```bash
# From project root - builds all services and web app
pnpm build
```

This runs `pnpm -r build` which executes the `build` script in each workspace:
- Compiles TypeScript (`tsc`)
- Generates Prisma clients
- Builds Next.js app (if web workspace)

### Build Individual Services

```bash
# Build shared package first (dependency for others)
cd services/shared
pnpm build

# Build a specific service
cd services/auth-service
pnpm build

# Build web app
cd web
pnpm build
```

## Step 8: Run Services Locally

### Development Mode (with hot reload)

```bash
# Terminal 1: Shared package (watch mode)
cd services/shared
pnpm dev

# Terminal 2: Auth Service
cd services/auth-service
pnpm dev

# Terminal 3: User Service
cd services/user-service
pnpm dev

# Terminal 4: Workspace Service
cd services/workspace-service
pnpm dev

# Terminal 5: Project Service
cd services/project-service
pnpm dev

# Terminal 6: Task Service
cd services/task-service
pnpm dev

# Terminal 7: Comment Service
cd services/comment-service
pnpm dev

# Terminal 8: Attachment Service
cd services/attachment-service
pnpm dev

# Terminal 9: Notification Service
cd services/notification-service
pnpm dev

# Terminal 10: Telegram Bot Service
cd services/telegram-bot-service
pnpm dev

# Terminal 11: Scheduler Service
cd services/scheduler-service
pnpm dev

# Terminal 12: API Gateway
cd services/api-gateway
pnpm dev

# Terminal 13: Web App (Next.js)
cd web
pnpm dev
```

### Production Mode (after build)

```bash
# Run built services
cd services/auth-service
pnpm start  # Runs dist/index.js

cd web
pnpm start  # Runs next start
```

## Step 9: Verify Build

### Type Checking

```bash
# Check all TypeScript types
pnpm typecheck
```

### Linting

```bash
# Lint all code
pnpm lint
```

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific service
cd services/auth-service
pnpm test
```

## Step 10: Seed Database (Optional)

```bash
# Seed all services
pnpm seed

# Or seed individual services
cd services/auth-service
pnpm seed
```

## Quick Start Script

Create a helper script for local development:

```bash
# Create scripts/dev-local.sh
cat > scripts/dev-local.sh << 'EOF'
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
EOF

chmod +x scripts/dev-local.sh
```

Run it:

```bash
./scripts/dev-local.sh
```

## Troubleshooting

### "Cannot find module '@acoustic/shared'"

Build the shared package first:

```bash
cd services/shared && pnpm build && cd ../..
```

### Prisma Client Errors

Generate Prisma clients:

```bash
cd services/[service-name]
pnpm build:prisma
```

### TypeScript Errors

Ensure all dependencies are installed:

```bash
pnpm install
pnpm typecheck
```

### Port Already in Use

Services use these ports (configurable in `.env`):
- API Gateway: 3000
- Auth Service: 3001
- User Service: 3002
- Workspace Service: 3003
- Project Service: 3004
- Task Service: 3005
- Comment Service: 3006
- Attachment Service: 3007
- Notification Service: 3008
- Telegram Bot Service: 3009
- Scheduler Service: 3010
- Web App: 3000 (conflicts with Gateway - use different port or run separately)

### Database Connection Errors

Check your `DATABASE_URL` in `.env` files:

```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

## Development Tips

1. **Use `pnpm dev`** for hot-reload development
2. **Use `pnpm build`** before committing to ensure everything compiles
3. **Run `pnpm typecheck`** to catch TypeScript errors early
4. **Run `pnpm test`** before pushing code
5. **Use Docker Compose** for database/queue to avoid local setup issues

## Clean Build

To start fresh:

```bash
# Clean all build artifacts
pnpm clean

# Reinstall dependencies
pnpm install

# Rebuild everything
pnpm build
```
