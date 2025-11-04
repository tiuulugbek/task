# Acoustic Task Manager

Production-ready, microservices-based Task Manager with Telegram Mini App authentication, RBAC, and Dockerized deployment.

## Quick Start - Ubuntu 22.04 Deployment

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Log out and back in for Docker group
exit
```

### Step 2: Clone Repository

```bash
cd /var/www
sudo git clone <your-repo-url> task.acoustic.uz
cd task.acoustic.uz
sudo chown -R $USER:$USER .
```

### Step 3: Configure Environment

```bash
cd infra
cp .env.example .env
nano .env
```

**Required variables in `infra/.env`:**

```env
# Database
POSTGRES_USER=acoustic
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=acoustic

# RabbitMQ
RABBITMQ_USER=acoustic
RABBITMQ_PASSWORD=<strong-password>

# JWT Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=<generate-secret>
JWT_REFRESH_SECRET=<generate-secret>

# Telegram
TELEGRAM_BOT_TOKEN=<your-bot-token>
WEBHOOK_SECRET=<generate-secret>
WEBHOOK_URL=https://task.acoustic.uz/api/bot/webhook

# Internal
INTERNAL_SECRET=<generate-secret>

# App
ALLOWED_ORIGIN=https://task.acoustic.uz
NEXT_PUBLIC_API_URL=https://task.acoustic.uz/api
NEXT_PUBLIC_TELEGRAM_BOT_NAME=<your-bot-name>
TZ=Asia/Tashkent
NODE_ENV=production
```

Generate secrets:
```bash
openssl rand -hex 32  # For each secret
```

### Step 4: Deploy Services

```bash
cd /var/www/task.acoustic.uz

# Build and start
docker-compose -f infra/docker-compose.yml up -d --build

# Run migrations
./infra/scripts/migrate.sh

# Seed database
./infra/scripts/seed.sh
```

### Step 5: Configure DNS

Point `task.acoustic.uz` A record to server IP: `152.53.229.176`

```bash
# Verify DNS
dig task.acoustic.uz +short
```

### Step 6: Setup SSL

```bash
cd /var/www/task.acoustic.uz

# Run SSL setup script
./infra/scripts/setup-ssl.sh
```

Or manually:
```bash
# Stop nginx
docker-compose -f infra/docker-compose.yml stop nginx

# Get certificate
sudo certbot certonly --standalone -d task.acoustic.uz --email your-email@example.com --agree-tos --non-interactive

# Copy certificates
sudo mkdir -p infra/nginx/ssl
sudo cp /etc/letsencrypt/live/task.acoustic.uz/fullchain.pem infra/nginx/ssl/
sudo cp /etc/letsencrypt/live/task.acoustic.uz/privkey.pem infra/nginx/ssl/
sudo chmod 644 infra/nginx/ssl/*.pem

# Start nginx
docker-compose -f infra/docker-compose.yml start nginx
```

### Step 7: Configure Telegram Webhook

```bash
export TELEGRAM_BOT_TOKEN="your-token"
export WEBHOOK_SECRET="your-secret"
./infra/scripts/set_webhook.sh
```

### Step 8: Verify Deployment

```bash
# Check health
curl https://task.acoustic.uz/healthz

# Check services
docker-compose -f infra/docker-compose.yml ps

# View logs
docker-compose -f infra/docker-compose.yml logs -f
```

### Step 9: Setup Backup Cron

```bash
# Add to crontab (runs daily at 23:50 Asia/Tashkent)
sudo crontab -e

# Add this line:
50 23 * * * /var/www/task.acoustic.uz/infra/scripts/backup_pg.sh
```

### Step 10: Push to Git (Optional)

```bash
cd /var/www/task.acoustic.uz
./scripts/git_init_push.sh https://github.com/user/acoustic-task-manager.git
```

## Architecture

- **12 Microservices**: API Gateway, Auth, User, Workspace, Project, Task, Comment, Attachment, Notification, Telegram Bot, Scheduler
- **Tech Stack**: TypeScript/Node 20+, Next.js 14, PostgreSQL 14+, RabbitMQ, Prisma
- **Authentication**: Telegram Mini App with HMAC verification
- **RBAC**: Workspace-scoped roles (super_admin, admin, manager, member, viewer)

## API Documentation

- **Swagger**: https://task.acoustic.uz/api/docs
- **Health Check**: https://task.acoustic.uz/healthz

## Backup & Restore

### Manual Backup

```bash
./infra/scripts/backup_pg.sh
```

Backups stored in `/var/backups/acoustic-task-manager/` (7-day retention).

### Restore

```bash
./infra/scripts/restore_pg.sh /var/backups/acoustic-task-manager/acoustic_db_YYYYMMDD_HHMMSS.sql.gz
```

## Troubleshooting

### Ports 80/443 Busy

```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting services
sudo systemctl stop apache2  # or nginx
```

### Webhook 401

Check `WEBHOOK_SECRET` matches in `.env` and webhook configuration.

### Database Connection

```bash
# Test connection
docker-compose -f infra/docker-compose.yml exec postgres psql -U acoustic -d acoustic -c "SELECT 1;"
```

### Upload Size

Ensure Nginx and attachment service both allow 25MB:
- Nginx: `client_max_body_size 25M;`
- Attachment service: `MAX_FILE_SIZE=26214400`

### Log Locations

```bash
# Service logs
docker-compose -f infra/docker-compose.yml logs -f <service-name>

# Nginx logs
tail -f infra/nginx/logs/access.log
tail -f infra/nginx/logs/error.log
```

### SSL Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Renew
sudo certbot renew
sudo docker-compose -f infra/docker-compose.yml restart nginx
```

## Development

```bash
# Install dependencies
pnpm install

# Build all services
pnpm build

# Run migrations
pnpm migrate:dev

# Start services
docker-compose -f infra/docker-compose.yml up
```

## License

Proprietary - Acoustic Task Manager
